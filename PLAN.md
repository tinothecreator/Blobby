# Blobby — implementation plan

Updated 2026-11-13 · Phase 2 approved for M1 ONLY; stop before M2

## Scope and engine decision

The rule/evidence authority is [SPEC.md](SPEC.md). All architecture, timings, tooling, and acceptance budgets here are proposed (**ASSUMED**) until approved. Read-only findings and completed planning work are marked separately.

- **OBSERVED:** The source is a compiled Unity 2022.3.24f1 game, not an editable Unity project or browser app. At Phase 1 inspection no package manifest or browser engine was installed; M1 now pins tooling in package-lock.json. This does not warrant creating a Unity implementation.
- **ASSUMED decision D-001:** Use the requested default **Phaser 4.2**, **TypeScript with strict checking**, and **Vite**. The board is discrete and its isometric presentation can use 2D tiles/sprites, depth sorting, transforms, and tweened transitions. Phaser owns display, scene lifecycle, input adapters, and sound; deterministic rules remain ordinary TypeScript. Arcade Physics is unnecessary for grid acceptance and would weaken exact undo.
- **ASSUMED:** M1 verified package metadata with `npm view` and pinned Phaser 4.2.1, Vite 8.3.8, Vitest 5.1.0 and TypeScript 5.9.3 (plus Node types 26.6.6). Phaser is installed for M2 but is not imported by the pure core or started in M1. The lockfile records transitive versions.
- **ASSUMED risk:** Original 3D camera rotation and elevated moving/rotating geometry may exceed a simple fixed-isometric renderer. Validate representative late-level transforms before committing to a projection. A change of engine or a material camera compromise requires telling the user and updating the specification transparently.

## Skill routing

**OBSERVED:** Phase 1 loaded only `router`, `game-docs`, `puzzle`, and `phaser-core`, plus the relevant game-docs writing references. Engine detection found Unity reference data and no target project; the user supplied the browser/Phaser preference. The work is a puzzle-reconstruction planning task. Unity implementation, physics, generation, publishing, and website-hosting workflows are not needed for this phase.

Load the following on demand in Phase 2; naming a skill here does not mean it has already been loaded. Keep `game-docs` for requested documentation maintenance and reuse already-read skills without loading unrelated categories.

| Milestone | Skills to use | Purpose |
|---|---|---|
| M1 | puzzle, phaser-core | Pure rules, resolution order, exact undo, solver, engine boundary. |
| M2 | phaser-core, input-systems | Isometric view, facing-based action mapping, buffered input. |
| M3 | puzzle | Conversion validation, mechanical state, solver coverage and difficulty metrics. Load level-design only if level layout/design changes are explicitly needed. |
| M4 | game-ui-ux, input-systems, save-systems, phaser-core | Menus/HUD/focus, controls, progress persistence, resets. |
| M5 | create-game-assets, game-feel, phaser-core | Original cohesive art, animation/events, visual readability. Load imagegen only if raster generation is actually selected. |
| M6 | audio-design, game-feel, game-ui-ux, save-systems | Mix/cues, gesture unlock, polish/accessibility, saved settings. |
| M7 | puzzle, phaser-core, game-docs | Replay equivalence, browser checks, evidence and final documentation. Reload other relevant skills only for a specific defect. |

## Architecture

The following paths/contracts describe the target architecture. `src/logic/`, `src/levels/`, `tests/` and `tools/` now exist for M1; rendering/input/UI/audio/persistence remain future work. New rules still carry **ASSUMED** labels in SPEC.

