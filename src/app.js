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
  unapproveSubmission,
} = require("./db");
const { config, validateConfig } = require("./config");
const { SURVIVAL_ERAS, ADMIN_REPAIR_ERAS, getAdminRepairEraByKey } = require("./eras");
const {
  UGLY_CITY_ERA_KEY,
  UGLY_CITY_MILESTONES,
  getUglyCityMilestoneByKey,
} = require("./uglyCityMilestones");
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
  resolveDefaultRewardPoints,
  parseRewardPoints,
  parseOptionalDiscordUserId,
  parseOptionalText,
  assertCollectionAllowedForEra,
} = require("./validation");
const { PROJECT_LINKS } = require("./links");
const crypto = require("crypto");
const { ConflictError } = require("./errors");

const OAUTH_STATE_COOKIE = "squig.oauth.state";
const OAUTH_STATE_MAX_AGE_MS = 1000 * 60 * 10;

function parseCookieHeader(header) {
  return String(header || "")
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .reduce((cookies, part) => {
      const separatorIndex = part.indexOf("=");
      if (separatorIndex === -1) return cookies;
      const name = part.slice(0, separatorIndex);
      const value = part.slice(separatorIndex + 1);
      try {
        cookies[name] = decodeURIComponent(value);
      } catch (error) {
        cookies[name] = value;
      }
      return cookies;
    }, {});
}

