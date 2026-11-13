# Blobby — recreation specification

Version 0.2 · 2026-11-13 · Phase 2 approved for M1 only

## Evidence and notation

Every design item below is tagged **OBSERVED** (direct video/data evidence) or **ASSUMED** (proposed browser behaviour or an inference). An observed class or field proves its presence, not every detail of its runtime behaviour. Unknown rules remain explicit; this is not a claim that all levels have been reverse engineered.

- **OBSERVED — inputs:** The supplied files are actually `./gameplay.mp4` and `./Blobby_Data/`, not `./reference/gameplay.mp4` and `./reference/data/`. The original is a Unity 2022.3.24f1 Windows build. `Blobby.exe` was never run. Data and managed assemblies were read as bytes only.
- **OBSERVED — video:** 1364×762, 30 fps, 485.95 seconds, stereo AAC. The recording shows menus, levels 1–7, restarts, and exploration of the chapter map; it does not demonstrate the later puzzles.
- **OBSERVED — frame archive:** `reference/frames/sample_0001.jpg` through `sample_0972.jpg` sample the recording at 2 fps. Approximate timestamp: `(index - 1) / 2` seconds. `cut_*.jpg` adds frames selected by ffmpeg scene score >0.08; the numeric suffix is the output timestamp in 1/30-second units. `scene_*.jpg` is an additional >0.12 pass. These are candidate cuts, including fades and colour changes; slow transitions are also covered by regular samples. `overview_01.jpg`, `overview_02.jpg`, and `tutorial.jpg` are ffmpeg contact sheets.
- **OBSERVED — evidence identifiers:** V means the video/frame archive; D means `Blobby_Data/`. Useful anchors: 24.5 s (`sample_0050`, map), 32 s (`sample_0065`, level 1 intro), 39.5 s (`sample_0080`, controls), 59.5 s (`sample_0120`, level 2 intro), 69.5 s (`sample_0140`, switches and shrinking paths), 149.5 s (`sample_0300`, primary paths and a wall), 204.5 s (`sample_0410`, dual switches). Overviews show the complete recording in 10-second steps.

## Identity and core loop

- **OBSERVED [V]:** A solitary black, soft-bodied character with large white eyes navigates floating isometric tile paths to an upright swirling portal. Planning which colours to remove is the central puzzle.
- **OBSERVED [V, D/ButtonManager]:** Coloured switches change the global colour state, shrinking matching coloured floors and barriers and restoring other colours. Neutral grey floor remains available. Removing a floor cuts a route; removing a wall opens one.
- **OBSERVED [V, D/RulesManager]:** Later early-game puzzles introduce pairs of primary-colour switches that produce secondary colours.
- **ASSUMED:** Browser core loop: inspect → turn/move → resolve the destination interaction and board changes → inspect again → enter portal → unlock next level. No resource economy or combat is proposed.

## Rules and resolution

