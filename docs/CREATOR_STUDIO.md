# Creator Studio visual refresh

## Intent
Image Factory is a place to make and submit **Squig Survival artwork**, not an AI dashboard. Let actual Squigs artwork be the hero. Use clean flat surfaces, a restrained Squigs colour palette, simple hierarchy, friendly type, and practical interfaces. The personality comes from the characters and the community; avoid decorative signage, random text, fake terminals, unnecessary tilted cards, and noisy textures.

## Implementation
- `public/styles.css` is now one consolidated stylesheet, rather than an older design plus thousands of lines of later visual overrides.
- `views/home.ejs` puts an approved community image up front, with original-ratio display and a fallback when none exists. Era cards link to the existing `/submit?era=...` route.
- `views/submit.ejs` presents an ordered creative process: world, optional milestone/prompts, artwork, optional notes. The same `POST /submit`, CSRF token, multi-image `images` field, era key, milestone key, and 100 $CHARM messaging are preserved.
- `public/studio.js` adds progressive enhancements: milestone descriptions, full-text prompt copy, drag/drop plus preview using local object URLs, and creator-gallery filters. It does not submit anything itself or change backend logic.
- `views/profile.ejs` uses the existing Discord avatar where available, gallery-style thumbnails and local status filters.
- `views/admin.ejs` retains the moderation and repair forms, plus its GIF tool, with cleaner queue navigation and larger image review.
- `views/partials/header.ejs` and `footer.ejs` provide responsive navigation and load one same-origin progressive-enhancement script.

## Visual principles
1. The actual artwork should never be cropped by gallery cards. Use `object-fit: contain` for all artwork previews; avatars can still be cropped.
2. Keep the interface quieter than the artwork. Cream/white surfaces and limited sky, mutant green and Ugly yellow accents are deliberate.
3. Do not infer Squigs need visually chaotic scenes. Preserve their identity and original 2D cartoon look.
4. Use 2-column desktop grids only when they help; stack on small screens. Preserve readable form labels, visible focus, skip link and reduced-motion support.
5. Keep moderation information obvious, so an admin can decide quickly and safely.

## Art-first homepage direction (visual pass 2)

The first redesign was functional and clean, but its huge stacked heading, small era images, repeated action panels and flat pastel surfaces still felt generic. The homepage now has a more distinct Squigs personality without compromising the clean 2D cartoon-art philosophy:

- **Hero:** Dark ink-green stage, very short "MAKE IT. UGLY." headline and a genuinely large approved community image, with no distracting background signs or decorative clip art.
- **Worlds:** Each era gets an illustrated split card. The artwork is significantly larger and stays uncropped, the colours are limited to flat sky blue / warm orange, and the entire card is a clickable era entry.
- **Creator wall:** When there are at least two approved examples, show additional real community creations in a straightforward gallery instead of small decorative thumbnail tiles.
- **Lower page:** Replace repeated boxed instructions, repeated CTAs and a full-page list of rules with one concise three-step rail and accessible expandable creator rules.
- **Source integrity:** Friendly era names replace raw database identifiers such as `death_race` in captions; empty galleries retain an intentional fallback.
- **Responsive:** Desktop hero and split era cards stack thoughtfully on smaller screens; no artwork is cropped simply to fill a card.

When iterating later, **do not solve "needs personality" by adding visual noise**. Squigs' own artwork, confident type, contrast and useful interactive detail should provide the personality.

## Safety and compatibility
No changes to routes, Discord OAuth, sessions, CSRF, PostgreSQL schema, S3/storage, `$CHARM` logic, Gauntlet image insertion, or era identifiers. No frontend frameworks or runtime dependencies were added. Submitted images remain subject to existing validation and the existing 10-file maximum.

## Validation checklist
Run:
```bash
npm ci
npm run test:unit
npm run test:contract
npm run check:mint
```
`npm run test:all` also runs database-backed suites and needs an isolated `TEST_DATABASE_URL`, never production credentials.

Before merging or promoting, manually verify:
- Landing page before and after login, with/without approved sample images.
- Discord login redirects and non-member block.
- Both active eras, Ugly City milestones and all 12 full Squigwreck prompts.
- One-file/multi-file upload preview, file-picker upload and drag/drop, the original CSRF form, the submit-success redirect.
- Image approval, decline, unapprove, edits and GIF export in the admin area.
- Creator profile filters on empty and non-empty archives.
- A 16:9 sample is fully visible on phone and desktop; desktop navigation, mobile menu and keyboard focus all work.

Do not deploy a visual-only design PR by altering environment variables or reconnecting the Gauntlet database.
