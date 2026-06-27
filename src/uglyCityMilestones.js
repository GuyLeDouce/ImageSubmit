const UGLY_CITY_ERA_KEY = "ugly_city";

const milestoneDistricts = [
  "Empty Lot",
  "First Camp",
  "Dirt Road",
  "Storage Yard",
  "Workshop",
  "Junkyard",
  "Water Tower",
  "Sewer",
  "Trailer Park",
  "Bridge",
  "Hospital",
  "Police Station",
  "Fire Hall",
  "Town Hall",
  "School",
  "Post Office",
  "Power Plant",
  "Bank",
  "Apartment Block",
  "Warehouse",
  "Market",
  "Gas Station",
  "Restaurant",
  "Shopping Mall",
  "Arcade",
  "Hotel",
  "Factory",
  "Harbor",
  "Casino",
  "Office Building",
  "Zoo",
  "Aquarium",
  "Theme Park",
  "Movie Theater",
  "Bowling Alley",
  "Museum",
  "Beach",
  "Concert Hall",
  "Sports Stadium",
  "Nightclub",
  "Train Station",
  "Subway",
  "Airport",
  "University",
  "Research Lab",
  "TV Station",
  "Observatory",
  "Skyscrapers",
  "Luxury District",
  "Old Town",
  "Mayor's Office",
  "Founders Plaza",
  "City Monument",
  "The Vault",
  "The Underground",
  "Grand Gate",
  "Ugly Castle",
  "Hall of Survivors",
  "The Crown",
  "Founder's Statue",
  "Courthouse",
  "Permit Office",
  "Recycling Center",
  "Bus Depot",
  "Library",
  "Laundromat",
  "Food Court",
  "City Park",
  "Pawn Shop",
  "Rooftop District",
  "Radio Tower",
  "Weather Station",
  "Toll Booth",
  "Parking Garage",
  "Department of Bad Decisions",
  "Ugly DMV",
  "City Dump",
  "Canal",
  "Ferry Terminal",
  "Boardwalk",
  "Motel",
  "Convention Center",
  "Ice Cream Stand",
  "Underground Mall",
  "Clock Tower",
  "Water Park",
  "Community Center",
  "Tattoo Shop",
  "Newsstand",
  "Soup Kitchen",
  "Security Office",
  "Monorail",
  "Botanical Garden",
  "Statue Factory",
  "Emergency Bunker",
  "Records Office",
  "The Last Alley",
  "Final Permit Desk",
  "City Hall Steps",
  "Founder's Office",
];

function toKey(label) {
  return label
    .toLowerCase()
    .replace(/'/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

const UGLY_CITY_MILESTONES = Object.freeze(
  milestoneDistricts.map((district, index) => {
    const number = index + 1;
    return Object.freeze({
      number,
      key: toKey(district),
      label: `Chapter ${number} - ${district}`,
      district,
    });
  })
);

function getUglyCityMilestoneByKey(key) {
  return UGLY_CITY_MILESTONES.find((milestone) => milestone.key === key) || null;
}

function getUglyCityMilestoneByNumber(number) {
  const parsed = Number(number);
  if (!Number.isInteger(parsed)) return null;
  return UGLY_CITY_MILESTONES.find((milestone) => milestone.number === parsed) || null;
}

module.exports = {
  UGLY_CITY_ERA_KEY,
  UGLY_CITY_MILESTONES,
  getUglyCityMilestoneByKey,
  getUglyCityMilestoneByNumber,
};