| Item | Evidence/status | Rule or unresolved detail |
|---|---|---|
| Board | OBSERVED [V, D/Transform] | Sparse paths on a world X/Z lattice, rendered diagonally. Gaps are meaningful. Tall barriers occupy traversable routes. Later data contains moving and rotating geometry. |
| Forward move | OBSERVED [D/BlobiMove_Alt.handleDirection] | Move exactly one world unit in the character's current forward direction when the forward sensor accepts the move. This is facing-based control, not screen-relative WASD translation. |
| Turning | OBSERVED [D/handleDirection] | Left changes heading by −90°, right by +90°, back by +180°. Turning occurs in place; back is a turn, not walking backwards. |
| Collision | OBSERVED [D/BlobiSense.updateSense] | A forward sensor rejects an empty result and rejects any sensed collider on layer 9 (`Obstacle`). Video movement stays on the paths. |
| Browser collision contract | ASSUMED | Accept forward only if the destination has support and no active blocking wall. Blocked movement changes neither board nor history/counter. Turning is allowed on supported cells. No diagonal movement, jumping, pulling, or box pushing. |
| Interaction timing | OBSERVED [D/BlobiMove_Alt.Update] | Destination interaction runs after movement reaches its target. The controller has a queue and busy state. Walking input is prevented while riding a platform. |
| Round/unary switches | OBSERVED [V, D/SingleButton.Interact, ButtonManager.switchBtnOn] | Entering an unpressed switch selects its primary colour, presses switches with its tag, shrinks that colour's objects, restores nonmatching disabled objects, updates the HUD/background, and releases other switch colours. Re-entering an already pressed unary switch takes the disabled-button sound branch. |
| Persistence of switch state | OBSERVED [V, D/ButtonManager] | A selected colour persists after walking off the switch; this is not a pressure plate that releases immediately. Multiple switches with the same tag are managed together. |
| Matching objects | OBSERVED [D/ButtonManager.shrinkTiles/updateTiles] | Matching tagged `ShrinkTile` and `ShrinkCylinder` objects shrink; disabled nonmatching objects grow. Source matching uses string `Contains`, not a numeric colour enum. |
| Logical colour rule | ASSUMED | Normalize tags to six explicit colours; objects of the effective selected colour are absent/nonblocking after resolution. Neutral objects never disappear from colour selection. Verify imported compound tags before replacing source substring matching with equality. |
| Dual/square switches | OBSERVED [V around 190–290 s, D/ButtonManager] | A first dual-switch press records its tag. A second combines the primary colours, activates the relevant switches, updates board/HUD to the mixture, clears the pending tag, and marks the mixed state. A single first press does not call the unary board-update sequence. |
| Mixing table | OBSERVED [D/RulesManager.dualButton] | Different primaries combine commutatively: red + blue = purple; blue + yellow = green; red + yellow = orange. Same-colour or unsupported pairs return an empty string from this function. |
| Dual edge cases | ASSUMED/UNRESOLVED | Use the conservative static interpretation in Needs verification below, isolated in `resolveSwitch` with dedicated tests. It is ASSUMED until verified in play. Do not invent cumulative RGB mixing. |
| Merging/splitting | OBSERVED [V coverage]; ASSUMED for unplayed levels | No character merging, splitting, duplication, or numeric tile merging is visible. Colour combination is observed. No physical merge/split mechanic is planned unless later evidence establishes one. |
| Coloured barriers | OBSERVED [V levels 4–7] | Standing coloured walls disappear/reappear with colour changes. A disappearing wall may open a route while matching floor disappears elsewhere. |
| Rotating geometry | OBSERVED [D/RotateBlock.Interact] | Interaction calls `updateOrientation` over registered rotating objects and plays the rotate tile sound. Levels 19–24 are stored in the Rotating Blocks group. Rotation scope, angles, pivot, support changes, and passenger orientation remain unverified. |
| Moving geometry | OBSERVED [D/MovePlatform] | Fields include waypoints, movementSpeed, currentIndex, wait_time, activated, and isOn. Registered platforms coordinate arrivals; the movement method advances/wraps the waypoint index and carries a rider. Exact activation and synchronization semantics are unverified in the video. |
| Teleporters | OBSERVED [D/Teleporter] | Blue/red teleporter tags exist; interaction searches matching tags and starts a teleport coroutine. Destination choice, facing, delay, and re-entry suppression are not yet established. |
| Win | OBSERVED [V, D/EndLevel.OnTriggerEnter] | Enter the exit portal. The source checks the entrant name `Blobby`, updates saved progression if needed, broadcasts completion, animates the portal and falling tiles, plays an end-level sound, and requests the next level. No colour-match condition is present in the inspected exit trigger. |
| Fail | OBSERVED [V coverage] | No lives, countdown, defeat panel, or score failure was visible. Invalid movement is guarded. Softlocks are possible when routes disappear; restart is available. Tile falling is also a victory effect and must not be mistaken for death. |
| Fail handling | ASSUMED | User-approved ASSUMED default: if support disappears under the character, enter a fallen soft-fail state; undo/restart remain available. Do not automatically reset or shuffle. Blocked movement is not failure. Falls take precedence over portal wins in the same transaction; no further movement is accepted while fallen. |

- **ASSUMED — transaction order:** At a stable state, validate action → snapshot → apply heading/position → resolve interaction → recompute support/barriers and mechanical state → resolve transport if applicable → check portal → increment counters → emit ordered visual/audio events. No renderer callback changes puzzle state. Exact later-mechanic ordering must be confirmed before freezing M1/M3 rules.
- **ASSUMED — animation/input:** Queue at most one gameplay action during a resolving animation; flush queued actions on undo, restart, pause, and level change. No mid-resolution mutations. Settled logical states, rather than animation frames, are undo/solver nodes; if later puzzles require timed input, model explicit phases instead.

## Controls, recovery, and scoring

