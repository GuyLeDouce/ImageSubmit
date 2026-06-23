const test = require("node:test");
const assert = require("node:assert/strict");

const {
  SURVIVAL_ERAS,
  getEraByKey,
  isCollectionTypeAllowedForEra,
  resolveEraDefaultReward,
} = require("../src/eras");
const { PROJECT_LINKS } = require("../src/links");

test("preserves exact era keys", () => {
  assert.deepEqual(
    SURVIVAL_ERAS.map((era) => era.key),
    [
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
});

test("enforces Squigs-only eras", () => {
  for (const key of ["day_one", "office_squigs", "jobsite_squigs"]) {
    assert.equal(isCollectionTypeAllowedForEra(key, "squigs"), true);
    assert.equal(isCollectionTypeAllowedForEra(key, "other"), false);
    assert.equal(resolveEraDefaultReward("squigs", key), 150);
    assert.equal(resolveEraDefaultReward("other", key), null);
  }
});

test("allows other collections in non Squigs-only eras", () => {
  for (const era of SURVIVAL_ERAS.filter((item) => !["day_one", "office_squigs", "jobsite_squigs"].includes(item.key))) {
    assert.equal(isCollectionTypeAllowedForEra(era.key, "squigs"), true);
    assert.equal(isCollectionTypeAllowedForEra(era.key, "other"), true);
  }
});

test("uses revive reward defaults from domain model", () => {
  assert.equal(resolveEraDefaultReward("squigs", "!revive Success"), 20);
  assert.equal(resolveEraDefaultReward("other", "!revive Success"), 10);
  assert.equal(resolveEraDefaultReward("squigs", "!revive Failed"), 20);
  assert.equal(resolveEraDefaultReward("other", "!revive Failed"), 10);
});

test("centralizes canonical project links", () => {
  assert.equal(PROJECT_LINKS.squigsHome, "https://squigs.io/");
  assert.equal(PROJECT_LINKS.discord, "https://squigs.io/discord");
  assert.equal(PROJECT_LINKS.openSea, "https://opensea.io/collection/squigs-reloaded");
  assert.ok(PROJECT_LINKS.x.startsWith("https://x.com/"));
  assert.ok(getEraByKey("day_one"));
});
