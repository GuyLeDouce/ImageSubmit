const { UGLY_CITY_ERA_KEY } = require("./uglyCityMilestones");

const COLLECTION_TYPES = Object.freeze({
  squigs: "squigs",
  other: "other",
});

const SURVIVAL_ERAS = Object.freeze([
  { key: UGLY_CITY_ERA_KEY, label: "The Rise of Ugly City" },
]);

const SURVIVAL_ERA_KEYS = new Set(SURVIVAL_ERAS.map((era) => era.key));

function getEraByKey(eraKey) {
  return SURVIVAL_ERAS.find((era) => era.key === eraKey) || null;
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
  SURVIVAL_ERA_KEYS,
  getEraByKey,
  isCollectionTypeAllowedForEra,
  resolveEraDefaultReward,
};
