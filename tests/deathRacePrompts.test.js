"use strict";
const test=require("node:test");const assert=require("node:assert/strict");
const {PROMPTS,ERA_KEY}=require("../src/deathRacePrompts");
test("creator prompt library",()=>{assert.equal(ERA_KEY,"death_race");assert.ok(PROMPTS.length>=10);for(const item of PROMPTS){assert.ok(item.prompt.includes("Squig"));assert.ok(item.prompt.includes("16:9"));}});
