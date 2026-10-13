"use strict";
// Full self-contained Squigwreck prompts for image models that have never seen Squigs.
// Keep ERA_KEY and prompt IDs stable for existing database/website compatibility.
const ERA_KEY = "death_race";
const IDENTITY_LOCK = "CHARACTER REFERENCE — ABSOLUTE IDENTITY LOCK: The uploaded Squig artwork is the ONLY character reference. The AI has no prior knowledge of Squigs: these are original, distinctive 2D cartoon NFT characters, not humans, generic monsters, Minions or characters from another franchise. Study the actual uploaded Squig(s) carefully. Keep each exact head silhouette and proportions; exact eye COUNT, shape, spacing, pupils and expression (if three eyes, preserve ALL THREE); ears, skin colour, hair, mouth, clothing, stripes, patterns and accessories, on their ORIGINAL sides. Never add eyes, noses, teeth, horns, limbs, helmets, goggles or face coverings not present in the reference. Do not blink, redesign, humanize or mix traits between characters. Their faces must remain unmistakably the same.";
const ART_STYLE = "ART STYLE — NON-NEGOTIABLE: Draw the ENTIRE scene in the clean original Squigs Reloaded-style 2D cartoon aesthetic. Thick crisp dark outlines, smooth flat colours, bold simple shapes, restrained cel-shaded shadows, and a polished clear illustration finish. Cars, weapons, smoke, flames, roads and buildings share exactly the SAME drawn style as the Squigs. The characters have chaotic personalities, but the composition itself must remain clean, simple and easy to understand. No photorealism, CGI/3D, anime, painterly blur, muddy realism, hyper-detailed metal or visual clutter.";
const VEHICLE_RULES = "DRIVER AND VEHICLE — ABSOLUTE RULE: EVERY Squig stays SEATED INSIDE its OWN vehicle at ALL times, actually driving from behind its steering wheel. Show the full recognizable Squig face, EVERY original eye, ears, hair and some original clothing through an extra-large open window, open cockpit or clear broad windshield. Never place the Squig standing beside the car, on its roof or hood, leaning outside, floating, or blended into the bodywork. No helmet, roll-cage bar, windshield reflection or weapon may hide the eyes. Build each vehicle as a bold, fun, exaggerated CARTOONY ARMORED DEATH MACHINE personalized to that Squig's visible reference traits: chunky oversized tires, dramatic bumper, simple coloured armor, cartoon spikes, giant exhausts and one or two silly oversized weapon mounts such as rockets, a cannon or a spinning saw. Keep weapons away from the face. The vehicle matches the Squig; the Squig does NOT change to match the vehicle. No real-world military realism.";
const COMPOSITION = "COMPOSITION: SQUARE 1:1 image. One obvious cinematic action, dynamic clear camera angle, strong readable silhouettes, driver large enough to identify, clean negative space, simple foreground and background. A few illustrated sparks, dust puffs, tire marks or speed lines are enough; do not fill the frame with random objects. Only use Squig characters supplied in the references. If a second vehicle is depicted without a second Squig reference, its driver must NOT be visible. No extra eyes, duplicate limbs, tiny hidden faces, random characters, readable signs, captions, speech bubbles, logos, watermarks, crowns or gore.";
const scenes = [
  [
    "Full Throttle",
    "A single referenced Squig is clearly driving INSIDE a personalized low, wide cartoon combat muscle car with a giant spiked bumper, comically chunky rear tires, bright armor panels coloured after the Squig's actual outfit, two fat rear rocket tubes and oversized exhaust pipes. Show a dramatic LOW FRONT THREE-QUARTER view as it tears down an almost-empty cracked modern city street, front wheel lifting slightly into a hard turn. The Squig's unchanged eyes, face, ears and clothing must be large and visible through the open driver's window. Two short puffs of tire smoke, clean speed lines and a few orange sparks communicate the acceleration. Background: simple buildings, one road barrier, broad sky. The car is a ridiculous cartoon death machine, not a realistically rebuilt muscle car."
  ],
  [
    "Highway Carnage",
    "If TWO Squig references are uploaded, show TWO distinct Squigs, each SEATED INSIDE the clearly visible cockpit of their OWN cartoon death machine. One drives a wide armored coupe with giant side-mounted cannon and spiked bumper; the other drives a squat combat buggy with ridiculous tires and a large rear rocket pod. Both vehicles are personalized using their separate Squigs' real reference colours. Capture a side-by-side collision at the exact instant the armor plates scrape: one tire lifts, a modest burst of orange cartoon sparks flies, and both drivers are unmistakably visible through huge open windows. Use a clean low three-quarter side angle on an elevated highway with simple guardrails and distant city skyline. If only ONE reference is supplied, the second car has NO visible driver."
  ],
  [
    "Monster Mayhem",
    "One uploaded Squig is firmly SEATED INSIDE a very large open-window driver's cab of a hilarious oversized monster-truck death machine. Its full head, all original eyes, ears and real outfit remain prominent behind the steering wheel. Build the truck with absurdly gigantic round treaded tires, huge simple springs, an exaggerated spiked bulldozer bumper, bright armor matching the Squig, and one cartoon rocket barrel mounted BEHIND the cab. Freeze a giant airborne jump over two EMPTY squashed race cars on a cartoon arena road. Extreme low-angle hero view, simple golden sky, a few controlled smoke curls and dust puffs, one clean stadium barrier. Keep the cockpit visible despite the huge tires; no Squig outside the truck."
  ],
  [
    "Midnight Massacre",
    "A midnight race through an almost-empty neon-lit modern city. The lead referenced Squig drives INSIDE a cartoon armored sports racer with enormous chunky tires, reinforced spiked grille, glossy flat-colour body armor, fat exhausts and one oversized stylized weapon BEHIND the cab. Show that exact face with every eye visibly illuminated through a large open driver-side window. Additional referenced Squigs, if any, drive distinct matching cartoon death machines farther behind; never invent extra drivers. Low road-level camera tracking the lead car as it drifts around a wet bend. Use two clean graphic water sprays, purple and teal flat-colour pavement reflections and a simple blue building silhouette. It is nighttime, but keep all Squig features BRIGHT and readable; no lettering on buildings."
  ],
  [
    "Dust to Dust",
    "A reference Squig drives from INSIDE an open-cockpit cartoon death-race dune buggy, hands visibly on the steering wheel, with all original eyes and outfit readable ABOVE the dashboard. The buggy has massive bubble-shaped off-road tires, chunky flat armour personalized to the Squig's colours, a thick cartoon spiked bumper, exaggerated exhaust pipes and a playful twin-rocket mount. Place the cage bars BEHIND the head, never across the face. Capture the buggy in a wide sideways desert drift from a low front-side angle as a huge stylized sandstorm rises in the FAR background. Use one simple ochre dust shape, bold clean tire tracks and a few sparse rocks. The sand never covers the vehicle or Squig face. No photorealistic dust or messy debris."
  ],
  [
    "Scrapyard Sprint",
    "A referenced Squig drives INSIDE a compact cartoon armored rally racer with a giant open driver's window; all original eyes and the upper outfit are clearly visible. Personalize the colourful body with the Squig's traits. Use enormous rear tires, a goofy spiked snowplow-style bumper, thick curved armour panels and ONE exaggerated roof cannon mounted behind the seat. Show the car power-sliding through a clean industrial scrapyard course as an overhead magnetic crane swings a single flattened EMPTY vehicle just behind it. A dynamic low three-quarter drift shot with two tire skid marks, one small dust cloud and a couple of bright sparks. Background limited to two simple stacks of crushed cars, one crane silhouette and open sky. Do not bury the character in industrial junk."
  ],
  [
    "Bridge of Doom",
    "If two Squig references are supplied, both characters drive INSIDE separate customized cartoon war cars on a suspension bridge above a deep canyon. The lead car is a low spiked armored roadster with fat round wheels; the trailing vehicle is a small, tall-tired buggy with a cartoon rear missile tube. Their distinctive reference faces and eyes remain clearly visible in their open cockpits; no blended traits. A bridge section BREAKS BEHIND the racers, with one snapped cable and a few large illustrated road slabs falling into the canyon. Use a clean diagonal three-quarter camera angle with bold bridge lines, a simple layered canyon and warm sunset sky. Keep BOTH vehicles visually separate. With only one reference, any extra vehicle has no visible driver. No crowded wreckage."
  ],
  [
    "Fuel and Fury",
    "A tense Squigwreck pit-stop moment with a SINGLE referenced Squig SEATED INSIDE its personalized brightly coloured cartoon death machine, face and all original eyes clearly visible through a huge open driver's window. The Squig keeps hands on the steering wheel, ready to accelerate — NEVER standing outside holding a gas can. An exaggerated self-service fueling nozzle connects to the car's side port while the driver impatiently waits. Build the car with giant chunky tires, thick comic armor panels, one absurd spiked bumper, oversized side exhausts and a giant stylized rocket launcher behind the cab. Low clean front three-quarter view. Background: a two-pump roadside fuel station, a concrete barrier and a little drifting dust. No visible workers, readable pump text or random objects."
  ],
  [
    "Tunnel Vision",
    "One referenced Squig races from INSIDE an open-top cartoon armored buggy through a curved mountain tunnel. The Squig's exact head, eye count and clothing are prominently visible above the dashboard; simplified roll bars stay BEHIND the ears and hair. The vehicle has huge rounded tires, exaggerated cartoon headlights, clean armor plates in the Squig's colours, one low spiked bumper and a giant cannon behind the driver. A few stones fall from the ceiling just BEHIND the car; a small illustrated shower of sparks comes from its rear tire. Dynamic low front three-quarter camera, graphic headlight beams and simple receding tunnel arches. Keep the Squig face illuminated even in the tunnel. No dark tinted glass, extra racers or overflowing rubble."
  ],
  [
    "Last Stand",
    "One Squig, identical to the supplied art, remains INSIDE the driver's seat of a battle-damaged but still FUN cartoon death machine. Its original face, every eye, ears, outfit and accessories are fully readable through the large open window. The low muscle car has outrageously wide tires, a bent oversized spike bumper, bright armor panels matching the Squig's real colours, one playful rocket pod, a smoking exaggerated exhaust and a few simple painted scratches. Freeze an exciting final push down a mostly empty road from a heroic low front three-quarter angle. Behind are two tiny EMPTY wreck silhouettes, one clean smoke ribbon and some simple speed lines. A finish arch WITHOUT lettering appears ahead. Focus on the character and its ridiculous car, not gritty realistic damage."
  ],
  [
    "Mountain Madness",
    "A reference Squig is SEATED INSIDE an open cockpit cartoon mountain buggy, both hands at the wheel and every original eye, ear, hairstyle and outfit detail visible. Its personalized death machine has gigantic balloon tires, a broad dramatic spiked bumper, simplified bright armor, huge soft-looking suspension springs and one comically large rear-mounted missile launcher that never hides the driver. Show it LEAPING a short missing section of a twisting mountain roadway, captured from a sweeping front-side camera angle. Below: a deep canyon drawn in just a few flat layered colour planes. Add a simple dust trail and three bright gravel flecks for action. A second referenced Squig, if provided, can drive INSIDE a separate trailing buggy; never invent an unreferenced driver."
  ],
  [
    "Industrial Inferno",
    "A recognizable referenced Squig is firmly SEATED INSIDE a bright low cartoon armored death racer with an extra-wide open window; all of its real eyes, hair, ears and outfit stay unchanged and clearly visible. Give the car ridiculously wide tires, a thick spiked grille, chunky clean armor panels, two exaggerated exhaust stacks and ONE oversized cartoon saw-blade mounted out FRONT, far below the character's face. It speeds along a simple abandoned foundry race track while a gigantic wrecking ball swings BEHIND the car and a small illustrated orange spark burst flashes near the rear wheel. Low three-quarter action view. Background limited to two large pipes, a steel beam and a warm furnace glow painted in broad flat-colour shapes. No hyper-detailed factory clutter or gritty metallic texture."
  ]
];
const PROMPTS = Object.freeze(scenes.map(([title, scene], index) => Object.freeze({
  id: "death-race-" + String(index + 1).padStart(2, "0"),
  title,
  prompt: [
    "SQUIGWRECK — " + title.toUpperCase(),
    IDENTITY_LOCK,
    ART_STYLE,
    VEHICLE_RULES,
    "SCENE — " + scene,
    COMPOSITION,
  ].join("\n\n"),
})));
module.exports = { ERA_KEY, IDENTITY_LOCK, ART_STYLE, VEHICLE_RULES, COMPOSITION, PROMPTS };