| Boundary | Responsibility |
|---|---|
| `src/logic/` | Immutable level definitions and complete logical state; action validation, pure move application, switch/mixing rules, geometry/transport resolution, win checks, deterministic state hashing. No Phaser, DOM, audio, storage, timers, or wall-clock imports. |
| `src/logic/history` | Snapshot/undo/restart controller over plain data; stores every mutable puzzle field and counters. Invalid actions create no history entry. Animation queues are cleared by undo/restart, not serialized as puzzle truth. |
| `src/levels/` | Versioned JSON definitions and a manifest preserving source build order. Schema validation and source IDs/evidence travel with the data. |
| `src/scenes/` and `src/view/` | Boot/title/map/play scenes, projection, tile and actor views, depth sorting, event animations, camera. Rebuild visual state after undo/restart. |
| `src/input/` | Keyboard/pointer and optional touch mapped to named actions. Small explicit queue, pause/focus handling, key-repeat policy, no direct state mutation. |
| `src/ui/` | HUD/menu state, semantic HTML controls over/alongside canvas where useful, focus/navigation, instructions and colour labels. |
| `src/audio/` | Event-to-cue mapping, independent buses/volume settings, mute, gesture unlock. Never owns game rules. |
| `src/persistence/` | Validated/versioned local storage for completion/unlocks/settings; storage failure is recoverable. No DLL or Unity save file dependency in browser runtime. |
| `tools/` and `tests/` | Offline conversion, validators, solver, reference replay fixtures, core and browser tests. Tools are written only after approval. |

- **ASSUMED — pure contract:** Applying a named action to a settled state returns a new state, validity/result and ordered events. State includes level ID, supported position/elevation, heading, effective colour, pending dual selection, switch pressed/activated state, geometry orientations, waypoint indices/transport phases, counters, and completion flag. Frozen level definitions remain separate.
- **ASSUMED — geometry:** Keep world positions, logical support IDs, camera projection, and pixel coordinates distinct. Rotating groups transform logical member positions around explicit pivots. Moving groups advance through finite logical stops; if timing affects solutions, introduce explicit wait/phase actions rather than using frame delta in the core.
- **ASSUMED — deterministic pipeline:** Follow SPEC's transaction order, emitting events for motion, switching, disappearance/growth, rotation, transport, teleport, and win. Resolve logical effects atomically, animate the event list, then accept the next queued action. Document any ordering change before implementing it.
- **ASSUMED — solver:** BFS for unit-cost accepted actions initially, with heading/colour/pending switches/mechanical state included in the key. Use admissible A* or another exact method if BFS exceeds bounds. Keep separate action-minimal and step-minimal metrics; never label a bounded search timeout “unsolvable.” Replay each returned solution through the same runtime logic. Hints are not automatically in scope.

## Milestones and done checks

- [x] **P1: inspect references and write three planning documents.** Read-only video/data inspection; 2 fps and candidate scene-change frames extracted; SPEC/PLAN/AGENTS written. No game implementation, install, or scaffold. *(Proof: local input inspection and planning artifacts, 2026-11-13.)*
- [x] **Approval gate:** User explicitly approved M1 on 2026-11-13, with conservative switch assumptions and later mechanics deferred. Level layouts/order only may be reused; all art/audio/names/titles must be original. Separate instruction required before M2.

### M1 — logic core and tests

- [x] Establish strict TypeScript/Vite tooling, exact dependency lock, Vitest and npm scripts. Package versions checked with `npm view`. *(Proof: package.json/package-lock.json; install completed, 2026-11-13.)*
- [x] Trace unary/dual source control flow statically; isolate conservative edge policy in `resolveSwitch`. Implement pure movement, heading, support/walls, colours, fall/win, history/restart and focused fixtures. Later mechanics are explicitly rejected/deferred to M3. *(Proof: tools/inspect_managed.py, src/logic/, tests/, SPEC Needs verification.)*
- [x] Implement BFS and replay; validate source-derived puzzle-01 JSON with 23 support cells and original replacement titles. *(Proof: `npm run solve:levels`: 32 minimum actions, 22 forward steps, 86 explored states; witness replay wins. Synthetic line/mix/blocked boards also tested.)*
- [x] **Done:** strict type-check and all 44 tests pass, including conservative switch cases, frozen inputs, 1,000 seeded move/undo round trips, 1,100 retained history entries, full pending/mixed/third-state recovery, fall/win recovery, restart and blocked actions. Build and built-module replay pass; deliberate inversion of coloured-support acceptance was caught by the focused test and restored. Vite M1 status page returned HTTP 200. *(Proof: M1 verification commands below, 2026-11-13. No gameplay rendering/input or late mechanics implemented.)*

