"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");
const ejs = require("ejs");
const { PROMPT_GROUPS } = require("../src/deathRacePrompts");

const root = path.resolve(__dirname, "..");
const eras = [
  {
    key: "ugly_city", label: "The Rise of Ugly City",
    description: "Make a scene from Ugly City.",
    milestones: [{ key: "empty_lot", number: 1, district: "Empty Lot" }],
  },
  {
    key: "death_race", label: "Squigwreck",
    description: "Post-apocalyptic cartoon racing.",
    milestones: [],
  },
];
const milestone = eras[0].milestones[0];
const user = { id: "10001", username: "creator", displayName: "Creator", avatar: null, isGuildMember: true };
const sample = {
  id: 9, status: "pending", row_version: 1, era_key: "ugly_city",
  image_url: "https://example.test/scene.png",
  milestone_key: "empty_lot", milestone_label: "Empty Lot", milestone_district: "Empty Lot",
  discord_user_id: user.id, discord_username: user.username, discord_display_name: user.displayName,
  contains_squig_confirmed: true, submitted_at: new Date("2026-10-12T16:00:00Z"),
  reviewed_at: null, prompt_text: "A cartoon scene", reward_points: 100,
};
const common = {
  title: "Image Factory", csrfToken: "csrf-token", flash: null, currentPath: "/",
  user, isAdmin: false,
  links: {
    squigsHome: "https://squigs.io/", discord: "https://squigs.io/discord",
    openSea: "https://opensea.io/collection/squigs-reloaded", x: "https://x.com/SquigsNFT",
  },
};
const render = (name, locals) => ejs.renderFile(
  path.join(root, "views", name),
  { ...common, ...locals },
);

test("studio homepage keeps real-era links, approved art and Discord entry point", async () => {
  const html = await render("home.ejs", {
    currentPath: "/", user: null, eras,
    approvedExamples: [sample],
  });
  assert.match(html, /Squig Survival Image Factory/);
  assert.match(html, /href="\/submit\?era=death_race"/);
  assert.match(html, /href="\/submit\?era=ugly_city"/);
  assert.match(html, /Approved creator artwork/);
  assert.match(html, /href="\/auth\/discord"/);
  assert.match(html, /src="\/studio\.js"/);
});

test("creator wall stays art-first and labels worlds by their readable names", async () => {
  const scenes = [
    { ...sample, id: 1, era_key: "ugly_city", image_url: "https://example.test/city1.png" },
    { ...sample, id: 2, era_key: "death_race", milestone_label: null, milestone_district: null, image_url: "https://example.test/race2.png" },
    { ...sample, id: 3, era_key: "death_race", milestone_label: null, milestone_district: null, image_url: "https://example.test/race3.png" },
    { ...sample, id: 4, era_key: "death_race", milestone_label: null, milestone_district: null, image_url: "https://example.test/race4.png" },
    { ...sample, id: 5, era_key: "death_race", milestone_label: null, milestone_district: null, image_url: "https://example.test/race5.png" },
  ];
  const html = await render("home.ejs", {
    currentPath: "/", eras, approvedExamples: scenes,
  });
  assert.match(html, /MAKE IT\./);
  assert.match(html, /UGLY\./);
  assert.match(html, /Look what our creators made/);
  assert.match(html, /class="creator-wall__grid"/);
  assert.equal((html.match(/class="creator-wall__item"/g) || []).length, 4);
  assert.match(html, /<figcaption>Squigwreck<\/figcaption>/);
  assert.doesNotMatch(html, /<figcaption>death_race<\/figcaption>/);
});

test("homepage without artwork gives creators a clear entry point", async () => {
  const html = await render("home.ejs", {
    currentPath: "/", user: null, eras, approvedExamples: [],
  });
  assert.match(html, /Your Squig belongs here/);
  assert.match(html, /Start creating/);
  assert.doesNotMatch(html, /class="creator-wall__grid"/);
});

test("Ugly City creator form retains the original submission contract", async () => {
  const html = await render("submit.ejs", {
    currentPath: "/submit", eras, adminRepairEras: eras,
    selectedEra: eras[0], selectedMilestone: milestone,
    milestones: eras[0].milestones,
    milestoneConcepts: { empty_lot: "Create an Empty Lot scene." },
    submitted: false, submissions: [], deathRacePromptGroups: [],
  });
  assert.match(html, /action="\/submit" method="post" enctype="multipart\/form-data"/);
  for (const name of ["_csrf", "era_key", "milestone_key", "images", "contains_squig_confirmed", "other_collections_text", "prompt_text"]) {
    assert.ok(html.includes('name="' + name + '"'), name + " remains in the form");
  }
  assert.match(html, /data-upload-input/);
  assert.match(html, /data-milestone-select/);
  assert.match(html, /Create an Empty Lot scene/);
  assert.match(html, /100 \$CHARM/);
});

