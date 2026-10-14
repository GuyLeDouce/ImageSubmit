"use strict";

// Self-contained, composition-first prompts. Keep IDs and the era key stable.
const ERA_KEY = "death_race";
const IDENTITY_LOCK = "IDENTITY: Reference art alone defines colour and character design. Copy exact head silhouette, skin, ears, hair, outfit patterns and accessories on their original sides. Preserve exact eye COUNT, shapes, placement, pupils and colours; show every eye. Keep inherited text/graphics, never mirrored. Change posture or the existing mouth only as specified; no invented features or teeth.";
const ART_STYLE = "ART: Clean original Squigs Reloaded flat 2D throughout: thick crisp dark outlines, smooth colour blocks, minimal cel shadows. Same style for vehicles and scenery. No metallic gradients, rivet clutter, gritty texture, CGI or realism.";
const RACE_TONE = "STAKES: LAST RACER ALIVE WINS. Dark adult humour, vicious competition and spectacular mechanical destruction. No gore.";
const VEHICLE_RULES = "Palette follows its own Squig. Join nose, cockpit and rear on one chassis. Keep reference proportions and a cockpit that fits; never enlarge the head or shrink the car. Driver SEATED INSIDE, natural hands or original gloves on the steering wheel except specified gestures. Weapons sit behind the head or below the face; eyes and front outfit graphics stay clear. No added helmets or goggles.";
const COMPOSITION = "SQUARE 1:1, one frozen instant. Full vehicle silhouettes, wheels, weapons and drivers stay inside the frame. Leave margins and background beyond the cars; overlap only where the action requires it.";
const WHEEL_RULES = "TWO axles, FOUR attached wheels per racer; front/rear pairs separated along the chassis, far wheels naturally occluded. No central bumper wheel, third axle or floating wheel.";
const FINISH = "FINISH: Sparse scenery, clear silhouettes, effects at their source. No extra characters, props, signs, captions, speech bubbles, watermarks or measurement labels; title is not image text.";

