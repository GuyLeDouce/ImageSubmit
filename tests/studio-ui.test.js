"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");
const ejs = require("ejs");

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

test("Ugly City creator form retains the original submission contract", async () => {
  const html = await render("submit.ejs", {
    currentPath: "/submit", eras, adminRepairEras: eras,
    selectedEra: eras[0], selectedMilestone: milestone,
    milestones: eras[0].milestones,
    milestoneConcepts: { empty_lot: "Create an Empty Lot scene." },
    submitted: false, submissions: [], deathRacePrompts: [],
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

test("Squigwreck prompt cards preserve all prompt text and keep uploads working", async () => {
  const prompt = "Driver inside cartoon machine. Keep every original eye.";
  const html = await render("submit.ejs", {
    currentPath: "/submit", eras, adminRepairEras: eras,
    selectedEra: eras[1], selectedMilestone: null, milestones: [],
    milestoneConcepts: {}, submitted: false, submissions: [],
    deathRacePrompts: [{ title: "Full Throttle", prompt }],
  });
  assert.match(html, /Full Throttle/);
  assert.ok(html.includes(prompt));
  assert.match(html, /data-copy-death-race-prompt/);
  assert.match(html, /name="era_key" value="death_race"/);
  assert.match(html, /name="images"/);
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

test("admin still exposes all moderation and repair actions", async () => {
  const html = await render("admin.ejs", {
    currentPath: "/admin", isAdmin: true, eras,
    adminRepairEras: eras, approvalEras: eras,
    milestones: [{ ...milestone, eraKey: "ugly_city" }],
    submissions: [sample], approvedSubmissions: [{ ...sample, status: "approved" }],
    declinedSubmissions: [{ ...sample, status: "declined" }],
  });
  for (const action of ["approve", "decline", "update-approved", "update-declined", "unapprove"]) {
    assert.ok(html.includes("/admin/submissions/9/" + action), action + " must remain available");
  }
  assert.match(html, /data-gif-button/);
  assert.match(html, /data-review-toggle="edit"/);
});

test("art galleries display the complete image and UI enhancements preserve native forms", () => {
  const css = fs.readFileSync(path.join(root, "public", "styles.css"), "utf8");
  const studio = fs.readFileSync(path.join(root, "public", "studio.js"), "utf8");
  assert.match(css, /\.submission-tile__media img\s*\{[^}]*object-fit:\s*contain/);
  assert.match(css, /\.approved-library-item > summary img\s*\{[^}]*object-fit:\s*contain/);
  assert.match(studio, /URL\.revokeObjectURL/);
  assert.match(studio, /data-gallery-filter/);
  assert.doesNotMatch(studio, /fetch\s*\(\s*["']\/submit/);
});
