"use strict";
// Shared Death Race creator prompt library; additive to existing era configuration.
const ERA_KEY = "death_race";
const IDENTITY_LOCK = "Use the supplied Squig reference images. Preserve each Squig's recognizable three eyes, exact proportions, colors, clothing and accessories. Never humanize or redesign the characters. Include one or more clearly recognizable Squigs. No text, logos or watermarks. Wide 16:9 composition.";
const scenes = [
["Full Throttle","An armored muscle car tears through a ruined desert highway, dust and sparks everywhere."],
["Highway Carnage","Two weaponized vehicles collide on an abandoned elevated freeway amid debris and smoke."],
["Monster Mayhem","A ridiculous monster truck leaps over wrecked vehicles in a fiery arena."],
["Midnight Massacre","A neon-lit convoy speeds through a flooded ruined city at midnight."],
["Dust to Dust","A line of patched-together racers disappears into a monumental desert sandstorm."],
["Scrapyard Sprint","A racer drifts through towering scrap heaps beneath swinging magnetic cranes."],
["Bridge of Doom","Two battered vehicles race across a collapsing suspension bridge."],
["Fuel and Fury","A chaotic pit stop at a post-apocalyptic fuel depot as racers roar past."],
["Tunnel Vision","An armored buggy races through a pitch-black tunnel lit by flying sparks."],
["Last Stand","A battered racer approaches the finish line through smoke and shattered barriers."],
["Mountain Madness","Off-road racers leap across narrow mountain switchbacks above a canyon."],
["Industrial Inferno","Racers dodge giant wrecking balls in an abandoned factory complex."]
];
const PROMPTS = Object.freeze(scenes.map(([title, scene], index) => Object.freeze({id: "death-race-" + String(index + 1).padStart(2, "0"), title, prompt: IDENTITY_LOCK + " " + scene})));
module.exports = { ERA_KEY, IDENTITY_LOCK, PROMPTS };
