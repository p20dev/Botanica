# Product specification — Plant Laboratory v1

## Goal
A functioning botanical breeding sandbox with beautiful **illustrated 2D** assets. This is the first slice of a larger idle plant collection/greenhouse game, not a generic admin UI. Initial interface language English.

## Personas and core flow
1. Visitor opens responsive browser app at `/` and sees a lovely large plant rendered as SVG.
2. They choose species, edit diploid alleles, watch the plant change immediately, select a growth stage and set the cosmetic visual seed.
3. They select two parent plants and request breeding through the API; resulting child genotype and traceable parent IDs are saved by the server.
4. They browse a 100-plant visual gallery with filter by species, pigment, pattern and rarity, open details, inspect ancestry and export JSON/SVG/PNG.
5. At end of MVP, single demo player has local-account-free sandbox persistence; no login. Build ownership into schema for later authenticated accounts. Avoid exposing a destructive global reset in production.

## Pages/screens
- `/lab`: hero live SVG preview (large), genome editor (editable locus/allele pairs), controls for stage, visualSeed, mutation flags, responsive inspector with phenotype and derived rarity.
- `/breed`: two parent pickers (from persisted sample plants), compatibility indicator, breeding button, outcome card, parent links, historic breed events.
- `/gallery`: responsive 2–5 column cards, virtualize or paginate when >100, species/trait/rarity filters, details sheet, download actions.
- `/about`: clear description of educational *fictional game genetics*, not a scientifically accurate botany simulator.
- `/` redirects to `/lab`.

## Visual design
Mood: calm botanical cabinet of curiosities; credible handmade illustration rather than glossy tech dashboard. Canvas warm ivory, forest green controls, restrained terra-cotta, rare colors as accents. Dark mode optional, not prerequisite. Leaves and flowers must have deliberate illustrated shapes (veins, subtle layered shading); avoid simple emoji or generic circles.

Design tokens suggested:
- Background `#F6F3E8`; surface `#FFFCF4`; ink `#20392D`; muted `#6A7C70`.
- Primary `#32684A`; secondary `#B76F52`; borders `#D8DED2`.
- Rarity accents: Common `#78977B`, Uncommon `#4F9D91`, Rare `#5489C6`, Epic `#9366C3`, Legendary `#CB9C39`, Mythic `#C76D87`.
- Use consistent typography (system serif for botanical headings, sans for controls); avoid remote font dependencies.

## Core UX acceptance
- Clear keyboard-focus indication, semantic controls, labels, WCAG AA targets where feasible.
- Mobile 360px width does not overflow. Desktop 1440px has split inspector/gallery composition.
- SVG shapes readable at 64px card and at 500px inspector.
- Select altered allele → phenotype and illustration change without page refresh, for traits with visible manifestations.
- Controls show genotype **and** phenotype separately.
- Show why crossing is blocked if species incompatible.
- Show generated probabilities only if accurate to implemented model; do not imply independent rarity dice rolls.
- Reduced-motion users do not get excessive animations. No external runtime artwork APIs.

## Explicitly out of scope for this handoff
Accounts/auth, inventory purchase/harvest economy, greenhouse automation/timers, social trading, realtime multiplayer, paywalls, AI-generated graphics, crop disease. Add later in separate plan after Laboratory MVP.