test("Squigwreck renders both attachment choices and all complete prompts without changing uploads", async () => {
  const html = await render("submit.ejs", {
    currentPath: "/submit", eras, adminRepairEras: eras,
    selectedEra: eras[1], selectedMilestone: null, milestones: [],
    milestoneConcepts: {}, submitted: false, submissions: [],
    deathRacePromptGroups: PROMPT_GROUPS,
  });
  assert.match(html, /<button type="button"[^>]*data-prompt-type="solo" aria-pressed="true" aria-controls="prompt-panel-solo"/);
  assert.match(html, /<button type="button"[^>]*data-prompt-type="duo" aria-pressed="false" aria-controls="prompt-panel-duo"/);
  assert.match(html, /<strong>1 Squig Attached<\/strong>/);
  assert.match(html, /<strong>2 Squigs Attached<\/strong>/);
  assert.doesNotMatch(html, /data-prompt-type-select|<select/);
  assert.match(html, /Last racer alive wins/);
  assert.equal((html.match(/data-copy-death-race-prompt/g) || []).length, 24);
  for (const group of PROMPT_GROUPS) {
    // Both groups must be available before JS runs, including manual copying.
    assert.match(html, new RegExp('data-prompt-group="' + group.id + '" aria-labelledby='));
    for (const item of group.prompts) {
      assert.ok(html.includes(ejs.escapeXML(item.prompt)), item.title + ": full text rendered");
    }
  }
  assert.match(html, /Upload the finished artwork below/);
  assert.match(html, /name="era_key" value="death_race"/);
  assert.match(html, /name="images"/);
  assert.match(html, /name="prompt_text" rows="5" maxlength="4000"/);
});

test("profile gallery preserves user history and status filters", async () => {
  const html = await render("profile.ejs", {
    currentPath: "/profile", adminRepairEras: eras, approvedExamples: [],
    submissions: [sample], stats: { total: 1, approved: 0, pending: 1, declined: 0 },
  });
  assert.match(html, /data-gallery-filter="pending"/);
  assert.match(html, /data-gallery-status="pending"/);
  assert.match(html, /<dd>The Rise of Ugly City<\/dd>/);
  assert.match(html, /href="https:\/\/example\.test\/scene\.png"/);
});

test("gallery metadata stays in its own panel below uncropped artwork", async () => {
  const html = await render("profile.ejs", {
    currentPath: "/profile", adminRepairEras: eras, approvedExamples: [],
    submissions: [sample], stats: { total: 1, approved: 0, pending: 1, declined: 0 },
  });
  const card = html.match(/<article class="submission-tile[\s\S]*?<\/article>/)?.[0] || "";
  assert.match(card, /class="submission-tile__media"[^>]*data-artwork-view/);
  assert.match(card, /<\/a>[\s\S]*?<div class="submission-tile__body">/);
  assert.match(card, /<time class="submission-tile__date"/);
  assert.match(card, /class="submission-tile__summary"/);
  assert.match(card, /<summary>View details<\/summary>/);

  const css = fs.readFileSync(path.join(root, "public", "styles.css"), "utf8");
  const media = css.match(/\.submission-tile__media\s*\{[^}]*\}/)?.[0] || "";
  const picture = css.match(/\.submission-tile__media img\s*\{[^}]*\}/)?.[0] || "";
  assert.match(media, /overflow:\s*hidden/);
  assert.match(media, /aspect-ratio:\s*1\s*\/\s*1/);
  assert.match(picture, /position:\s*absolute/);
  assert.match(picture, /object-fit:\s*contain/);
  assert.match(css, /\.submission-tile__body\s*\{[^}]*background:\s*#fffdf9/);
});

