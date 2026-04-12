const SURVIVAL_ERAS = [
  { key: "day_one", label: "Day One" },
  { key: "office_squigs", label: "Office Squigs" },
  { key: "jobsite_squigs", label: "Jobsite Squigs" },
  { key: "movie_theater", label: "Movie Theater" },
  { key: "airport", label: "Airport" },
  { key: "zombie_apocalypse", label: "Zombie Apocalypse" },
  { key: "!revive Success", label: "!revive Success" },
  { key: "!revive Failed", label: "!revive Failed" },
];

const SURVIVAL_ERA_KEYS = new Set(SURVIVAL_ERAS.map((era) => era.key));

module.exports = {
  SURVIVAL_ERAS,
  SURVIVAL_ERA_KEYS,
};