const singleScenes = [
  {
    "title": "Full Throttle",
    "camera": "Wide front-side three-quarter view from beside the far canyon rim, high enough to see into the cockpit. Dirt takeoff ramp at IMAGE-LEFT, landing shelf at IMAGE-RIGHT, open canyon beneath the complete side of the car.",
    "action": "The racer soars left-to-right across the canyon. Its nose points slightly down toward the landing; front tires are still short of the far lip with empty air below them. Rear wheels hang on extended suspension. Two exhaust flames stream BACK toward image-left from the rear pipes. A compact dust burst stays on the distant ramp, not under the airborne wheels. The jump has not landed.",
    "build": "Low, wide armored muscle racer with a wedge ram, chunky tires, exposed supercharger below the sight line and twin rear exhausts. Ochre cliffs and a pale sky make its reference-derived paint easy to read.",
    "acting": "Shoulders loose, chin up, both hands casually steering: absurd zero-fucks confidence halfway through a jump that may be too short. Preserve the reference face."
  },
  {
    "title": "The Wrecking Ball",
    "camera": "Wide elevated front-side view from beyond the barricade. Car travels IMAGE-LEFT to IMAGE-RIGHT; keep its full side visible through a car-width breach, with empty roadway continuing to the right.",
    "action": "Freeze the ram punching through the concrete barricade at full speed. The front axle has passed the wall; the rear axle is just entering the opening. Front suspension compresses over a broken slab. Five or six large concrete chunks fly forward and outward from the impact; one heavy top section tips down just behind the cockpit. Keep the face and intact rear silhouette clear. Concrete dust trails left through the breach.",
    "build": "Squat armored demolition pickup with a broad plough ram, reinforced cab and one short cannon behind the seat. Pale concrete, muted asphalt and a simple distant wall keep the impact legible.",
    "acting": "Lean forward with elbows braced and both hands clamped to the wheel, visibly furious at the barricade for existing. The wildly excessive response is the joke."
  },
  {
    "title": "Death From Above",
    "camera": "Wide three-quarter view from beside the drop, slightly above cockpit level. Broken parking-garage roof at upper IMAGE-LEFT; racer dives nose-first toward lower IMAGE-RIGHT. Show the racetrack far below and clear air between roof, car and road.",
    "action": "The entire car has left the collapsing roof. Its nose pitches steeply down, rear end high, all wheels unsupported with suspension extended. Two broad floor slabs fall behind the tail; a torn edge on the roof marks the launch point. The road below is still a frightening distance from the front ram. Dust remains near the collapsing garage; no tire tracks in midair.",
    "build": "Heavy armored coupe with a pointed battering ram, long reinforced chassis and low exposed front engine. Open cockpit and low hood reveal the Squig despite the steep pitch. Use simple grey garage masses against a clear sky.",
    "acting": "Torso pressed back into the seat, arms rigid, original mouth slightly open: the exact oh-shit moment a clever shortcut becomes a death drop. No invented teeth.",
    "vertical": true
  },
  {
    "title": "The Flame Tunnel",
    "camera": "Wide front-side view from outside and beside the tunnel exit. Tunnel mouth occupies IMAGE-LEFT; the complete hot rod points IMAGE-RIGHT with a clear stretch of daylight road beyond its nose.",
    "action": "The racer bursts out of a tunnel engulfed in fire. Front tires are firmly on the road outside; rear tires have just cleared the threshold. A broad orange flame mass fills the arch behind it, with smaller tongues dragged left from the scorched rear panels. Tire smoke trails behind the rear wheels. A falling piece of tunnel lining strikes the road inches behind the rear bumper. Leave the cockpit in a clean pocket of daylight.",
    "build": "Long armored hot rod with a saw-tooth ram, heat-scorched side plates, open side window and exhaust stacks behind the cab. Flat orange fire contrasts with cool grey road and tunnel stone.",
    "acting": "Squig grips the wheel with hunched shoulders and a stubborn forward lean, refusing to acknowledge that the entire shortcut is on fire. Keep the reference features intact."
  },
  {
    "title": "Wrong Turn",
    "camera": "Wide elevated driver-side three-quarter view. Solid track fills IMAGE-LEFT; a sheer canyon opens at IMAGE-RIGHT. Show the whole car balanced across the cliff lip, with safe reverse space behind its tail.",
    "action": "The car points right but is trying to REVERSE LEFT. Both front wheels and the nose hang over empty air; the belly plate rests on the broken edge. Both rear tires remain on the track, spinning backward and throwing dirt toward the cliff. A crack opens under the rear contact patch as small stones drop below the front axle. Keep the pivot point, grounded rear wheels and unsupported front half distinct.",
    "build": "Front-heavy armored war wagon with a square ram, oversized engine and huge rear tires. The frame stays connected from ram to rear bumper. Use one broad canyon wall and a sparse, dusty track.",
    "acting": "One shoulder twists toward the safe road while both hands wrestle the wheel; keep the face at a readable three-quarter angle. Offended panic, as if flooring it backward should make gravity fuck off."
  },
  {
    "title": "Scrapyard Launch",
    "camera": "Wide front-side view just ahead of a ramp made from crushed cars. Scrap pile rises from lower IMAGE-LEFT; racer launches diagonally toward upper IMAGE-RIGHT. Keep sky around the whole vehicle and a visible landing lane beyond the pile.",
    "action": "All four tires have just cleared the highest crushed roof. Nose pitches slightly up, suspension stretches down, rear tires skim a jagged steel beam at the ramp crest by inches. Three chunky fragments and a small dust burst stay behind at takeoff; the vehicle remains complete. Show a continuous climb up the scrap pile leading to the airborne car. Every crushed car is EMPTY.",
    "build": "Compact armored rally buggy with long-travel suspension, a spiked nose and one low rear-mounted cannon. Keep the pile to a few large flattened vehicle shapes; no loose wheels floating around the racer.",
    "acting": "Lean into the jump with cocky enthusiasm, both hands on the wheel, utterly pleased with this terrible fucking idea. Preserve the original mouth and eye shapes."
  },
  {
    "title": "Road Rage",
    "camera": "Wide front-side view from the driver's window side, above road level. The hairpin curves toward upper IMAGE-RIGHT; the outside verge and drop sit at lower IMAGE-LEFT. Include the full car, raised hand and road exiting beyond the nose.",
    "action": "The racer drifts into the bend: nose aims toward the upper-right exit while the rear swings outward toward the lower-left verge. Front tires visibly countersteer toward the outside of the bend. Two curved skid marks and one rear-tire smoke plume trail left along the approach. The outside rear tire runs inches from the drop. Keep the escape route visible and the drift direction unambiguous.",
    "build": "Low armored sports racer with a broad front ram, side-impact bars, a low supercharger and one weapon behind the cabin. Simple dark asphalt and a bare rock wall frame the bend.",
    "acting": "Squig leans their upper torso out the open window, hips still seated. One hand steers; the other shows ONE clear middle finger, remaining fingers curled normally. Open only the existing mouth for the furious yell; no new teeth. Too busy being an asshole to notice the edge."
  },
  {
    "title": "The Last Second Escape",
    "camera": "Wide elevated front-side view along the bridge. Racer points IMAGE-RIGHT toward solid road; the collapsing span recedes to IMAGE-LEFT. Show the entire pickup and the exact strip of deck immediately behind its rear tires.",
    "action": "The racer floors it across the last intact bridge section. All tires still contact the surviving deck; the next slab behind the rear tires is peeling downward just inches from their contact patches. Successive broken slabs fall away to the left into the canyon. The road ahead remains continuous to the far bank. A snapped cable hangs below the bridge, never across the Squig. Freeze the collapse chasing the vehicle, before it catches the rear axle.",
    "build": "Heavy armored pickup with a reinforced rear axle, flat battering ram and rear-facing exhausts. Use a single dusty bridge, broad canyon shapes and clean sky; dust trails left over the falling deck.",
    "acting": "Hunch over the wheel, elbows out, hands locked. Every part of the posture insists that more throttle can bully several tonnes of metal out of this disaster."
  },
  {
    "title": "Monster Engine",
    "camera": "Wide driver-side three-quarter view, slightly above the open cockpit. Car rears diagonally from lower IMAGE-LEFT toward upper IMAGE-RIGHT. Include both grounded rear tires, both raised front wheels and empty road extending ahead to the right.",
    "action": "The monstrous engine has pulled the car into an enormous wheelie. The whole front axle towers above the road while the rear tires remain planted, flattened at their contact patches. A bent rear skid shoe scrapes a short fan of sparks behind the car; it has no extra wheel. Two exhaust flames shoot backward toward image-left. Freeze the chassis near its tipping point, before it rolls onto its back.",
    "build": "Stretched armored drag hot rod with a ridiculous low-mounted supercharger, narrow front wheels, huge rear slicks and reinforced side rails. Keep the engine forward of the visible face. Bare asphalt and a simple low horizon establish the pitch.",
    "acting": "Squig folds forward over the wheel with straight, strained arms, trying to pull the front end down by sheer panic. The machine is far too powerful for its smug little owner.",
    "vertical": true
  },
  {
    "title": "Out of Control",
    "camera": "Wide elevated three-quarter view over an empty intersection. The car slides toward IMAGE-RIGHT while its nose rotates toward upper IMAGE-LEFT. One large explosive barrel stands at lower-right, just outside the rear quarter's sweeping path.",
    "action": "Freeze a violent sideways spin. Curved skid marks show the approach from image-left and the rear end swinging toward the barrel. Tread peels from the near rear tire in one long rubber strip; its wheel rim stays attached and scrapes sparks off the road. The rear armor misses the barrel by inches. Keep a clear gap between metal and barrel: it remains upright and has NOT exploded. Tire smoke trails along the path already travelled.",
    "build": "Battered armored pursuit car with a wedge ram, reinforced doors and one short hood-mounted weapon below the face. All four wheel rims remain attached; tire rubber alone is shredding. Muted empty city blocks frame the crossing.",
    "acting": "Shoulders up around the ears, both hands clamped to the wheel, body recoiling from the barrel. Silent, total awareness of how thoroughly they have fucked up."
  },
  {
    "title": "The Death Drop",
    "camera": "Wide three-quarter view from beside the mountainside, with a LEVEL distant valley horizon. The actual slope plunges about 75 degrees from upper IMAGE-LEFT to lower IMAGE-RIGHT. Keep the full racer visible and show the tiny road far below its nose.",
    "action": "The armored racer hurtles nose-first down the nearly vertical rock face. Front tires skim a narrow stone shelf; rear tires barely brush the slope as the rear suspension unloads. The front skid plate is a hand's width from catching the shelf and pitching the vehicle into a tumble. One gigantic, simple dust mass trails UP the slope behind the rear tires toward image-left. Leave clear rock and air around the face and leading wheels.",
    "build": "Short assault buggy with heavy side armor, a deep front skid plate, chunky off-road tires and two compact weapon pods below the cockpit. Broad ochre mountain shapes and a cool distant valley establish the scale.",
    "acting": "Brace hard into the seat with both hands hauling on the wheel. Rigid, furious disbelief: the vehicle was built to fight an army and is being beaten by a fucking hill.",
    "vertical": true
  },
  {
    "title": "Victory or Death",
    "camera": "Wide front-side view from beside a painted checkered finish stripe. Car travels IMAGE-LEFT to IMAGE-RIGHT; show its full battered length, the missing near-front wheel and open track beyond the finish.",
    "action": "The front ram crosses the finish line as the exposed near-front hub grinds along it, spraying sparks backward. The other three wheels keep the bent chassis moving. Torn side plates, a sagging rear suspension and a dragging exhaust show total mechanical ruin. The exposed front engine burns; flames and smoke stream left below the face. Freeze the impossible last few feet of forward motion before the whole wreck falls apart.",
    "build": "Once-massive armored muscle racer, still recognizable by its reference-derived paint, wedge ram and connected rear body. Use the checkered stripe ON the road, with no finish arch, trophy or extra props.",
    "acting": "Squig slumps in the seat, chin raised, steering with one hand and giving a defiant middle finger with the other. Exhausted bastard energy: if it is still moving, it still counts.",
    "wheels": "TWO axles but exactly THREE attached wheels. The camera-side FRONT wheel is missing, leaving its bare hub scraping the road; far-front and both rear wheels remain. No replacement wheel, loose tire or third axle."
  }
];

