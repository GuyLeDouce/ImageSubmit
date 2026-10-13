"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const {
  PROMPTS,
  ERA_KEY,
  IDENTITY_LOCK,
  ART_STYLE,
  VEHICLE_RULES,
  COMPOSITION,
} = require("../src/deathRacePrompts");

const expectedTitles = [
  "Full Throttle",
  "Highway Carnage",
  "Monster Mayhem",
  "Midnight Massacre",
  "Dust to Dust",
  "Scrapyard Sprint",
  "Bridge of Doom",
  "Fuel and Fury",
  "Tunnel Vision",
  "Last Stand",
  "Mountain Madness",
  "Industrial Inferno",
];

test("Squigwreck preserves the established image-pool key and all twelve prompt identities", () => {
  assert.equal(ERA_KEY, "death_race", "legacy approved submissions must remain eligible");
  assert.deepEqual(PROMPTS.map((item) => item.title), expectedTitles);
  assert.deepEqual(
    PROMPTS.map((item) => item.id),
    expectedTitles.map((_, index) => "death-race-" + String(index + 1).padStart(2, "0"))
  );
});

test("every prompt fully preserves Squigs, places drivers inside cartoon death machines, and is square", () => {
  assert.match(IDENTITY_LOCK, /exact eye COUNT/);
  assert.match(ART_STYLE, /thick crisp dark outlines/i);
  assert.match(VEHICLE_RULES, /SEATED INSIDE/);
  assert.match(VEHICLE_RULES, /CARTOONY ARMORED DEATH MACHINE/);
  assert.match(COMPOSITION, /SQUARE 1:1/);

  for (const { title, prompt } of PROMPTS) {
    assert.match(prompt, new RegExp("SQUIGWRECK — " + title.toUpperCase()));
    assert.ok(prompt.includes(IDENTITY_LOCK), title + ": missing identity lock");
    assert.ok(prompt.includes(ART_STYLE), title + ": missing clean 2D art style");
    assert.ok(prompt.includes(VEHICLE_RULES), title + ": missing vehicle requirements");
    assert.ok(prompt.includes(COMPOSITION), title + ": missing square composition");
    assert.match(prompt, /steering wheel/i, title + ": Squig must remain an actual driver");
    assert.doesNotMatch(prompt, /16:9/, title + ": aspect ratio must remain square");
    assert.ok(prompt.length <= 4000, title + ": prompt exceeds upload form's 4,000-character limit");
  }
});
