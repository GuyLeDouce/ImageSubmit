const test = require("node:test");
const assert = require("node:assert/strict");

const {
  SURVIVAL_ERAS,
  ADMIN_REPAIR_ERAS,
  UGLY_CITY_ERA_KEY,
  getEraByKey,
  getAdminRepairEraByKey,
  isCollectionTypeAllowedForEra,
  resolveEraDefaultReward,
} = require("../src/eras");
const {
  UGLY_CITY_MILESTONES,
  getUglyCityMilestoneByKey,
  getUglyCityMilestoneByNumber,
} = require("../src/uglyCityMilestones");
const { PROJECT_LINKS } = require("../src/links");

test("only exposes The Rise of Ugly City era", () => {
  assert.deepEqual(SURVIVAL_ERAS, [
    { key: "ugly_city", label: "The Rise of Ugly City" },
  ]);
  assert.equal(UGLY_CITY_ERA_KEY, "ugly_city");
  assert.deepEqual(getEraByKey("ugly_city"), SURVIVAL_ERAS[0]);
  assert.equal(getEraByKey("day_one"), null);
});

test("Ugly City requires Squigs internally and defaults to 100 CHARM", () => {
  assert.equal(isCollectionTypeAllowedForEra("ugly_city", "squigs"), true);
  assert.equal(isCollectionTypeAllowedForEra("ugly_city", "other"), false);
  assert.equal(resolveEraDefaultReward("squigs", "ugly_city"), 100);
  assert.equal(resolveEraDefaultReward("other", "ugly_city"), null);
});

test("keeps legacy eras available only for admin repair", () => {
  assert.deepEqual(SURVIVAL_ERAS.map((era) => era.key), ["ugly_city"]);
  assert.deepEqual(
    ADMIN_REPAIR_ERAS.map((era) => era.key),
    [
      "ugly_city",
      "day_one",
      "office_squigs",
      "jobsite_squigs",
      "movie_theater",
      "airport",
      "zombie_apocalypse",
      "!revive Success",
      "!revive Failed",
    ]
  );
  assert.equal(getEraByKey("airport"), null);
  assert.equal(getAdminRepairEraByKey("airport").label, "Airport");
});

test("centralizes all 100 Ugly City milestones", () => {
  assert.equal(UGLY_CITY_MILESTONES.length, 100);
  assert.deepEqual(getUglyCityMilestoneByNumber(1), {
    number: 1,
    key: "empty_lot",
    label: "Chapter 1 - Empty Lot",
    district: "Empty Lot",
  });
  assert.deepEqual(getUglyCityMilestoneByKey("founders_office"), {
    number: 100,
    key: "founders_office",
    label: "Chapter 100 - Founder's Office",
    district: "Founder's Office",
  });
  assert.equal(getUglyCityMilestoneByKey("airport").number, 43);
  assert.equal(getUglyCityMilestoneByKey("not_real"), null);
});

test("centralizes canonical project links", () => {
  assert.equal(PROJECT_LINKS.squigsHome, "https://squigs.io/");
  assert.equal(PROJECT_LINKS.discord, "https://squigs.io/discord");
  assert.equal(PROJECT_LINKS.openSea, "https://opensea.io/collection/squigs-reloaded");
  assert.ok(PROJECT_LINKS.x.startsWith("https://x.com/"));
});

test("only collection CTA destination resolves to Reloaded OpenSea collection", () => {
  const collectionDestinations = Object.values(PROJECT_LINKS).filter((value) => value.includes("opensea.io"));
  assert.deepEqual(collectionDestinations, ["https://opensea.io/collection/squigs-reloaded"]);
});
