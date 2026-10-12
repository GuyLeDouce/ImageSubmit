// Add future eras here after agreeing their exact integration keys with The Gauntlet.
const { UGLY_CITY_MILESTONES } = require("./uglyCityMilestones");
const { getUglyCityMilestoneConceptByKey } = require("./uglyCityMilestoneConcepts");

module.exports = [
  {
    key: "death_race",
    label: "Death Race",
    description: "One or more Squigs in a wild post-apocalyptic death race. Any approved image can appear at any milestone. No milestone assignment needed.",
    acceptingSubmissions: true,
    milestones: [],
  },
  {
    key: "ugly_city",
    label: "The Rise of Ugly City",
    description: "The Squigs are building, exploring, and surviving the world's worst city, one chaotic milestone at a time.",
    acceptingSubmissions: true,
    milestones: UGLY_CITY_MILESTONES.map((milestone) => ({
      ...milestone,
      concept: getUglyCityMilestoneConceptByKey(milestone.key),
    })),
    // Existing MILESTONES_ALLOWED remains the Ugly City submission window.
    usesLegacyMilestoneLimit: true,
  },
];