| Item | Evidence/status | Behaviour |
|---|---|---|
| Original movement tutorial | OBSERVED [V level 1] | W is forward; A and D show curved turn arrows. Source callbacks also include `onTurnBack`. |
| Browser keys | ASSUMED | User-approved: W/Up = forward; A/Left = turn left; D/Right = turn right; S/Down = turn around. The original binding for back has not been established. |
| Pointer | OBSERVED [V, D/RealWorldInteractionManager] | Menus and level tiles respond to pointer interaction. Source also has click/hover raycasts and camera controls; mouse movement is not evidence for click-to-walk. |
| Camera | OBSERVED [V/data] | Isometric framing can change; data includes drag-to-rotate instructions and camera controls. Exact bindings and whether camera orientation affects gameplay remain unresolved. |
| Pause | OBSERVED [V around 390 s] | Pause overlay offers Resume, Restart, Levels, Options, Main Menu. User-approved browser key: Escape. |
| Restart | OBSERVED [V] | R icon at upper left and Restart in pause menu; the recording returns to a level intro/reset state. User-approved: R key and UI button rebuild the full initial level state and clear action history. |
| Undo | ASSUMED addition, user-approved | No undo action was demonstrated. Provide Z and an Undo button, unlimited within the current level. Restore position, heading, colours, pending/pressed switches, geometry, transport phase, win flag, and counters exactly. History begins empty. No crossing level boundaries. |
| Counters/scoring | OBSERVED [V coverage] | No move counter, stars, timer, or score was visible. ASSUMED: retain internal accepted-action and forward-step counters for tests/solver, restore on undo, reset on restart, and keep them out of the normal HUD, as approved. A turn counts as one action; blocked movement counts as zero. |
| Browser persistence | ASSUMED | Versioned local storage saves unlocked/completed level IDs and settings. Restart does not erase progression. Reset progress is a separate confirmed UI action. |

## Original level/data format

- **OBSERVED [D]:** Levels are compiled Unity serialized binary scene files `level0`…`level40`, with shared assets and managed DLLs. There is no supplied plaintext JSON level collection. `levelN` denotes build index, not necessarily the number in its original asset filename.
- **OBSERVED [D/globalgamemanagers]:** Ordered build paths identify index 0 as `Video 1`, indices 1–37 as numbered puzzle scenes, 38 as `ColourBlobby`, 39 as `Credits`, and 40 as `v2 Levels Map`. `SceneTitles.Awake` supplies 37 named puzzle entries plus blank special-scene titles. The finale is not yet classified as a puzzle.
- **OBSERVED — binary envelope:** The inspected scenes use serialized-file version 22, engine string `2022.3.24f1`, platform 19, little-endian metadata, and disabled type trees. The extended header supplies 64-bit file/data offsets. Serialized types identify class IDs and script indices; object records give path ID, relative byte offset, size, and type index. References are `(fileID:int32, pathID:int64)` pairs. This is a reference description, not a complete generic Unity parser specification.

| Source object/schema | Evidence/status | Fields/meaning |
|---|---|---|
| GameObject (class 1) | OBSERVED | Component references, layer, aligned length-prefixed UTF-8 name, tag index, active flag. Names repeat and cannot serve as unique IDs. |
| Transform (class 4) | OBSERVED | GameObject reference; local quaternion rotation, XYZ position, XYZ scale; child references; parent reference. Compose ancestors before assigning world cells. |
| MonoBehaviour (class 114) | OBSERVED | GameObject/enabled/script references plus class-specific serialized data. Type trees are stripped; field layout must be established from the matching managed assembly and script reference. |
| MonoScript/shared assets | OBSERVED | Scripts and resources are referenced across files. A single scene file is not self-contained; resolve external file IDs rather than guessing from names. |
| Colour tags | OBSERVED [TagManager] | `yellow`, `red`, `blue`, `purple`, `green`, `orange`; `blue unaryButton`, `red unaryButton`, `yellow unaryButton`; `blue dualButton`, `red dualButton`, `yellow dualButton`; blue/red teleporter tags; also white/untyped unary tags. Their use outside the inspected levels needs validation. |
| Layers | OBSERVED [TagManager] | Layer 6 Interactable, 7 Ground, 8 Interactable_rotate, 9 Obstacle, 10 Camera; default/UI layers also occur. |
| Geometry behaviours | OBSERVED | ShrinkTile: shrink/grow, timer, wait_time, rate_of_change. RotateBlock: toggle, blobi. MovePlatform: fields listed in the rules table. Imported data must retain paths, pivots, and starting states, not only screenshots. |
| Progress data | OBSERVED [managed metadata] | `GameData` has `level`, `x`, `y`, `z`; save code names `/gameProgress.json` and `/blobbyPosition.json`. These are generated save paths, not supplied level files. |

