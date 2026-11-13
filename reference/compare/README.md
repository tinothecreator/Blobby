# M2 level-1 comparison

Only the level layout and puzzle order are reused. The reference image in this directory is inspection evidence, never a game texture. Vite denies access to `reference/` and the original binaries/video. The browser build imports no reference images, original art, audio, names or titles.

## Preflight before implementation — 2026-11-13

- **OBSERVED:** Inspected root `gameplay.mp4` at 32–60 s using a new 2 fps contact sheet (`/tmp/m2-level1-contact.jpg`), alongside the existing `reference/frames/sample_0065.jpg` (32 s), `sample_0068.jpg` (33.5 s), `sample_0090.jpg` (44.5 s) and `sample_0097.jpg` (48 s). The expected `reference/gameplay.mp4` is absent; the root recording was used unchanged.
- **OBSERVED:** The M1 JSON's 23 supports reproduce the visible path, its gaps, the spawn switch and the portal. Source coordinates normalize as `x = X - 0.5`, `z = Z - 0.5`; the source gameplay transforms audited in M1 are identity. Spawn is `(0,0)`, heading 0 (`+Z`, upper-left in this view); portal is `(-2,2)`. The 32 s intro shows the actor on the switch, and 33.5 s shows it one step forward at `(0,1)`.
- **OBSERVED:** The solver's forward route is `(0,0) → (0,2) → (1,2) → (1,3) → (3,3) → (3,0) → (2,0) → (2,-2) → (0,-2) → (0,-3) → (-2,-3) → (-2,2)`, including every intervening support. This is the recorded route: the early inner bends lead to the upper path; the actor is at `(1,2)` around 44.5 s and `(3,0)` around 48 s, then traverses the right/lower bends and the straight final path to the portal before the level-2 intro around 59.5 s. No route, layout, spawn-heading or portal mismatch was found.
- **OBSERVED:** `npm run solve:levels` returns 32 minimum accepted actions, 22 forward steps and 10 turns, exploring 86 states. The recording contains no input log: matching the route does not establish an exact original key sequence, blocked-key attempts or timings. The browser witness is replayed through the unchanged pure rules.

## Images and intentional presentation differences

Compare [build-33.5s.png](build-33.5s.png) with [reference-33.5s.jpg](reference-33.5s.jpg), copied unchanged from `sample_0068.jpg`. Both are 1364×762 and show the actor one step forward from spawn, facing upper-left. [build-win.png](build-win.png) records browser completion.

- **OBSERVED:** Support topology, the switch cell, actor cell/facing and exit cell agree. Fixed parallel projection approximates the reference framing; tile thickness, diamond dimensions and pixel positions differ slightly from the original perspective camera and irregular stone meshes.
- **ASSUMED presentation:** Flat bevelled diamonds replace stone art; a faceted cyan marker and white arrow replace the character; a gold outlined doorway and pale ellipse replace the portal. These geometric drawing commands were authored in `src/view/board.ts` for this project. No external asset or original texture was used. CSS, text and animation code are also original project code; there is no shipped audio.
- **ASSUMED presentation:** A plain dark background, replacement title and keyboard instructions replace the original cloudy void, floating tutorial signs and colour-wheel HUD. The F1 overlay alone exposes internal counters. No source names/titles appear in the shipped presentation.
- **ASSUMED timing/input policy:** 180 ms step, 140 ms turn and 420 ms terminal animation extension. The first edge arriving during animation occupies the single queue slot; additional edges are discarded. OS repeats are ignored. Pause or focus loss cancels the visual transition to its already committed logical state and flushes the queue; undo/restart restore pure snapshots. These are M2 presentation/input choices, not newly inferred puzzle rules.
- **OBSERVED limitation:** Level 1 contains no disappearing coloured support and cannot fall. The fall browser test substitutes a validated synthetic JSON module in the test browser only, then verifies the same scene's fall animation and undo/restart. No synthetic level is shipped.

## Verification evidence

The final `playwright-results.json` records the browser test outcomes. `browser-evidence.json` records the actual Chromium version, viewport and renderer (`2` = WebGL). `recovery-evidence.json` records object/listener counts before and after recovery cycles and scene recreation. PLAN.md records the final commands and results; incomplete or failed runs do not count as milestone proof.