### M2 — greybox rendering of level 1

- [ ] Reuse the M1 logic fixture with source mapping; render neutral tiles, switches, Blobby heading, and portal as original geometric placeholders.
- [ ] Add facing-based input and event animation with safe queueing. Verify world axis mapping, spawn heading, support and portal location against frames.
- [ ] **Done:** level 1 can be completed, restarted and replayed locally; attempted moves into gaps remain blocked; camera/projection and occlusion are readable; no browser errors; a held/rapid key test cannot apply actions mid-animation. Save a browser screenshot next to the chosen reference anchor for review.

### M3 — all levels loaded from JSON

- [ ] Convert all 37 numbered puzzle scenes in build order, respecting hierarchy activation, external references, nested supports, half-unit offsets, pivots, waypoints, tags and title mapping. Classify scenes 38–40 separately; include approved finale/credits flow.
- [ ] Add rotating/moving/teleport mechanics only from confirmed contracts; add corresponding rule fixtures and transport/undo cases. Review at least one representative source scene from every mechanic family before bulk conversion.
- [ ] **Done:** manifest/JSON validation passes for every intended puzzle; no unsupported entities or dangling references; counts and spawn/exit placement agree with source audits; every puzzle has a solver witness replayed to win. Report minimum actions/steps and states explored when optimality is established; report resource limits separately. All levels open through the same loader without hardcoded per-level logic.

### M4 — UI, menus, undo and restart

- [ ] Build title, chapter map/selector, level intro, HUD, pause, settings and completion flow; preserve source order/locks. Add undo/restart controls and keyboard aliases per approved SPEC.
- [ ] Persist completion/unlocks/settings with a schema version, validation, storage-error fallback and a distinct reset-progress confirmation. Retain progress on restart.
- [ ] **Done:** Play/Continue → level → win → next/map works; replay and final-level handling work; reload preserves progress; corrupt/missing/blocked storage recovers; undo/restart clear stale events and input. Keyboard focus cannot move the puzzle while a menu is active. Test at 1364×762, 1280×720, and 390×844 for clipping/readability; touch controls are out of current scope. Small-viewport checks are for layout robustness only.

### M5 — art and juice

- [ ] Produce original placeholder/final tiles, character poses, switches, portal, background and UI with a consistent visual guide and provenance. Original art/audio/names/titles remain prohibited; only layouts and puzzle order are authorized.
- [ ] Add squash/stretch, turn anticipation, switch depression, colour shrink/grow, portal particles, shadows/depth and fades. Tune guessed timings against frame evidence and user feedback.
- [ ] **Done:** silhouettes and colour states are distinguishable; important paths/controls are never hidden; screenshot comparisons cover neutral, primary, secondary and wall states; reduced-motion mode works; animation cancellation during undo/restart leaves no ghost objects. Asset source/rights records exist for all shipped assets.

### M6 — audio and polish

- [ ] Create/source authorized movement, switch/mix, blocked/disabled, rotation/slide, portal/win and UI cues, plus a quiet loop. Audit reference cue timing if an audio review becomes available.
- [ ] Implement gesture unlock, Music/SFX/UI volumes, mute, pause/focus behaviour, colour labels/symbols and final responsive refinements.
- [ ] **Done:** cues fire once per logical event, music does not stack on restart, mute and levels persist, playback starts after interaction, no audible clipping in the tested mix, and gameplay remains understandable without audio. A 10-minute repeated restart/win/menu session shows no growing sound/listener count.

### M7 — verification against reference frames

- [ ] Build a comparison matrix by source time, level, logical state, expected support/walls, actor position/heading, switch/HUD state and reference frame. Reconstruct action sequences manually from consecutive frames; the recording contains no input log.
- [ ] Compare level 1 neutral movement, level 2 primary switching, level 4 barriers, level 6 mixing, level 7 combinations, menus, title transitions and win effects. Later levels use data/solver evidence and user review because video coverage stops at 7.
- [ ] **Done:** approved replay fixtures reach expected states and wins; all 37 puzzles have validated solution witnesses; full rule tests, strict type-check and production build pass; browser smoke/replay tests pass without console errors or missing assets; screenshots at reference aspect and responsive sizes are reviewed. Assess geometry/state/HUD fidelity separately from intentionally original art. Document remaining deviations and obtain review for unresolved material differences.