- **OBSERVED — level 1 spot checks:** `/Level/Blobby` local position is approximately `(0.5, 0.164883, 0.5)`, identity heading. `/Level/Tilemap/level1/portal` has local position `(-1.5, 0, 2.5)`. The parent Blue Round Button object is at `(0.5, 0, 0.5)`. Neutral tile positions include `(-1.5, 0, -2.5)` and `(3.5, 0, 3.5)` and have nonuniform decorative scales near 1. These are local coordinates, not a complete world-space board export.
- **OBSERVED — duplication quirk:** Scene 1 contains several objects named `Blobby`, cameras, and repeated menu/presentation objects. Only the gameplay hierarchy should become the puzzle board. Active-self alone does not prove active-in-hierarchy. A button and a portal may contain their own neutral base tiles; do not double-count those as separate cells.
- **OBSERVED — order quirk:** Build index 8 uses `Tutorials/Level 15.unity`, index 9 uses `Level 8.unity`, index 15 uses `RotationDependent Levels/RD Level 1.unity`, and index 16 uses `Tutorials/Level 13.unity`. Preserve build order and title mapping, never lexicographically sort source names.
- **ASSUMED — browser conversion:** After approval, convert puzzle definitions into reviewed JSON with a source mapping and validation report. Phase 1 wrote no conversion output. M1 now contains the audited source-level-1 layout as `src/levels/puzzle-01.json`; the remaining levels are deferred to M3.

### Target browser JSON schema (all ASSUMED; M1 subset below)

| Field | Shape and contract |
|---|---|
| schemaVersion | Integer, initially 1. Reject unsupported versions. |
| id, order, chapter, title, subtitle | Stable string ID, numeric build order/chapter, UTF-8 display text. |
| source | Original scene build index/path, relevant object path IDs, evidence notes, unresolved assumptions. |
| coordinateSystem | Explicit source origin, unit, axis mapping, and height convention. Normalize half-cell offsets once; do not silently round moving-platform coordinates. |
| spawn | Cell/height or support ID, heading 0–3, initial logical colour and initial switch state. |
| tiles | Sparse array of unique ID, integer x/z and elevation, kind (neutral/coloured), colour or null, support/group ID, initial presence. Multiple elevations are allowed. |
| walls | Unique ID, cell/edge placement, height, colour or null, initial blocking state, group/pivot reference. |
| switches | Unique ID, support/cell, kind (unary/dual/rotation/transport/reset if proven), colour, source tag, linked group IDs, initial pressed/activated state. |
| exits, teleporters | Exit support/cell; teleporter IDs, colour/pair/destination references and arrival heading policy once established. |
| groups | Rotating member IDs, pivot, legal orientations; moving members, explicit waypoint positions/order, activation/synchronization group, start index, timing policy. No guessed late-game defaults. |
| presentation | Background palette, camera framing, tutorial messages/triggers; cannot change puzzle rules. |

- **OBSERVED — M1 implementation subset:** `src/logic/level.ts` validates schemaVersion 1, id/order/chapter, original replacement title/chapterTitle, source metadata, spawn, initialSwitches, tiles, walls, switches and exits. Entity cells use integer x/z/height; kinds are unary/dual only. It rejects unknown fields, including deferred groups/teleporters. Target subtitle/presentation/source-ID extensions above are not accepted yet; do not interpret the target table as a claim of full M3 schema support.

- **ASSUMED — validation:** Require unique IDs, valid references, legal colour/type combinations, supported spawn/exit, resolved coordinates, and recognized behaviour types. Reject an unsupported entity rather than silently dropping it. Runtime state is separate from immutable level JSON.

## Progression and difficulty

