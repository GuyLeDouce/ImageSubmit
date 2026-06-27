const { UGLY_CITY_ERA_KEY } = require("./uglyCityMilestones");

const COLLECTION_TYPES = Object.freeze({
  squigs: "squigs",
  other: "other",
});

const SURVIVAL_ERAS = Object.freeze([
  { key: UGLY_CITY_ERA_KEY, label: "The Rise of Ugly City" },
]);

const LEGACY_SURVIVAL_ERAS = Object.freeze([
  { key: "day_one", label: "Day One" },
  { key: "office_squigs", label: "Office Squigs" },
  { key: "jobsite_squigs", label: "Jobsite Squigs" },
  { key: "movie_theater", label: "Movie Theater" },
  { key: "airport", label: "Airport" },
  { key: "zombie_apocalypse", label: "Zombie Apocalypse" },
  { key: "!revive Success", label: "!revive Success" },
  { key: "!revive Failed", label: "!revive Failed" },
]);

const ADMIN_REPAIR_ERAS = Object.freeze([
  ...SURVIVAL_ERAS,
  ...LEGACY_SURVIVAL_ERAS,
]);

const SURVIVAL_ERA_KEYS = new Set(SURVIVAL_ERAS.map((era) => era.key));
const ADMIN_REPAIR_ERA_KEYS = new Set(ADMIN_REPAIR_ERAS.map((era) => era.key));

function getEraByKey(eraKey) {
  return SURVIVAL_ERAS.find((era) => era.key === eraKey) || null;
}

function getAdminRepairEraByKey(eraKey) {
  return ADMIN_REPAIR_ERAS.find((era) => era.key === eraKey) || null;
}

function isCollectionTypeAllowedForEra(eraKey, collectionType) {
  return eraKey === UGLY_CITY_ERA_KEY && collectionType === COLLECTION_TYPES.squigs;
}

function resolveEraDefaultReward(collectionType, eraKey) {
  if (!isCollectionTypeAllowedForEra(eraKey, collectionType)) return null;
  return 100;
}

module.exports = {
  COLLECTION_TYPES,
  UGLY_CITY_ERA_KEY,
  SURVIVAL_ERAS,
  LEGACY_SURVIVAL_ERAS,
  ADMIN_REPAIR_ERAS,
  SURVIVAL_ERA_KEYS,
  ADMIN_REPAIR_ERA_KEYS,
  getEraByKey,
  getAdminRepairEraByKey,
  isCollectionTypeAllowedForEra,
  resolveEraDefaultReward,
};
