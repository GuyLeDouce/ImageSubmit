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
} = require("./validation");

function createApp() {
  validateConfig();

  const app = express();
  app.set("trust proxy", 1);
  app.set("view engine", "ejs");
  app.set("views", path.join(__dirname, "..", "views"));

  app.use(express.urlencoded({ extended: false }));
  app.use(express.static(path.join(__dirname, "..", "public")));
  app.use(
    session({
      store: new pgSession({ pool, tableName: "session", createTableIfMissing: true }),
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
    res.locals.currentPath = req.path;
    res.locals.user = req.session.user || null;
    res.locals.isAdmin = Boolean(req.session.user && config.adminDiscordIds.has(req.session.user.id));
    res.locals.flash = req.session.flash || null;
    delete req.session.flash;
    next();
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
    res.render("home", { title: "Squig Creator Portal" });
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

  app.post("/submit", requireVerifiedMember, upload.array("images", maxFilesPerSubmission), async (req, res, next) => {
    try {
      const eraKey = String(req.body.era_key || "").trim();
      const promptText = parseOptionalText(req.body.prompt_text, "Prompt", 4000);
      const nftUsedType = parseNftUsedType(req.body.nft_used_type);
      const nftUsedText = parseOptionalText(req.body.nft_used_text, "NFT used", 200);
      if (nftUsedType === "other" && !nftUsedText) {
        throw new Error("Please tell us which NFT was used when selecting Other.");
      }
      if (!validateEraKey(eraKey)) throw new Error("Please choose a valid era.");
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
          rewardPoints: resolveDefaultRewardPoints(nftUsedType),
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
      const reviewedBy = `${req.session.user.username} (${req.session.user.id})`;
      await declineSubmission({ submissionId, reviewedBy });
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

  app.use((err, req, res, next) => {
    if (err?.code === "LIMIT_FILE_SIZE") {
      err.message = `File is too large. Max size is ${config.maxUploadMb} MB.`;
    }
    if (err?.code === "LIMIT_FILE_COUNT") {
      err.message = `You can upload up to ${maxFilesPerSubmission} images at once.`;
    }

    console.error(err);
    const status = err.statusCode || 500;
    res.status(status).render("error", {
      title: "Something went wrong",
      message: err.message || "Unexpected error.",
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
