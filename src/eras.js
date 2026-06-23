const COLLECTION_TYPES = Object.freeze({
  squigs: "squigs",
  other: "other",
});

const SURVIVAL_ERAS = Object.freeze([
  {
    key: "day_one",
    label: "Day One",
    summary: "The moment Squigs arrive and immediately misunderstand everything.",
    guidance: "New to Earth. Confident. Completely wrong. Show preventable failures, clumsy choices, and basic human tasks going sideways.",
    allowedCollectionTypes: Object.freeze([COLLECTION_TYPES.squigs]),
    defaultRewards: Object.freeze({ squigs: 150, other: null }),
    promptRecommended: true,
    promptRequired: false,
    sortOrder: 10,
    active: true,
  },
  {
    key: "office_squigs",
    label: "Office Squigs",
    summary: "Squigs trying to survive corporate life with zero understanding of how it works.",
    guidance: "Desk chaos, broken meetings, ruined equipment, and 'I have no idea what my job is' energy.",
    allowedCollectionTypes: Object.freeze([COLLECTION_TYPES.squigs]),
    defaultRewards: Object.freeze({ squigs: 150, other: null }),
    promptRecommended: true,
    promptRequired: false,
    sortOrder: 20,
    active: true,
  },
  {
    key: "jobsite_squigs",
    label: "Jobsite Squigs",
    summary: "Squigs on a construction site making avoidable, dangerous mistakes.",
    guidance: "Unsafe ladders, dropped tools, chain reactions, and mid-accident scenes where the cause is obvious.",
    allowedCollectionTypes: Object.freeze([COLLECTION_TYPES.squigs]),
    defaultRewards: Object.freeze({ squigs: 150, other: null }),
    promptRecommended: true,
    promptRequired: false,
    sortOrder: 30,
    active: true,
  },
  {
    key: "movie_theater",
    label: "Movie Theater",
    summary: "Public chaos caused by characters misunderstanding social norms.",
    guidance: "Screen reactions, popcorn disasters, crowd disruption, embarrassment, and escalation.",
    allowedCollectionTypes: Object.freeze([COLLECTION_TYPES.squigs, COLLECTION_TYPES.other]),
    defaultRewards: Object.freeze({ squigs: 150, other: 100 }),
    promptRecommended: true,
    promptRequired: false,
    sortOrder: 40,
    active: true,
  },
  {
    key: "airport",
    label: "Airport",
    summary: "Travel chaos caused by characters not understanding how anything works.",
    guidance: "Security line disasters, luggage failures, terminal confusion, missed flights, and avoidable urgency.",
    allowedCollectionTypes: Object.freeze([COLLECTION_TYPES.squigs, COLLECTION_TYPES.other]),
    defaultRewards: Object.freeze({ squigs: 150, other: 100 }),
    promptRecommended: true,
    promptRequired: false,
    sortOrder: 50,
    active: true,
  },
  {
    key: "zombie_apocalypse",
    label: "Zombie Apocalypse",
    summary: "End-of-the-world survival or total failure to survive.",
    guidance: "Running, hiding, improvised weapons, bad plans, and heroic attempts mixed with instant poor judgment.",
    allowedCollectionTypes: Object.freeze([COLLECTION_TYPES.squigs, COLLECTION_TYPES.other]),
    defaultRewards: Object.freeze({ squigs: 150, other: 100 }),
    promptRecommended: true,
    promptRequired: false,
    sortOrder: 60,
    active: true,
  },
  {
    key: "!revive Success",
    label: "!revive Success",
    summary: "A successful revival where the character comes back, but not always perfectly.",
    guidance: "Glow, energy surges, unstable recovery, triumphant weirdness, and 'back but something is off' moments.",
    allowedCollectionTypes: Object.freeze([COLLECTION_TYPES.squigs, COLLECTION_TYPES.other]),
    defaultRewards: Object.freeze({ squigs: 20, other: 10 }),
    promptRecommended: true,
    promptRequired: false,
    sortOrder: 70,
    active: true,
  },
  {
    key: "!revive Failed",
    label: "!revive Failed",
    summary: "A failed attempt to bring someone back.",
    guidance: "Wrong tools, malfunctioning setups, weak energy, and the realization that the revival did not work.",
    allowedCollectionTypes: Object.freeze([COLLECTION_TYPES.squigs, COLLECTION_TYPES.other]),
    defaultRewards: Object.freeze({ squigs: 20, other: 10 }),
    promptRecommended: true,
    promptRequired: false,
    sortOrder: 80,
    active: true,
  },
]);

const SURVIVAL_ERA_KEYS = new Set(SURVIVAL_ERAS.map((era) => era.key));

function getEraByKey(eraKey) {
  return SURVIVAL_ERAS.find((era) => era.key === eraKey) || null;
}

function isCollectionTypeAllowedForEra(eraKey, collectionType) {
  const era = getEraByKey(eraKey);
  return Boolean(era && era.allowedCollectionTypes.includes(collectionType));
}

function resolveEraDefaultReward(collectionType, eraKey) {
  const era = getEraByKey(eraKey);
  if (!era || !isCollectionTypeAllowedForEra(eraKey, collectionType)) return null;
  return era.defaultRewards[collectionType];
}

module.exports = {
  COLLECTION_TYPES,
  SURVIVAL_ERAS,
  SURVIVAL_ERA_KEYS,
  getEraByKey,
  isCollectionTypeAllowedForEra,
  resolveEraDefaultReward,
};
