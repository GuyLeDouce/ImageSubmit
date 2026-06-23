const path = require("path");
const express = require("express");
const session = require("express-session");
const pgSession = require("connect-pg-simple")(session);
const {
  initDb,
  pool,
  createPendingSubmission,
  listPendingSubmissions,
  listApprovedSubmissions,
  listSubmissionsForUser,
  approveSubmission,
  declineSubmission,
  updateApprovedSubmission,
} = require("./db");
const { config, validateConfig } = require("./config");
const { SURVIVAL_ERAS } = require("./eras");
const {
  createStateToken,
  getDiscordAuthUrl,
  exchangeCodeForToken,
  getDiscordUser,
  getDiscordGuilds,
} = require("./discord");
const { storeFile } = require("./storage");
const {
  upload,
  maxFilesPerSubmission,
  validateEraKey,
  parseNftUsedType,
  resolveDefaultRewardPoints,
  parseRewardPoints,
  parseOptionalDiscordUserId,
  parseOptionalText,
  assertCollectionAllowedForEra,
} = require("./validation");
const { PROJECT_LINKS } = require("./links");
const crypto = require("crypto");

function createApp() {
  validateConfig();

  const app = express();
  app.set("trust proxy", config.trustedProxy);
  app.set("view engine", "ejs");
  app.set("views", path.join(__dirname, "..", "views"));

  app.use(express.urlencoded({ extended: false }));
  app.use(express.static(path.join(__dirname, "..", "public")));
  app.use(
    session({
      store: new pgSession({ pool, tableName: config.sessionTable, createTableIfMissing: false }),
      name: "squig.submit.sid",
      secret: config.sessionSecret,
      resave: false,
      saveUninitialized: false,
      rolling: true,
      cookie: {
        httpOnly: true,
        sameSite: "lax",
        secure: config.isProduction,
        maxAge: 1000 * 60 * 60 * 24 * 7,
      },
    })
  );

  app.use((req, res, next) => {
    req.id = req.headers["x-request-id"] || crypto.randomUUID();
    res.setHeader("X-Request-Id", req.id);
    next();
  });

  app.use((req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader(
      "Content-Security-Policy",
      "default-src 'self'; img-src 'self' data: https:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'"
    );
    next();
  });

  app.use((req, res, next) => {
    res.locals.links = PROJECT_LINKS;
    res.locals.currentPath = req.path;
    res.locals.user = req.session.user || null;
    res.locals.isAdmin = Boolean(req.session.user && config.adminDiscordIds.has(req.session.user.id));
    res.locals.flash = req.session.flash || null;
    delete req.session.flash;
    next();
  });

  app.use((req, res, next) => {
    if (!req.session.csrfToken) req.session.csrfToken = crypto.randomBytes(32).toString("hex");
    res.locals.csrfToken = req.session.csrfToken;
    next();
  });

  function requireVerifiedFormRequest(req, res, next) {
    if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();
    const expectedOrigin = new URL(config.publicBaseUrl).origin;
    const actualOrigin = req.get("origin");
    if (actualOrigin && actualOrigin !== expectedOrigin) {
      return res.status(403).render("error", {
        title: "Request blocked",
        message: "This form request could not be verified.",
        requestId: req.id,
      });
    }
    if (req.body?._csrf !== req.session.csrfToken) {
      return res.status(403).render("error", {
        title: "Request blocked",
        message: "This form request expired. Please refresh and try again.",
        requestId: req.id,
      });
    }
    next();
  }

  app.use((req, res, next) => {
    if (req.is("multipart/form-data")) return next();
    return requireVerifiedFormRequest(req, res, next);
  });

  function setFlash(req, type, message) {
    req.session.flash = { type, message };
  }

  function requireAuth(req, res, next) {
    if (!req.session.user) {
      setFlash(req, "error", "Please log in with Discord first.");
      return res.redirect("/");
    }
    next();
  }

  function requireVerifiedMember(req, res, next) {
    if (!req.session.user) {
      setFlash(req, "error", "Please log in with Discord first.");
      return res.redirect("/");
    }
    if (!req.session.user.isGuildMember) {
      return res.status(403).render("blocked", { title: "Join Ugly Labs Discord" });
    }
    next();
  }

  function requireAdmin(req, res, next) {
    if (!req.session.user) {
      setFlash(req, "error", "Please log in with Discord first.");
      return res.redirect("/");
    }
    if (!req.session.user.isGuildMember || !config.adminDiscordIds.has(req.session.user.id)) {
      return res.status(403).render("error", {
        title: "Admin Access Required",
        message: "This page is restricted to allowlisted Discord admins.",
      });
    }
    next();
  }

  app.get("/", (req, res) => {
    res.render("home", { title: "Squigs Reloaded Creator Portal", eras: SURVIVAL_ERAS });
  });

  app.get("/health/live", (req, res) => {
    res.json({ status: "ok", requestId: req.id });
  });

  app.get("/health/ready", async (req, res, next) => {
    try {
      await pool.query("SELECT 1");
      res.json({ status: "ready", requestId: req.id });
    } catch (error) {
      error.statusCode = 503;
      next(error);
    }
  });

  app.get("/auth/discord", (req, res) => {
    const state = createStateToken();
    req.session.oauthState = state;
    res.redirect(getDiscordAuthUrl(state));
  });

  app.get("/auth/discord/callback", async (req, res, next) => {
    try {
      const { code, state, error } = req.query;
      if (error) throw new Error(`Discord login failed: ${error}`);
      if (!code || !state || state !== req.session.oauthState) {
        throw new Error("Invalid OAuth state. Please try logging in again.");
      }

      delete req.session.oauthState;
      const token = await exchangeCodeForToken(String(code));
      const [discordUser, guilds] = await Promise.all([
        getDiscordUser(token.access_token),
        getDiscordGuilds(token.access_token),
      ]);

      const isGuildMember = guilds.some((guild) => guild.id === config.discordGuildId);
      req.session.user = {
        id: discordUser.id,
        username: discordUser.username,
        displayName: discordUser.global_name || discordUser.username,
        avatar: discordUser.avatar,
        isGuildMember,
        membershipCheckedAt: new Date().toISOString(),
      };

      if (!isGuildMember) return res.redirect("/submit");
      if (config.adminDiscordIds.has(discordUser.id)) return res.redirect("/admin");
      res.redirect("/submit");
    } catch (error) {
      next(error);
    }
  });

  app.post("/logout", (req, res, next) => {
    req.session.destroy((err) => {
      if (err) return next(err);
      res.clearCookie("squig.submit.sid");
      res.redirect("/");
    });
  });

  app.get("/submit", requireAuth, async (req, res, next) => {
    try {
      if (!req.session.user.isGuildMember) {
        return res.status(403).render("blocked", { title: "Join Ugly Labs Discord" });
      }

      const submissions = await listSubmissionsForUser(req.session.user.id);
      res.render("submit", {
        title: "Submit Your Image",
        eras: SURVIVAL_ERAS,
        submitted: req.query.submitted === "1",
        submissions,
      });
    } catch (error) {
      next(error);
    }
  });

  app.post("/submit", requireVerifiedMember, upload.array("images", maxFilesPerSubmission), requireVerifiedFormRequest, async (req, res, next) => {
    try {
      const eraKey = String(req.body.era_key || "").trim();
      const promptText = parseOptionalText(req.body.prompt_text, "Prompt", 4000);
      const nftUsedType = parseNftUsedType(req.body.nft_used_type);
      const nftUsedText = parseOptionalText(req.body.nft_used_text, "NFT used", 200);
      if (nftUsedType === "other" && !nftUsedText) {
        throw new Error("Please tell us which NFT was used when selecting Other.");
      }
      if (!validateEraKey(eraKey)) throw new Error("Please choose a valid era.");
      assertCollectionAllowedForEra(nftUsedType, eraKey);
      if (!req.files?.length) throw new Error("Please attach at least one image before submitting.");

      for (const file of req.files) {
        const stored = await storeFile(file);
        await createPendingSubmission({
          discordUserId: req.session.user.id,
          discordUsername: req.session.user.username,
          discordDisplayName: req.session.user.displayName,
          eraKey,
          promptText,
          nftUsedType,
          nftUsedText: nftUsedType === "other" ? nftUsedText : null,
          rewardPoints: resolveDefaultRewardPoints(nftUsedType, eraKey),
          imageUrl: stored.publicUrl,
          storageKey: stored.storageKey,
          mimeType: file.mimetype,
          sizeBytes: file.size,
        });
      }

      res.redirect("/submit?submitted=1");
    } catch (error) {
      next(error);
    }
  });

  app.get("/admin", requireAdmin, async (req, res, next) => {
    try {
      const [pendingSubmissions, approvedSubmissions] = await Promise.all([
        listPendingSubmissions(),
        listApprovedSubmissions(),
      ]);
      res.render("admin", {
        title: "Admin Review",
        submissions: pendingSubmissions,
        approvedSubmissions,
        eras: SURVIVAL_ERAS,
      });
    } catch (error) {
      next(error);
    }
  });

  app.post("/admin/submissions/:id/approve", requireAdmin, async (req, res, next) => {
    try {
      const submissionId = Number(req.params.id);
      if (!Number.isInteger(submissionId) || submissionId <= 0) throw new Error("Invalid submission id.");
      const rewardPoints = parseRewardPoints(req.body.reward_points || "100");
      const discordUserId = parseOptionalDiscordUserId(req.body.override_discord_user_id);
      const discordUsername = parseOptionalText(req.body.override_discord_username, "Discord username", 64);
      const discordDisplayName = parseOptionalText(req.body.override_discord_display_name, "Display name", 64);
      const overrideEraKey = String(req.body.override_era_key || "").trim();
      const overrideNftUsedType = parseNftUsedType(req.body.override_nft_used_type);
      const overrideNftUsedText = parseOptionalText(req.body.override_nft_used_text, "NFT used", 200);
      if (overrideNftUsedType === "other" && !overrideNftUsedText) {
        throw new Error("Please add the NFT used when selecting Other.");
      }
      if (!validateEraKey(overrideEraKey)) throw new Error("Please choose a valid era for approval.");
      assertCollectionAllowedForEra(overrideNftUsedType, overrideEraKey);
      const reviewedBy = `${req.session.user.username} (${req.session.user.id})`;
      await approveSubmission({
        submissionId,
        rewardPoints,
        reviewedBy,
        overrideDiscordUserId: discordUserId,
        overrideDiscordUsername: discordUsername,
        overrideDiscordDisplayName: discordDisplayName,
        overrideEraKey,
        overrideNftUsedType,
        overrideNftUsedText: overrideNftUsedType === "other" ? overrideNftUsedText : null,
      });
      setFlash(req, "success", "Submission approved and inserted into the live Squig Survival image table.");
      res.redirect("/admin");
    } catch (error) {
      next(error);
    }
  });

  app.post("/admin/submissions/:id/decline", requireAdmin, async (req, res, next) => {
    try {
      const submissionId = Number(req.params.id);
      if (!Number.isInteger(submissionId) || submissionId <= 0) throw new Error("Invalid submission id.");
      const reason = parseOptionalText(req.body.reason, "Decline reason", 500);
      if (!reason) throw new Error("Decline reason is required.");
      const reviewedBy = `${req.session.user.username} (${req.session.user.id})`;
      await declineSubmission({ submissionId, reviewedBy, reason });
      setFlash(req, "success", "Submission declined.");
      res.redirect("/admin");
    } catch (error) {
      next(error);
    }
  });

  app.post("/admin/submissions/:id/update-approved", requireAdmin, async (req, res, next) => {
    try {
      const submissionId = Number(req.params.id);
      if (!Number.isInteger(submissionId) || submissionId <= 0) throw new Error("Invalid submission id.");
      const rewardPoints = parseRewardPoints(req.body.reward_points || "100");
      const discordUserId = parseOptionalDiscordUserId(req.body.override_discord_user_id);
      const discordUsername = parseOptionalText(req.body.override_discord_username, "Discord username", 64);
      const discordDisplayName = parseOptionalText(req.body.override_discord_display_name, "Display name", 64);
      const overrideEraKey = String(req.body.override_era_key || "").trim();
      const overrideNftUsedType = parseNftUsedType(req.body.override_nft_used_type);
      const overrideNftUsedText = parseOptionalText(req.body.override_nft_used_text, "NFT used", 200);
      if (overrideNftUsedType === "other" && !overrideNftUsedText) {
        throw new Error("Please add the NFT used when selecting Other.");
      }
      if (!validateEraKey(overrideEraKey)) throw new Error("Please choose a valid era.");
      assertCollectionAllowedForEra(overrideNftUsedType, overrideEraKey);
      const reviewedBy = `${req.session.user.username} (${req.session.user.id})`;
      await updateApprovedSubmission({
        submissionId,
        rewardPoints,
        reviewedBy,
        overrideDiscordUserId: discordUserId,
        overrideDiscordUsername: discordUsername,
        overrideDiscordDisplayName: discordDisplayName,
        overrideEraKey,
        overrideNftUsedType,
        overrideNftUsedText: overrideNftUsedType === "other" ? overrideNftUsedText : null,
      });
      setFlash(req, "success", "Approved image updated.");
      res.redirect("/admin");
    } catch (error) {
      next(error);
    }
  });

  app.use((req, res) => {
    res.status(404).render("error", {
      title: "Page not found",
      message: "That page does not exist.",
      requestId: req.id,
    });
  });

  app.use((err, req, res, next) => {
    if (err?.code === "LIMIT_FILE_SIZE") {
      err.message = `File is too large. Max size is ${config.maxUploadMb} MB.`;
    }
    if (err?.code === "LIMIT_FILE_COUNT") {
      err.message = `You can upload up to ${maxFilesPerSubmission} images at once.`;
    }

    console.error(JSON.stringify({ level: "error", requestId: req.id, message: err?.message, stack: config.isProduction ? undefined : err?.stack }));
    const status = err.statusCode || 500;
    res.status(status).render("error", {
      title: "Something went wrong",
      message: config.isProduction && status >= 500 ? "Unexpected error. Please share the request ID with support." : err.message || "Unexpected error.",
      requestId: req.id,
    });
  });

  return app;
}

async function start() {
  await initDb();
  const app = createApp();
  app.listen(config.port, () => {
    console.log(`[SUBMISSION-APP] Listening on port ${config.port}`);
  });
}

if (require.main === module) {
  start().catch((error) => {
    console.error("[SUBMISSION-APP] Fatal startup error:", error);
    process.exit(1);
  });
}

module.exports = {
  createApp,
  start,
};