const doubleScenes = [
  {
    "title": "Jump or Die",
    "camera": "Wide elevated side three-quarter view. Both racers point IMAGE-RIGHT: Squig 1 is airborne above and slightly ahead at upper-right; Squig 2 stays on the road below-left. Separate both cockpits against clear background and show the landing route to the right.",
    "action": "Squig 1 jumps over Squig 2 just as the lower vehicle's rear engine explodes. The airborne car's rear tire clears the lower car's rear-mounted weapon by inches. One broad fireball expands behind Squig 2's cockpit, throwing three large pieces of rear armor backward toward image-left. Keep the lower chassis and all wheel positions legible through the first instant of the blast. Squig 1 has not landed.",
    "build": "Squig 1: low wedge-nosed armored hot rod with long-travel suspension. Squig 2: tall armored war truck with a rear engine and short rear cannon. A small dirt takeoff lip at far left and bare track establish the jump.",
    "acting": "Squig 1 gives a premature middle finger down toward Squig 2, other hand steering. Squig 2 recoils at the wheel in furious disbelief. Keep gestures separate from both faces."
  },
  {
    "title": "Head-On Collision",
    "camera": "Wide elevated oblique SIDE view across a straight track. Squig 1 occupies IMAGE-LEFT facing RIGHT; Squig 2 occupies IMAGE-RIGHT facing LEFT. Show both full side lengths, open cockpits and the narrow empty strip between opposing front rams.",
    "action": "Both cars charge straight toward each other at full speed. Freeze them one tire-width apart, front rams aligned for a devastating head-on collision. Both front axles track straight; neither vehicle has swerved or made contact. Rear dust and exhaust trail OUTWARD toward opposite frame edges, away from the central gap. Clear road continues behind each car. No impact burst before the collision.",
    "build": "Squig 1: low armored interceptor with a spear-shaped ram. Squig 2: broad armored coupe with a blunt plough and reinforced front plate. Keep low hoods and open cockpits so both reference faces read from the camera-facing side. Sparse concrete track walls stay below the drivers.",
    "acting": "Both lean forward with rigid arms and stubbornly planted shoulders. Mutual, spiteful refusal to blink: two idiots choosing to become the same pile of scrap."
  },
  {
    "title": "Side Swipe",
    "camera": "Wide elevated front-side view, both cars travelling IMAGE-LEFT to IMAGE-RIGHT. Squig 1 fills the near lane at lower-centre; Squig 2 is in the far lane above it beside a LOW concrete wall. Offset Squig 2 slightly ahead to expose both cockpits.",
    "action": "Squig 1's far-side ram drives into Squig 2's near-side door armor, pushing the second car sideways against the wall. Squig 2's far-side panels grind along concrete while its wall-side front wheel twists backward but stays attached. Two tight spark fans mark car-to-car and car-to-wall contact, trailing left. Keep the wall below the window line, both noses pointing right and the road ahead visible.",
    "build": "Squig 1: wide armored muscle racer with a heavy door-height side ram below its own window. Squig 2: narrow combat coupe with broad side plates and exposed front wheels. Simple grey wall and dark asphalt make the two separate paint schemes stand out.",
    "acting": "Squig 1 sits offensively relaxed, one shoulder dropped. Squig 2 leans away from the wall and fights the wheel with both hands. Casual cruelty versus absolute fury."
  },
  {
    "title": "Bridge Battle",
    "camera": "Wide elevated three-quarter view across the SIDE of a narrow bridge, running IMAGE-LEFT to IMAGE-RIGHT. Near span at left, central gap, landing span at right. Squig 1 jumps ahead at upper-right; Squig 2 hangs off the near span at lower-left. Keep both cockpits separate.",
    "action": "Squig 1 flies across the broken span with its front tires just short of the far landing lip and clear air beneath the chassis. Behind, Squig 2 has slipped sideways over the foreground edge: far-side tires still grip the deck, near-side tires hang over the canyon. One bent guardrail supports the hanging side and is pulling free. Three falling slabs establish the collapse. Both noses point generally right; the two escape problems must read separately.",
    "build": "Squig 1: compact armored rally racer with a low ram and rear cannon. Squig 2: heavier, top-heavy armored wagon with a huge engine and blunt ram. Simplify the bridge to deck, rail and broken edges above broad canyon shapes.",
    "acting": "Squig 1 braces for the landing with both hands steering. Squig 2 leans desperately toward the remaining deck while hauling the wheel. One bridge, two ways to become a fucking statistic."
  },
  {
    "title": "The Pit Maneuver",
    "camera": "Wide elevated front-side view. Both cars approached from IMAGE-LEFT toward IMAGE-RIGHT. Squig 1 is behind in the near lane at lower-left; Squig 2 is ahead at centre-right. A single scrap heap sits beyond the foreground verge at lower-right, with room to see the spin path.",
    "action": "Squig 1's far-front ram corner clips Squig 2's near-side REAR quarter behind the axle. The strike pushes Squig 2's tail toward the background while its nose rotates toward the foreground scrap heap. Curved skid marks trace that rotation; tire smoke follows the rear wheels, not the nose. Freeze before the leading tire hits a jutting beam, leaving a visible escape gap. Keep the initial rear-quarter contact distinct from the approaching scrap.",
    "build": "Squig 1: long, low armored interceptor with a square front ram. Squig 2: short-wheelbase armored buggy with a high rear engine. The heap consists of three or four large empty metal shells, not scattered tiny parts.",
    "acting": "Squig 1 stays smugly composed at the wheel. Squig 2 twists against the spin with shoulders raised and both hands straining. A lazy little nudge with spectacularly nasty consequences."
  },
  {
    "title": "Airborne Assault",
    "camera": "Wide elevated side three-quarter view. The SAME massive ramp recedes at IMAGE-LEFT; both cars fly toward IMAGE-RIGHT with landing track beyond them. Squig 1 is above and slightly behind Squig 2, offset just enough in depth to reveal both cockpits.",
    "action": "Squig 1 descends from the higher arc and lands its front tires on Squig 2's rear deck, BEHIND the lower driver's seat. Capture first contact: upper front suspension compresses, lower rear armor buckles down, lower nose kicks up. The upper rear wheels still hang in the air. One tight burst of sparks and two bent plates mark the tire-to-deck impact. Preserve two separate chassis and a clear outline around each driver.",
    "build": "Squig 1: heavy armored monster racer with huge tires and a blunt ram. Squig 2: low, long armored hot rod with a reinforced rear deck and open cockpit forward of the contact point. Dust stays at the distant ramp; sky separates the silhouettes.",
    "acting": "Squig 1 leans into the landing with vicious enthusiasm. Squig 2 recoils while gripping the wheel, existing mouth open in outraged disbelief. Their entire vehicle has become somebody's fucking landing pad."
  },
  {
    "title": "The Flamethrower",
    "camera": "Wide elevated front-side view, both vehicles moving IMAGE-LEFT to IMAGE-RIGHT. Squig 1's truck is behind at lower-left; Squig 2's buggy is ahead at upper-right beside the outer track edge. Keep the nozzle, flame path, escape gap and both faces visible.",
    "action": "A single massive flame jet runs from Squig 1's front-mounted nozzle toward Squig 2's rear quarter. The nozzle visibly connects to the weapon; flame does not originate from the mouth or engine. Squig 2 swerves toward the far verge, front wheels turned into the escape while its rear tire misses the jet by inches. The far-front tire reaches the crumbling edge. Keep the flame BELOW both faces, with clear air separating it from the buggy.",
    "build": "Squig 1: broad armored truck with one low forward-facing flamethrower. Squig 2: fast open-cockpit armored buggy with oversized rear tires. Sparse burnt-orange terrain and cool grey road frame one clean flame shape.",
    "acting": "Squig 1 leans forward in gleeful commitment. Squig 2 hunches away from the heat and yanks the wheel with both hands. The only choices seem to be getting roasted or driving off the damn track."
  },
  {
    "title": "Wrong Way, Asshole!",
    "camera": "Wide elevated oblique side view. Squig 1 is at IMAGE-LEFT driving RIGHT; Squig 2 is at IMAGE-RIGHT driving LEFT. One painted road arrow points LEFT. A low barrier borders the foreground; keep a visible escape channel beside Squig 1.",
    "action": "Squig 1 charges against the arrow straight toward Squig 2. Freeze the opposing front rams inches apart as Squig 2 brakes into a swerve toward the foreground escape channel, nose angling lower-left and rear sliding right. Curved skid marks and smoke trail behind Squig 2 toward image-right. Squig 1 remains straight. The arrow makes the wrong-way driver unmistakable without a sign or caption.",
    "build": "Squig 1: blunt armored ram truck with a low heavy engine. Squig 2: sharp-nosed armored sports racer with reinforced doors. Open cockpits and a low barrier expose both faces; simple asphalt markings carry the route information.",
    "acting": "Squig 1 angrily gives Squig 2 the middle finger while steering one-handed, convinced everyone else is the problem. Squig 2 looks terrified: shoulders high, body recoiling, both hands locked to the wheel. Preserve eye anatomy."
  },
  {
    "title": "The Scrap Crusher",
    "camera": "Wide elevated side three-quarter view along an industrial exit lane. Crusher at IMAGE-LEFT, clear road at RIGHT. Squig 1 is fully outside ahead-right; Squig 2 follows with its rear trapped in the opening. Expose both cockpits and the jaws' contact with the second car.",
    "action": "Two horizontal metal jaws close vertically from ABOVE and BELOW. They catch Squig 2's rear axle and engine bay while its front wheels and entire cockpit project beyond their right-hand edge. Rear armor folds inward, both rear tires flatten and the nose lifts. The upper jaw stops inches behind the seat. Squig 1 accelerates clear toward image-right. Sparks stay at the crushed rear; the driver's body remains unharmed and visible.",
    "build": "Squig 1: short, low armored wedge racer. Squig 2: long armored hot rod with a bulky rear engine that could not clear the jaws in time. Show one simple crusher frame and two solid jaws, with no machinery clutter.",
    "acting": "Squig 1 throws a backward middle finger, other hand steering. Squig 2 strains forward at the wheel in desperate panic, still trying to drive the trapped car out.",
    "wheels": "TWO axles and FOUR attached wheels on each car. Squig 2's rear pair is visibly crushed in place; its front pair remains round beyond the jaws. Far wheels may be naturally occluded. No loose wheels, third axles or merged chassis."
  },
  {
    "title": "The Great Escape",
    "camera": "Wide elevated front-side view across the track, both cars travelling IMAGE-LEFT to IMAGE-RIGHT. Squig 1 is airborne ahead at upper-right; Squig 2 drives through the blast behind at lower-left. Show landing space ahead and separate the two cockpit silhouettes.",
    "action": "ONE massive explosion fills the middle of the track. Squig 1 jumps over its upper edge, all tires clear of the fire and front wheels descending toward the road ahead. Squig 2 drives straight through the SAME fireball at ground level, front half bursting from its right-hand edge while flames surround the rear armor. A low plough deflects one burning metal sheet downward. Keep both faces outside the solid fire shape; three large debris pieces trail behind.",
    "build": "Squig 1: long-travel armored jump buggy with a pointed ram. Squig 2: low, heavy armored muscle racer with a broad front plough. Draw the blast as a bold orange-and-yellow shape against a sparse cool-toned track.",
    "acting": "Squig 1 braces for the landing, hands rigid on the wheel. Squig 2 leans forward with furious determination. One chose a terrible escape route; the other chose the one literally made of fire."
  },
  {
    "title": "Death Race Drag Strip",
    "camera": "Wide elevated front-side view of two parallel lanes running IMAGE-LEFT to IMAGE-RIGHT. Squig 1 is in the near lane, Squig 2 in the far lane; noses exactly level. Keep both complete side lengths and faces visible, with a painted start stripe behind and open track ahead.",
    "action": "Both racers launch together from the line. Enormous rear tires squat under torque and throw two distinct smoke plumes BACK toward image-left. Front suspensions extend, front tires just skimming the asphalt. The cars remain side by side with a dangerously narrow gap between their armored flanks and side rams. Engines roar through vibration in exhaust stacks and tense chassis posture, never sound-effect lettering. This is the first instant of acceleration, not the finish.",
    "build": "Squig 1: squat armored dragster with a massive rear tire pair and a low side ram. Squig 2: taller supercharged armored hot rod with equally huge rear tires and reinforced doors. Keep both engines below the face sight lines. Sparse asphalt and distant low barriers.",
    "acting": "Both hunch over their steering wheels with elbows braced and competitive spite. Even at the start they look ready to wreck each other over a fucking inch."
  },
  {
    "title": "The Final Showdown",
    "camera": "Wide elevated front-side view, both cars racing IMAGE-LEFT to IMAGE-RIGHT toward a painted checkered finish stripe at right. Squig 1 occupies the near lane below; Squig 2 the far lane above beside an unguarded drop. Noses level, both cockpits visible, road beyond the finish in frame.",
    "action": "Squig 1 angles its far-front ram into Squig 2's near-side armor, shoving the second car toward the edge. Squig 2 steers back against the shove while its far-side tires ride the crumbling lip. Sparks trail left from the contact. BOTH exposed engines erupt in flames that stream backward below the drivers' faces. The finish stripe is one wheel-width ahead of the noses; neither has crossed it. Keep the contact, drop and finish separately legible.",
    "build": "Squig 1: battered wide armored muscle racer. Squig 2: narrow ram-nosed armored hot rod. Bent plates, sagging suspension and scorched reference-derived paint show two distinct machines barely holding together.",
    "acting": "Both Squigs brace into their steering wheels with exhausted, vindictive determination. Either could still finish; both would rather take the other bastard down. Leave the outcome unresolved."
  }
];