test("friendly motion, filtering and artwork viewer remain progressive enhancements", async () => {
  const examples = [
    sample,
    { ...sample, id: 10, era_key: "death_race", milestone_label: null, image_url: "https://example.test/race.png" },
  ];
  const html = await render("home.ejs", {
    currentPath: "/", eras, approvedExamples: examples,
  });
  assert.match(html, /data-feature-gallery/);
  assert.match(html, /data-feature-pick/);
  assert.match(html, /data-feature-prev/);
  assert.match(html, /data-feature-next/);
  assert.match(html, /data-feature-pause/);
  assert.match(html, /data-reveal/);
  assert.match(html, /data-era-world="death_race"/);
  assert.match(html, /data-era-world="ugly_city"/);
  const js = fs.readFileSync(path.join(root, "public", "studio.js"), "utf8");
  assert.match(js, /reducedMotion/);
  assert.match(js, /7500/);
  assert.match(js, /data-gallery-count/);
  assert.match(js, /pageSize = 18/);
  assert.match(js, /HTMLDialogElement/);
  assert.match(js, /visibleImageLinks/);
  assert.match(html, /src="https:\/\/i\.imgur\.com\/amVLHM9\.png"/);
  assert.match(html, /src="https:\/\/i\.imgur\.com\/HHV8GmI\.png"/);
  assert.match(html, /data-official-era-image/);
  assert.match(js, /data-official-era-image/);
  assert.match(js, /fallbackSrc/);
  const css = fs.readFileSync(path.join(root, "public", "styles.css"), "utf8");
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
});

test("moderation tabs load one bounded status while keeping all repair actions", async () => {
  const commonAdmin = {
    currentPath: "/admin", isAdmin: true, eras,
    adminRepairEras: eras, approvalEras: eras,
    milestones: [{ ...milestone, eraKey: "ugly_city" }],
    reviewCounts: { pending: 1, approved: 45, declined: 3 },
    reviewPage: 1, reviewTotalPages: 1, reviewPageSize: 24,
    submissions: [sample],
    approvedSubmissions: [{ ...sample, status: "approved" }],
    declinedSubmissions: [{ ...sample, status: "declined" }],
  };
  const pending = await render("admin.ejs", { ...commonAdmin, reviewStatus: "pending" });
  assert.match(pending, /\/admin\/submissions\/9\/approve/);
  assert.match(pending, /\/admin\/submissions\/9\/decline/);
  assert.match(pending, /data-review-toggle="edit"/);
  assert.doesNotMatch(pending, /\/admin\/submissions\/9\/update-approved/);

  const approved = await render("admin.ejs", { ...commonAdmin, reviewStatus: "approved" });
  assert.match(approved, /\/admin\/submissions\/9\/update-approved/);
  assert.match(approved, /\/admin\/submissions\/9\/unapprove/);
  assert.doesNotMatch(approved, /\/admin\/submissions\/9\/update-declined/);

  const declined = await render("admin.ejs", { ...commonAdmin, reviewStatus: "declined" });
  assert.match(declined, /\/admin\/submissions\/9\/update-declined/);
  assert.doesNotMatch(declined, /\/admin\/submissions\/9\/approve"/);

  const page = await render("admin.ejs", {
    ...commonAdmin, reviewStatus: "approved", reviewPage: 2, reviewTotalPages: 3
  });
  assert.match(page, /\/admin\?status=approved&amp;page=1/);
  assert.match(page, /\/admin\?status=approved&amp;page=3/);
  assert.match(page, /Page 2 of 3/);
  assert.doesNotMatch(page, /data-gif-button|data-gif-source|image-proxy/);
});

test("art galleries display the complete image and UI enhancements preserve native forms", () => {
  const css = fs.readFileSync(path.join(root, "public", "styles.css"), "utf8");
  const studio = fs.readFileSync(path.join(root, "public", "studio.js"), "utf8");
  assert.match(css, /\.submission-tile__media img\s*\{[^}]*object-fit:\s*contain/);
  assert.match(css, /\.approved-library-item > summary img\s*\{[^}]*object-fit:\s*contain/);
  assert.match(studio, /URL\.revokeObjectURL/);
  assert.match(studio, /data-gallery-filter/);
  assert.doesNotMatch(studio, /fetch\s*\(\s*["']\/submit/);
  const adminJs = fs.readFileSync(path.join(root, "public", "admin.js"), "utf8");
  const appJs = fs.readFileSync(path.join(root, "src", "app.js"), "utf8");
  assert.doesNotMatch(adminJs, /buildAnimatedGif|canvas\.getImageData|encodeLiteralLzw/);
  assert.doesNotMatch(appJs, /\/admin\/image-proxy/);
});