function createApp() {
  validateConfig();

  const app = express();
  app.set("trust proxy", config.trustedProxy);
  app.disable("x-powered-by");
  app.set("view engine", "ejs");
  app.set("views", path.join(__dirname, "..", "views"));

  app.use((req, res, next) => {
    req.id = req.headers["x-request-id"] || crypto.randomUUID();
    res.locals.cspNonce = crypto.randomBytes(16).toString("base64");
    res.setHeader("X-Request-Id", req.id);
    next();
  });

  app.get("/health/live", (req, res) => {
    res.json({ status: "ok", requestId: req.id });
  });

  app.get("/health/ready", async (req, res) => {
    try {
      await pool.query("SELECT 1");
      res.json({ status: "ready", components: { postgres: "ok" }, requestId: req.id });
    } catch (error) {
      res.status(503).json({ status: "not_ready", components: { postgres: "unavailable" }, requestId: req.id });
    }
  });

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
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader(
      "Content-Security-Policy",
      `default-src 'self'; img-src 'self' data: https:; style-src 'self' 'unsafe-inline'; script-src 'self' 'nonce-${res.locals.cspNonce}'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'`
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

  if (config.env === "test" && process.env.ENABLE_TEST_AUTH === "true") {
    app.use((req, res, next) => {
      const testUserId = req.get("x-test-user-id");
      if (testUserId) {
        req.session.user = {
          id: testUserId,
          username: req.get("x-test-username") || "test_admin",
          displayName: req.get("x-test-display-name") || "Test Admin",
          avatar: null,
          isGuildMember: req.get("x-test-member") !== "false",
          membershipCheckedAt: new Date().toISOString(),
        };
      }
      next();
    });
  }

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
    const submittedToken = req.get("x-csrf-token") || req.body?._csrf;
    if (submittedToken !== req.session.csrfToken) {
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

  function requireMultipartHeaderCsrf(req, res, next) {
    const submittedToken = req.get("x-csrf-token");
    if (!submittedToken) {
      return res.status(403).render("error", {
        title: "Request blocked",
        message: "This upload request expired. Please refresh and try again.",
        requestId: req.id,
      });
    }
    return requireVerifiedFormRequest(req, res, next);
  }

  function setFlash(req, type, message) {
    req.session.flash = { type, message };
  }

  function rememberPostLoginRedirect(req) {
    if (req.method !== "GET") return;
    if (!req.originalUrl.startsWith("/submit")) return;
    req.session.postLoginRedirect = req.originalUrl;
  }

  function consumePostLoginRedirect(req) {
    const redirectTo = req.session.postLoginRedirect;
    delete req.session.postLoginRedirect;
    if (typeof redirectTo === "string" && redirectTo.startsWith("/submit")) {
      return redirectTo;
    }
    return null;
  }

  function requireAuth(req, res, next) {
    if (!req.session.user) {
      rememberPostLoginRedirect(req);
      setFlash(req, "error", "Please log in with Discord first.");
      return res.redirect("/auth/discord");
    }
    next();
  }

  function requireVerifiedMember(req, res, next) {
    if (!req.session.user) {
      rememberPostLoginRedirect(req);
      setFlash(req, "error", "Please log in with Discord first.");
      return res.redirect("/auth/discord");
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
    res.render("home", {
      title: "The Ugly City Image Factory",
      eras: SURVIVAL_ERAS,
      milestones: UGLY_CITY_MILESTONES,
    });
  });

  app.get("/auth/discord", (req, res) => {
    const state = createStateToken();
    req.session.oauthState = state;
    res.cookie(OAUTH_STATE_COOKIE, state, {
      httpOnly: true,
      sameSite: "lax",
      secure: config.isProduction,
      maxAge: OAUTH_STATE_MAX_AGE_MS,
      path: "/auth/discord/callback",
    });
    req.session.save((error) => {
      if (error) return res.status(500).render("error", {
        title: "Login failed",
        message: "Could not start Discord login. Please try again.",
        requestId: req.id,
      });
      res.redirect(getDiscordAuthUrl(state));
    });
  });

  app.get("/auth/discord/callback", async (req, res, next) => {
    try {
      const { code, state, error } = req.query;
      if (error) throw new Error(`Discord login failed: ${error}`);
      const oauthStateCookie = parseCookieHeader(req.headers.cookie)[OAUTH_STATE_COOKIE];
      const expectedStates = new Set([req.session.oauthState, oauthStateCookie].filter(Boolean));
      if (!code || !state || !expectedStates.has(String(state))) {
        delete req.session.oauthState;
        res.clearCookie(OAUTH_STATE_COOKIE, { path: "/auth/discord/callback" });
        setFlash(req, "error", "Discord login expired. Please try logging in again.");
        return res.redirect("/");
      }

      delete req.session.oauthState;
      res.clearCookie(OAUTH_STATE_COOKIE, { path: "/auth/discord/callback" });
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

      const postLoginRedirect = consumePostLoginRedirect(req);
      if (!isGuildMember) return res.redirect(postLoginRedirect || "/submit");
      if (postLoginRedirect) return res.redirect(postLoginRedirect);
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

  app.get("/submit/:milestoneKey", requireAuth, (req, res) => {
    res.redirect(`/submit?milestone=${encodeURIComponent(req.params.milestoneKey)}`);
  });

  app.get("/submit", requireAuth, async (req, res, next) => {
    try {
      if (!req.session.user.isGuildMember) {
        return res.status(403).render("blocked", { title: "Join Ugly Labs Discord" });
      }

      const selectedMilestone = getUglyCityMilestoneByKey(String(req.query.milestone || "").trim());
      const submissions = await listSubmissionsForUser(req.session.user.id);
      res.render("submit", {
        title: "Submit to Ugly City",
        eras: SURVIVAL_ERAS,
        milestones: UGLY_CITY_MILESTONES,
        selectedMilestone,
        submitted: req.query.submitted === "1",
        submissions,
      });
    } catch (error) {
      next(error);
    }
  });

  app.post("/submit", requireVerifiedMember, upload.array("images", maxFilesPerSubmission), requireVerifiedFormRequest, async (req, res, next) => {
    try {
      const eraKey = UGLY_CITY_ERA_KEY;
      const milestoneKey = String(req.body.milestone_key || "").trim();
      const milestone = getUglyCityMilestoneByKey(milestoneKey);
      const promptText = parseOptionalText(req.body.prompt_text, "Prompt", 4000);
      const otherCollectionsText = parseOptionalText(req.body.other_collections_text, "Other NFTs / collections included", 500);
      const nftUsedType = "squigs";
      if (!milestone) throw new Error("Please choose a valid Ugly City milestone.");
      if (req.body.contains_squig_confirmed !== "on") {
        throw new Error("Please confirm that your image includes at least one Squig.");
      }
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
          nftUsedText: otherCollectionsText,
          otherCollectionsText,
          containsSquigConfirmed: true,
          milestoneKey: milestone.key,
          milestoneNumber: milestone.number,
          milestoneLabel: milestone.label,
          milestoneDistrict: milestone.district,
          rewardPoints: resolveDefaultRewardPoints(),
          imageUrl: stored.publicUrl,
          storageKey: stored.storageKey,
          mimeType: file.mimetype,
          sizeBytes: file.size,
        });
      }

      res.redirect(`/submit?submitted=1&milestone=${encodeURIComponent(milestone.key)}`);
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
        title: "Ugly City Admin Review",
        submissions: pendingSubmissions,
        approvedSubmissions,
        eras: SURVIVAL_ERAS,
        adminRepairEras: ADMIN_REPAIR_ERAS,
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
      const expectedRowVersion = Number(req.body.row_version);
      if (!Number.isInteger(expectedRowVersion) || expectedRowVersion <= 0) throw new Error("Invalid row version.");
      const discordUserId = parseOptionalDiscordUserId(req.body.override_discord_user_id);
      const discordUsername = parseOptionalText(req.body.override_discord_username, "Discord username", 64);
      const discordDisplayName = parseOptionalText(req.body.override_discord_display_name, "Display name", 64);
      const overrideEraKey = UGLY_CITY_ERA_KEY;
      const overrideNftUsedType = "squigs";
      const overrideNftUsedText = null;
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
        expectedRowVersion,
        actorDiscordId: req.session.user.id,
        requestId: req.id,
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
      const expectedRowVersion = Number(req.body.row_version);
      if (!Number.isInteger(expectedRowVersion) || expectedRowVersion <= 0) throw new Error("Invalid row version.");
      if (!reason) throw new Error("Decline reason is required.");
      const reviewedBy = `${req.session.user.username} (${req.session.user.id})`;
      await declineSubmission({ submissionId, reviewedBy, reason, expectedRowVersion, actorDiscordId: req.session.user.id, requestId: req.id });
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
      const expectedRowVersion = Number(req.body.row_version);
      if (!Number.isInteger(expectedRowVersion) || expectedRowVersion <= 0) throw new Error("Invalid row version.");
      const discordUserId = parseOptionalDiscordUserId(req.body.override_discord_user_id);
      const discordUsername = parseOptionalText(req.body.override_discord_username, "Discord username", 64);
      const discordDisplayName = parseOptionalText(req.body.override_discord_display_name, "Display name", 64);
      const overrideEraKey = String(req.body.override_era_key || "").trim();
      const overrideNftUsedType = "squigs";
      const overrideNftUsedText = null;
      if (!getAdminRepairEraByKey(overrideEraKey)) throw new Error("Please choose a valid admin repair era.");
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
        expectedRowVersion,
        actorDiscordId: req.session.user.id,
        requestId: req.id,
      });
      setFlash(req, "success", "Approved image updated.");
      res.redirect("/admin");
    } catch (error) {
      next(error);
    }
  });

  app.post("/admin/submissions/:id/unapprove", requireAdmin, async (req, res, next) => {
    try {
      const submissionId = Number(req.params.id);
      if (!Number.isInteger(submissionId) || submissionId <= 0) throw new Error("Invalid submission id.");
      const reason = parseOptionalText(req.body.reason, "Unapprove reason", 500);
      const expectedRowVersion = Number(req.body.row_version);
      if (!Number.isInteger(expectedRowVersion) || expectedRowVersion <= 0) throw new Error("Invalid row version.");
      if (!reason) throw new Error("Unapprove reason is required.");
      const reviewedBy = `${req.session.user.username} (${req.session.user.id})`;
      await unapproveSubmission({
        submissionId,
        reviewedBy,
        reason,
        expectedRowVersion,
        actorDiscordId: req.session.user.id,
        requestId: req.id,
      });
      setFlash(req, "success", "Approved image was unapproved and removed from the live image table.");
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
      title: err instanceof ConflictError ? "Stale review" : "Something went wrong",
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