function makeGroup(id, label, squigCount, instructions, scenes) {
  const prompts = Object.freeze(scenes.map((scene, index) => {
    const framing = squigCount === 2
      ? "Both vehicles together occupy about 75% of canvas width and at most 65% of height. Pull back to fit the action; never miniaturize either car beneath its driver."
      : scene.vertical
        ? "The full racer occupies about 55% of canvas height and no more than 50% of width; pull back to show the steep pitch without cropping."
        : "The full racer occupies about 55% of canvas width and no more than 50% of height. Pull the camera back rather than shortening the car.";
    return Object.freeze({
      id: `death-race-${id}-${String(index + 1).padStart(2, "0")}`,
      title: scene.title,
      squigCount,
      prompt: [
        "SQUIGWRECK — " + scene.title.toUpperCase(),
        "Use case: illustration-story. Battle-ready Squigwreck armored death racers.",
        "COMPOSITION FIRST: " + scene.camera + " " + framing + " " + COMPOSITION,
        "SCENE: " + scene.action,
        "VEHICLE: " + scene.build + " " + VEHICLE_RULES + " " + (scene.wheels || WHEEL_RULES),
        "ATTACHMENTS — " + label + ": " + instructions,
        IDENTITY_LOCK,
        "ACTING: " + scene.acting + " " + RACE_TONE,
        ART_STYLE,
        FINISH,
      ].join("\n\n"),
    });
  }));
  return Object.freeze({ id, label, squigCount, instructions, prompts });
}

const PROMPT_GROUPS = Object.freeze([
  makeGroup("solo", "1 Squig Attached", 1, "Use exactly ONE Squig driving ONE vehicle. Image 1 is the ONLY character reference. Any background wrecks are empty.", singleScenes),
  makeGroup("duo", "2 Squigs Attached", 2, "Squig 1 is the FIRST attachment; Squig 2 is the SECOND. Show exactly TWO Squigs in separate vehicles. Keep each identity, vehicle palette and scene role distinct; never swap or blend them.", doubleScenes),
]);
const PROMPTS = Object.freeze(PROMPT_GROUPS.flatMap((group) => group.prompts));

module.exports = { ERA_KEY, IDENTITY_LOCK, ART_STYLE, RACE_TONE, VEHICLE_RULES, COMPOSITION, PROMPT_GROUPS, PROMPTS };
