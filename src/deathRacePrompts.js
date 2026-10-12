"use strict";
// Self-contained prompts for image models unfamiliar with Squigs. Era-wide, no milestone matching.
const ERA_KEY = "death_race";
const IDENTITY_LOCK = "CHARACTER REFERENCE — REQUIRED: The uploaded reference image(s) are the ONLY source of truth for the Squig character(s). The AI has no prior knowledge of Squigs: they are distinctive original 2D cartoon NFT characters, NOT humans, not generic monsters, not Minions, not aliens from another franchise. Carefully study the actual uploaded artwork before generating. Reproduce each character's exact head silhouette and width-to-height proportions, three-eye count and precise eye spacing/shape/placement (do not add or remove eyes), ears, skin color, hair, facial expression and mouth construction, limbs, hands, outfit, stripes, accessories and their original sides. Do not invent anatomy, noses, teeth, fingers, horns or equipment not supported by the reference. Do not replace the character with a generic racer or put a helmet over the face. If the reference has a distinctive 2D flat-color look, keep it. Squigs must be unmistakably the same individual characters, with their heads and eyes clearly visible. For multiple reference images, keep identities separate and never blend traits.";
const ART_STYLE = "ART STYLE — CRITICAL: Render the ENTIRE scene as one coherent premium Squigs-style 2D cartoon illustration: crisp confident thick dark outlines, clean cel-shaded flat color blocks, selective simple shadows and highlights, vivid but controlled colors, expressive original cartoon shapes, clean polished NFT illustration finish. Vehicles, explosions, smoke, sky, environment and characters must ALL share this same drawn aesthetic. Cinematic composition and lighting achieved through illustrated shapes, NOT photorealism, NOT 3D CGI, NOT anime, NOT gritty live-action textures, NOT realistic human faces. Keep the reference character's own line weight and color treatment as closely as possible.";
const COMPOSITION = "COMPOSITION AND QUALITY: Square 1:1 composition, one clear primary action, dynamic cinematic camera angle, legible silhouettes, strong foreground/midground/background separation, readable Squig face(s), energetic speed lines and stylized debris where appropriate. Leave enough breathing room around important features. No captions, signs with readable writing, labels, speech bubbles, watermarks, logos, or unrelated characters. Avoid duplicate limbs, extra eyes, distorted hands, merged bodies, cut-off heads, illegible clutter and random props.";
const scenes = [
  [
    "Full Throttle",
    "One reference Squig is driving a brutal customized muscle car with a reinforced steel bumper, patched armor panels, exposed engine intake, chunky off-road tires and a dented hood. Frame the vehicle from a dramatic low three-quarter front angle as it rockets along a cracked desert highway. The Squig is clearly visible through the open side window, gripping the wheel, with the exact three-eyed face fully readable. A towering stylized dust plume follows the rear tires; orange sparks scrape from the chassis and scattered highway debris flies past. Background: broken guardrails, sun-bleached mesas and an abandoned overpass, warm late-afternoon light. The scene should feel fast, dangerous and ridiculously cool, without covering the character."
  ],
  [
    "Highway Carnage",
    "Use two uploaded Squig references as TWO distinct drivers, each visible in a separate vehicle. Stage a side-by-side collision between a battered armored coupe and a low racing buggy on a ruined elevated freeway. Their reinforced doors collide in a burst of illustrated orange sparks; a tire lifts off the road and small chunks of painted metal scatter through the air. Capture the exact instant of impact from a dynamic low side angle, keeping BOTH recognizable three-eyed faces unobstructed in their windows. A broken city skyline and smashed concrete barriers recede into the distance. No gore; the spectacle is vehicular chaos."
  ],
  [
    "Monster Mayhem",
    "One reference Squig pilots an absurdly oversized monster truck with enormous deep-tread tires, exposed suspension springs, improvised welded armor and a tiny cab that makes the truck look comically gigantic. Show the truck airborne over a stack of abandoned wrecked race cars inside a dusty wasteland arena. The Squig leans forward in the open cab, eyes and face clearly recognizable, thrilled by the jump. Underneath: illustrated orange flames, curling smoke and tumbling hubcaps. Use an extreme low-angle hero composition with the truck silhouetted against a golden sky. Keep the Squig's actual head and accessories unchanged."
  ],
  [
    "Midnight Massacre",
    "Show one or more reference Squigs in a convoy of customized death-race vehicles charging through a deserted rain-soaked city at midnight. Primary Squig rides in the leading car, clearly visible through the open driver's window; any additional referenced Squigs remain individually recognizable in nearby vehicles. The scene is entirely 2D cartoon art: broad illustrated pools of purple and teal neon reflections on wet asphalt, sharp headlight beams, bold inked building silhouettes, stylized spray from tires, smoke and flying sparks. Dramatic street-level tracking shot, strong focal point on the leading character. No readable neon signs."
  ],
  [
    "Dust to Dust",
    "A massive wall of sand is swallowing a convoy of scrap-built racing vehicles in a wasteland. In the foreground, one reference Squig drives an open-cockpit dune buggy with a welded roll cage, battered fenders and thick knobby tires. The character's exact face and all three eyes are completely visible above the dashboard; the buggy skids sideways while the driver fights the wheel. Behind them, silhouettes of distant racers vanish into layered illustrated ochre dust clouds. Use sweeping diagonal composition, bright rim light and bold flat-color sand shapes rather than realistic particles."
  ],
  [
    "Scrapyard Sprint",
    "One reference Squig power-slides a compact armored rally car through a canyon of stacked crushed vehicles in an enormous industrial scrapyard. A giant overhead magnetic crane swings a mangled car across the roadway just behind the racer. Show the Squig clearly through an open window, with unchanged eye count, face, hair and clothing. Tires leave thick illustrated skid marks, sparks trail from a scraping bumper, loose nuts and panels tumble in the foreground. Draw the scrapyard with bold cartoon geometry, thick outlines and rich rust-orange, steel-blue and dusty-yellow colors. Freeze the scene at the most dramatic near miss."
  ],
  [
    "Bridge of Doom",
    "Two recognizable reference Squigs race in separate customized vehicles across a suspension bridge collapsing over a vast canyon. In the foreground, the leading Squig drives an open-top armored roadster; behind, another Squig drives a rugged buggy. Both faces must be identifiable and consistent with their own reference images. Bridge cables snap, roadway slabs tilt and chunks of concrete fall into the gorge. Capture a dramatic diagonal square-framed shot with a clear sense of depth and danger, illustrated dust and sparks, strong sunset colors and clean bold Squigs-style outlines. Keep the vehicles and drivers visually separated."
  ],
  [
    "Fuel and Fury",
    "A chaotic death-race pit stop at a derelict roadside fuel depot. One reference Squig stands beside a customized armored car, hurriedly pouring fuel from a battered jerrycan while another referenced Squig, if provided, leans from the driver window keeping watch. Preserve exact outfits and accessories from the references; do not replace them with racing uniforms. In the background, rival vehicles speed past, kicking up cartoon dust and a distant stylized explosion blooms behind a concrete barrier. The main character(s) are large and readable in the foreground. Bright high-contrast 2D illustration with clear shapes, expressive tension and dark clean outlines. No readable pump labels."
  ],
  [
    "Tunnel Vision",
    "A reference Squig races an open-cockpit armored buggy through a crumbling mountain tunnel, narrowly avoiding a shower of sparks from a collapsing overhead light fixture. Three-quarter front camera angle close enough to clearly see the character's precise three-eye face, ears and original clothing. Headlights carve bold graphic beams through illustrated darkness, the tires kick up stone fragments, and warm orange sparks contrast with cool blue shadows. The tunnel curves dramatically into the distance with other race cars only as tiny silhouettes. Entire scene is flat-color 2D cartoon artwork, not a photorealistic tunnel."
  ],
  [
    "Last Stand",
    "One reference Squig drives a battered but still moving death-race muscle car down the final stretch of a ruined highway. The car has cracked armor, a bent bumper, one smoking exhaust and scratched paint, but the character is triumphant and clearly visible through the open window with exact original eyes, proportions and accessories. A towering illustrated cloud of smoke and scattered wrecks frame the road behind. Ahead, a dramatic arch-shaped finish structure made from scrap steel, with NO lettering or logos. Heroic low frontal three-quarter angle, sunset rays, crisp inked shapes, warm highlights and bold cinematic 2D Squigs cartoon finish."
  ],
  [
    "Mountain Madness",
    "One or two referenced Squigs pilot separate off-road race buggies along a dangerously narrow switchback road carved into a towering mountain canyon. The lead buggy is airborne over a broken section of road, its driver clearly visible in the open cockpit, with exact three-eye identity intact. A second vehicle slides around the bend behind, spraying illustrated gravel. Show enormous depth to the canyon using layered flat-color cliffs and bold outlines, with bright alpine sky, dramatic foreshortening and dynamic diagonal motion. No helmets covering faces, no redesign of the characters."
  ],
  [
    "Industrial Inferno",
    "One reference Squig drives a low armored racing car through an abandoned industrial foundry converted into a lethal racecourse. Huge mechanical wrecking balls swing across the track; one misses the car by inches as molten-orange sparks shower from a nearby steel structure. The Squig's head is fully visible through the side window and unmistakably matches the reference. Massive pipes, smokestacks and suspended chains frame the action in graphic flat-color shapes, with deep charcoal, rusty red and orange highlights. Use a square low-angle cinematic composition with dramatic speed, polished thick outlines and absolutely no realistic 3D textures."
  ]
];
const PROMPTS = Object.freeze(scenes.map(([title, scene], index) => Object.freeze({
  id: "death-race-" + String(index + 1).padStart(2, "0"),
  title,
  prompt: [IDENTITY_LOCK, ART_STYLE, "SCENE: " + scene, COMPOSITION].join("\n\n"),
})));
module.exports = { ERA_KEY, IDENTITY_LOCK, ART_STYLE, COMPOSITION, PROMPTS };
