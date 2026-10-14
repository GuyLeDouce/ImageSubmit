"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const {
  PROMPTS,
  PROMPT_GROUPS,
  ERA_KEY,
  IDENTITY_LOCK,
  ART_STYLE,
  RACE_TONE,
  VEHICLE_RULES,
  COMPOSITION,
} = require("../src/deathRacePrompts");

const expectedTitles = [
  ["Full Throttle", "The Wrecking Ball", "Death From Above", "The Flame Tunnel",
    "Wrong Turn", "Scrapyard Launch", "Road Rage", "The Last Second Escape",
    "Monster Engine", "Out of Control", "The Death Drop", "Victory or Death"],
  ["Jump or Die", "Head-On Collision", "Side Swipe", "Bridge Battle",
    "The Pit Maneuver", "Airborne Assault", "The Flamethrower", "Wrong Way, Asshole!",
    "The Scrap Crusher", "The Great Escape", "Death Race Drag Strip", "The Final Showdown"],
];

test("Squigwreck preserves its image pool and offers the requested twelve scenes per attachment count", () => {
  assert.equal(ERA_KEY, "death_race", "legacy approved submissions must remain eligible");
  assert.deepEqual(PROMPT_GROUPS.map((group) => group.label), ["1 Squig Attached", "2 Squigs Attached"]);
  assert.deepEqual(PROMPT_GROUPS.map((group) => group.prompts.map((item) => item.title)), expectedTitles);
  assert.equal(PROMPTS.length, 24);
  assert.equal(new Set(PROMPTS.map((item) => item.id)).size, 24, "prompt anchors must be unique");
  for (const group of PROMPT_GROUPS) {
    for (const item of group.prompts) {
      assert.equal(item.squigCount, group.squigCount);
      assert.ok(item.prompt.includes(group.instructions), item.title + ": missing attachment instructions");
    }
  }
  assert.match(PROMPT_GROUPS[0].instructions, /exactly ONE Squig driving ONE vehicle/);
  assert.match(PROMPT_GROUPS[1].instructions, /Squig 1 is the FIRST attachment; Squig 2 is the SECOND/);
});

test("every prompt fully preserves Squigs, places drivers inside cartoon death machines, and is square", () => {
  assert.match(IDENTITY_LOCK, /exact eye COUNT/);
  assert.match(ART_STYLE, /thick crisp dark outlines/i);
  assert.match(RACE_TONE, /LAST RACER ALIVE WINS/);
  assert.match(RACE_TONE, /Dark adult humour/);
  assert.match(VEHICLE_RULES, /battle-ready combat racer/);
  assert.match(VEHICLE_RULES, /SEATED INSIDE/);
  assert.match(VEHICLE_RULES, /CARTOONY ARMORED DEATH MACHINE/);
  assert.match(COMPOSITION, /SQUARE 1:1/);

  for (const { title, prompt } of PROMPTS) {
    assert.ok(prompt.startsWith("SQUIGWRECK — " + title.toUpperCase()));
    assert.ok(prompt.includes(IDENTITY_LOCK), title + ": missing identity lock");
    assert.ok(prompt.includes(ART_STYLE), title + ": missing clean 2D art style");
    assert.ok(prompt.includes(RACE_TONE), title + ": missing cinematic death-race stakes");
    assert.ok(prompt.includes(VEHICLE_RULES), title + ": missing vehicle requirements");
    assert.ok(prompt.includes(COMPOSITION), title + ": missing square composition");
    assert.match(prompt, /steering wheel/i, title + ": Squig must remain an actual driver");
    assert.doesNotMatch(prompt, /16:9/, title + ": aspect ratio must remain square");
    assert.ok(prompt.length <= 4000, title + ": prompt exceeds upload form's 4,000-character limit");
  }
});
