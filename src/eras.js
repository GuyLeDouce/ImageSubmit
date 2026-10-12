const { UGLY_CITY_ERA_KEY } = require("./uglyCityMilestones");

const COLLECTION_TYPES = Object.freeze({
  squigs: "squigs",
  other: "other",
});

const ERA_CATALOG = validateEraCatalog(require("./eraCatalog"));
const SURVIVAL_ERAS = Object.freeze(ERA_CATALOG.filter((era) => era.acceptingSubmissions));

function validateEraCatalog(catalog) {
  const keys = new Set();
  for (const era of catalog) {
    if (!/^[a-z0-9_]+$/.test(era.key) || keys.has(era.key) || !era.label ||
        typeof era.description !== "string" || typeof era.acceptingSubmissions !== "boolean" ||
        !Array.isArray(era.milestones) ||
        (era.submissionMilestoneLimit !== undefined && (!Number.isInteger(era.submissionMilestoneLimit) || era.submissionMilestoneLimit < 0))) throw new Error("Invalid or duplicate era configuration.");
    keys.add(era.key);
    const milestoneKeys = new Set();
    const numbers = new Set();
    for (const milestone of era.milestones) {
      if (!/^[a-z0-9_]+$/.test(milestone.key) || milestoneKeys.has(milestone.key) ||
          !Number.isInteger(milestone.number) || milestone.number < 1 || numbers.has(milestone.number) ||
          !milestone.label || !milestone.district) throw new Error(`Invalid milestone in ${era.key}.`);
      milestoneKeys.add(milestone.key);
      numbers.add(milestone.number);
      Object.freeze(milestone);
    }
    Object.freeze(era.milestones);
    Object.freeze(era);
  }
  return Object.freeze(catalog);
}

function getEraMilestones(eraKey, { forSubmission = false, legacyLimit = 100 } = {}) {
  const era = ERA_CATALOG.find((candidate) => candidate.key === eraKey);
  if (!era || (forSubmission && !era.acceptingSubmissions)) return [];
  if (forSubmission && era.usesLegacyMilestoneLimit) return era.milestones.slice(0, legacyLimit);
  return forSubmission && era.submissionMilestoneLimit !== undefined
    ? era.milestones.slice(0, era.submissionMilestoneLimit)
    : era.milestones;
}

function resolveEraMilestone(eraKey, milestoneKey, { required = false, ...options } = {}) {
  const key = String(milestoneKey || "").trim();
  const milestones = getEraMilestones(eraKey, options);
  const era = ERA_CATALOG.find((candidate) => candidate.key === eraKey);
  if (!key && !(required && era?.milestones.length)) return null;
  const milestone = milestones.find((candidate) => candidate.key === key);
  if (!milestone) throw Object.assign(new Error("Please choose an available milestone for the selected era."), { statusCode: 400 });
  return milestone;
}

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
  ...ERA_CATALOG,
  ...LEGACY_SURVIVAL_ERAS.filter((legacy) => !ERA_CATALOG.some((era) => era.key === legacy.key)),
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
  return SURVIVAL_ERA_KEYS.has(eraKey) && collectionType === COLLECTION_TYPES.squigs;
}

function resolveEraDefaultReward(collectionType, eraKey) {
  if (!isCollectionTypeAllowedForEra(eraKey, collectionType)) return null;
  return 100;
}

module.exports = {
  ERA_CATALOG,
  validateEraCatalog,
  getEraMilestones,
  resolveEraMilestone,
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