## Risks and how to resolve them

| Risk/unknown | Test or decision gate |
|---|---|
| Compiled data, stripped type trees | Resolve scripts/serialized field layouts and references. Spot-check component/transform parsing against known level-1 geometry, then audit representative levels. Reject unexplained fields/entities. |
| Duplicate scene/UI objects and odd filename order | Traverse active gameplay hierarchy; preserve path IDs and build-index mapping. Reconcile manifest titles with SceneTitles, not filenames. |
| Colour switches misunderstood | Trace complete control flow for pending/activated states; create a transition table covering unary → dual → dual → third, same-colour repeats and cancellations. Compare 2 fps neighbours and cut frames. |
| Support disappears beneath player | Confirm source behaviour/user intent before choosing failure rules; add a minimal regression fixture with full undo. |
| Moving/rotating timing breaks pure-state model | Audit activation, pivots, synchronized groups, rider heading and input guards. Compare fixed-stop model with reference data; include explicit phases if necessary. |
| Teleporter loops/ambiguous destinations | Resolve matching tags and coroutine behaviour, then test arrivals, heading and re-entry prevention; never choose a destination by arbitrary array order. |
| Solver state explosion or false proof | Include all mutable mechanical state in hashes, validate solutions in runtime, record search limits. Optimize only from measured pressure; a timeout is unresolved. |
| Unseen late-game mechanics | Video cannot establish visual/behavioural parity after level 7. Pair static data inspection and solver fixtures with user clarification/review; never claim video verification of unseen levels. |
| Art/audio ownership and fidelity | Default to original assets; request explicit rights confirmation before reuse. Compare composition and rules independently from texture identity. |
| Browser key repeat, focus, audio unlock and resize | Browser tests with rapid inputs, blur/refocus, pause overlays, resize, failed storage and audio before/after first gesture. |
| 2D renderer cannot reproduce needed camera views | Inspect late-level spatial arrangements in M1/M3 and prototype projection before final art. Surface any camera simplification or engine change before committing to it. |

## Verification and reporting discipline

Record actual command results and screenshot/replay evidence when marking milestones complete. For each completed milestone, update its boxes, explain deviations from SPEC, and list newly discovered **ASSUMED** items. Do not replace original ordering just to smooth a measured difficulty jump. M1 has runnable pure logic, a buildable ES module and a local static status page; browser gameplay starts at M2. Commands are defined in [AGENTS.md](AGENTS.md).


## M1 verification record — 2026-11-13

- `python3 tools/inspect_managed.py`: complete selected unary/dual methods parsed as metadata/IL without original-code execution. `python3 tools/inspect_level1.py`: gameplay parent transforms, 21 standalone neutral tiles, portal/base and spawn switch/base audited (23 supports total).
- `npm install --no-fund`: installed locked dependencies; npm reported 0 vulnerabilities at install time.
- `npm test -- --run`: 3 files, 44 tests passed. The full suite was rerun after the intentional mutation was restored.
- `npm run typecheck`, `npm run validate:levels`, `npm run solve:levels`, `npm run build`: passed. Coverage is puzzle 1 plus synthetic tests, not all 37 puzzles.
- Direct import of `dist/logic.js`: validated source puzzle 1, solved it and replayed to a win.
- `npm run dev -- --host 127.0.0.1 --port 5173 --strictPort`: Vite started. HTTP fetch returned 200 with the M1 status text after a sandbox localhost restriction was resolved. No browser canvas/gameplay verification is claimed at M1.
- **M1 assumptions:** SPEC Needs verification records literal switch edge semantics, initial blue/pressed spawn state for puzzle 1, entry-only switch triggering, cell-based static support/walls and fall-before-win ordering. The falling default was explicitly selected by the user. Rotating/moving/teleport mechanics and camera requirements remain deferred.
- **STOP:** M1 complete. M2 is not authorized; wait for the user.