| Range | Evidence/status | Content and difficulty intent |
|---|---|---|
| 1 | OBSERVED [V] | Blobby's First Step: turning, moving, switch, and portal on neutral paths. |
| 2–3 | OBSERVED [V] | Vanishing Pathways and Prism Passage: changing primary colours alters access between islands/branches. |
| 4–5 | OBSERVED [V] | Primary Puzzle and Colour Shift Cavern: longer paths, repeated primary switches, upright barriers. |
| 6–7 | OBSERVED [V] | Tints of Trouble and Chromatic Bridge: square dual switches, secondary colours, combinations with floors/barriers. |
| 8–18 | OBSERVED [D] | Tutorial/rotation-dependent source scenes and titles. Their precise per-level mechanics and solutions are unverified. |
| 19–24 | OBSERVED [D] | Rotating Blocks source group. |
| 25–31 | OBSERVED [D] | Moving Platform source group. |
| 32–36 | OBSERVED [D] | Move and Rotate source group. |
| 37 | OBSERVED [D] | Last 1 scene, displayed title Blobby's Final Steps. |

- **OBSERVED [D/ChapterCalculator constructor]:** Chapter boundary fields are 8, 18, 24, 31, 37, 39, 40. Five puzzle chapter groups are registered. **ASSUMED:** these correspond to puzzle chapters 1–8, 9–18, 19–24, 25–31, 32–37; verify exact inclusive comparisons during conversion.
- **OBSERVED [V]:** The chapter map initially shows level 1 available and padlocks on later tiles. Five visible chapter signs include A Whole New World, Ready… Steady… Go, Twists And Turns, Slip and Slide, and One Last Adventure.
- **ASSUMED:** Complete a level to unlock the next; replay completed levels freely. Preserve original order. Measure minimum actions, minimum forward steps, colour changes, and solver states explored; flag difficulty jumps without reordering the recreation automatically. No solutions or measured difficulty scores are available yet.

## Presentation, menus, and audio

- **OBSERVED [V]:** Floating rough-edged stone tiles with bevels and soft shadows; neutral charcoal and vivid pastel primary/secondary colours. Blobby has a black tapered body, expressive large eyes, and a pale cap-like top. The portal has a dark arch and animated colour swirl. The world has a cloudy, sparkling void background that changes colour with the selected state.
- **OBSERVED [V]:** Isometric depth, smooth stepping/turning, lively character poses, particle bursts, shrinking/growing coloured geometry, glowing switch rings, and soft transitions. Victory includes tiles dropping away. Camera framing differs between levels and can shift during play.
- **ASSUMED:** Recreate with original 2D isometric placeholder art, depth sorting, distinct facing poses and squash/stretch. Initial timing targets: step 180 ms, quarter-turn 140 ms, colour transition 250 ms, title fade 700 ms; these are starting guesses, not measurements. Respect reduced-motion preference.
- **OBSERVED [V]:** HUD has an upper-left R reset marker, lower-left colour wheel with pointer, and lower-right square/triangle and circular colour indicators. Tutorial/narrative text appears bottom-centre. No visible score. Exact interpretation of every lower-right segment remains unresolved.
- **OBSERVED [V]:** Flow: branded splash → main menu with Play (also Reset Game and Quit) → chapter/level map → black/fading level number/title/subtitle → play → portal transition/next level. Pause dims the board. Map tiles use padlocks, hover/selection colours, and chapter signs. Data includes sound, video quality, controls/rebinding, reset/default and confirmation UI.
- **ASSUMED:** Browser title provides Play/Continue, level map, settings, and reset progress. Quit returns to title rather than trying to close a browser tab. Use original replacement level/chapter titles and preserve the title-card layout; simplify 3D map travel into an isometric navigable map if necessary. Add explicit Undo and Restart buttons, visible focus, colour symbols/labels, and responsive layout.
- **OBSERVED [D/AudioManager]:** Dedicated cues exist for walking, single switches, dual switches, disabled switches, particle emitters, portal/end-level, rotation, sliding, UI, locked levels, popup, start/end game, and level music. Separate UI/Music/SFX volume controls are named in data. The video contains an audio stream; exact timbres, melodies, loudness, and cue timing were not audited by listening in this pass.
- **ASSUMED:** Create original soft movement taps, switch clicks, mixing chimes, transformation sounds, a portal success cue, and quiet looping music. Start audio on a user gesture; offer independent Music/SFX/UI volume and mute. Original art, audio, names and titles are prohibited from reuse by the user, despite ownership. Only level layouts and puzzle order are authorized for reuse. Reference names in this document describe evidence, not product copy.

## Approved scope and constraints

- **OBSERVED — user decision, 2026-11-13:** Reuse only original level layouts and puzzle order. Do not reuse original art, audio, names, level titles or chapter titles. Create original placeholders and replacement titles. Reference names in evidence are not authorization to ship them.
- **OBSERVED — user decision:** Scope is all 37 puzzles plus finale/credits. Build M1 only now; stop for a separate user instruction before M2. Unlimited within-level undo, no visible move counter, and the proposed desktop keys are approved. Touch/mobile is not required for now.
- **OBSERVED — user decision:** No camera rotation in M1–M2. Revisit at rotation-dependent levels and report findings. Investigate rotating/moving platforms and teleporters in M3; do not guess their rules or implement placeholders that behave as confirmed mechanics.

## Needs verification

All behaviours in this section remain **ASSUMED**, isolated behind `src/logic/switch-rules.ts:resolveSwitch` and covered by transition tests. Static evidence is reproducible with `python3 tools/inspect_managed.py`; this reads metadata/IL bytes and never executes original code.

| Case | Conservative M1 interpretation | Static evidence |
|---|---|---|
| Same-colour dual repeat | No change to effective colour, pending selection, or pressed state. Duplicate switches of one colour share the pressed flag. | `DualButton.Interact` IL 0–20 checks pressed; `ButtonManager.pressBtn` IL 133–184 presses all matching tags. Same-colour pairs do not reach the mix function through valid state. |
| First dual press | Record pending colour and mark that colour pressed; preserve effective board colour. | `switchBtnOn` IL 367–428 does not call shrink/updateTiles. |
| Third press after a mix | Already-pressed member of the pair is disabled. An unused primary becomes pending without replacing the effective mixture or undoing the old pair. | Pressed guard plus `switchBtnOn` IL 367–428 (`Third` HUD branch). |
| Unary during pending dual | Apply unary colour and its pressed state; keep pending dual selection. No inferred cancellation key or cancellation rule. | Unary branch IL 28–58 does not assign `pressedDualBtn`; `updateButtons` does not assign it either. |
| Unary after mixed state | Clear activated dual pressed flags and activation, and clear the mixed flag. A third pending selection survives if it was not activated. | `updateButtons` IL 94–265, only entered when previous mixed flag is true. |
| Next pair after an existing mix | Apply the new mixture. Preserve literal call order: activate matching dual colours, run `updateButtons` with previous mixed flag (which clears activated dual flags), then clear pending and set mixed=true. No accumulated tertiary colour. | `switchBtnOn` IL 120–361; `updateButtons` IL 94–250. This surprising reset order is not “cleaned up.” |

- **ASSUMED — initialization:** Level 1 begins in blue with its spawn unary switch logically pressed, matching early HUD frames. No free action/history entry is created on initialization. Spawn activation of other levels must be specified in their data, not inferred universally.
- **ASSUMED — support:** The user-approved falling default is a logical `fallen` status and a fall event, with no lives or timed respawn. M1 has no fall animation. If support is absent after destination interaction, resolve fall before checking the exit.
- **ASSUMED — M1 geometry boundary:** Static, same-elevation grid support and cell-blocking walls only. Reject levels containing groups, teleporters, or unrecognized fields/mechanics until M3. Do not treat them as neutral ground.
- **ASSUMED — action semantics:** Turning in place does not re-trigger the current switch; interaction happens on entry only. Starting on an exit is invalid level data. Accepted turn actions cost one internal action; no-op/blocked actions do not enter history.
- **UNRESOLVED, deferred to M3:** Rotating/moving platform activation scope, pivot/heading/support transformations, synchronization, timing, teleporter destination/re-entry, and camera effects. Ask the user only after static data/video inspection cannot settle them. No M1 implementation or guessed defaults for these mechanics.

## Decisions and change log

- **ASSUMED decision D-001, 2026-11-13:** Target Phaser 4.2 + TypeScript + Vite with pure puzzle logic; rationale and verification gates live in [PLAN.md](PLAN.md).
- **OBSERVED process constraint, 2026-11-13:** User requested these three root documents only. No extra GDD/features hierarchy, scaffolding, package installation, source files, or game code was created. Phase 2 requires the user's explicit `approved`.

- **OBSERVED change 0.2, 2026-11-13:** User approved M1 only, level-design/order reuse only, original replacement presentation, desktop controls, undo and hidden counters. Added Needs verification and conservative switch assumptions; later mechanics deferred to M3.

- **OBSERVED M1 record:** Implemented only the static core and first layout, with 44 passing tests and a replayable 32-action/22-step source-level-1 solution. No gameplay presentation, original art/audio/names, or deferred mechanics were shipped. M2 awaits separate instruction.
