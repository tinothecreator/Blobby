# Agent rules for Blobby

## Project summary

Recreate Blobby as a browser-playable isometric colour/path puzzle using Phaser 4.2, TypeScript and Vite.
The original is a compiled Unity reference at `Blobby_Data/`, with its recording at `gameplay.mp4`.
Keep deterministic puzzle rules independent from rendering, input, animations, audio and persistence.
Use SPEC.md for evidence/rules and PLAN.md for ordered milestones and verification gates.
Current authorization: Phase 2 **M1 only**, approved 2026-11-13. M1 is complete. Wait for the user before M2; do not build rendering/input yet.

## Phase boundary and evidence

- M1 may establish tooling, pure logic, tests, a level-1 logic fixture and solver. Do not implement M2 rendering, gameplay input or later milestones until instructed. No touch/mobile or camera rotation is required for M1–M2. Investigate camera needs at rotation-dependent levels; defer rotating/moving platforms and teleporters to M3 without guessed rules.
- The expected `reference/gameplay.mp4` and `reference/data/` were absent. Actual inputs are the root recording and `Blobby_Data/`; do not move or modify them to match a presumed layout.
- Do not run `Blobby.exe`, any bundled executable, or load/execute the game's assemblies. Inspect original files as read-only data. Do not launch the game through Wine, Mono, Unity, a debugger, or another wrapper.
- Phase 1 loaded router, game-docs, puzzle and phaser-core. Route new concerns with `.agents/skills/router/SKILL.md`; load only matching skills as needed. PLAN.md lists future skill use; it does not mean those skills have been read.
- Never change SPEC.md without telling the user what changed. Notify the user before editing its rules or assumptions; keep evidence and change notes with the change.
- Tag every new rule, default, inferred behaviour or design guess **ASSUMED** until verified. Tag verified facts **OBSERVED** with video time/frame or data symbol/path. Presence of a class name alone does not prove its complete semantics.
- Update PLAN.md checkboxes when milestones actually finish, with proof. Do not tick tests from their names or mark a bounded solver timeout as unsolvable.

## Commands

M1 tooling exists and uses Node 26 (the installed environment), npm, strict TypeScript, Vite and Vitest. The core is runnable through tests/solver; the served page is an M1 status page, not a playable game. Install/typecheck/test/validate/solve/build/dev commands below have been verified; `npm ci` and preview are available but were not separately run in M1.

| Task | Command |
|---|---|
| Initial dependency install | `npm install` |
| Reproducible install after lockfile exists | `npm ci` |
| Local development | `npm run dev -- --host 127.0.0.1` |
| Strict type-check | `npm run typecheck` |
| Unit/rule tests | `npm test -- --run` |
| Validate level JSON/manifests | `npm run validate:levels` |
| Solve/replay current manifest (M1: puzzle 1 only) | `npm run solve:levels` |
| Browser checks | Deferred; introduce `test:e2e` with browser gameplay, not present in M1 |
| Production build | `npm run build` |
| Inspect production locally | `npm run preview -- --host 127.0.0.1` |

## Coding and data conventions (Phase 2)

- Use TypeScript strict mode; avoid `any`, implicit coercion and unexplained non-null assertions. Use explicit types for actions, colours, headings, entities, events and results. Prefer discriminated unions for different mechanics.
- Keep `src/logic/` pure and engine-independent. No Phaser, DOM, storage, sound, wall-clock or animation imports. Given the same complete state/action, return the same result/events without mutating inputs.
- Represent levels as validated, versioned JSON with stable IDs and a manifest preserving source build order. Retain provenance/path IDs and confirmed coordinate conversion. Never scatter level layouts or special-case level numbers through scene code.
- Original scenes have stripped type trees, nested transforms and duplicated UI/presentation objects. Resolve active hierarchy, script/external references, pivots, support, tags and local-to-world coordinates before conversion. Do not flatten by object name or silently round away spatial differences.
- Keep immutable level definitions separate from runtime state. Undo snapshots must include every mutable puzzle field, counters and transport state. Test full state hashes, including pending dual-switch state and heading.
- Rendering consumes pure state/events. Input maps to named actions. Animation completion must never decide puzzle rules. Undo/restart/pause/scene shutdown clear stale queued input and animations.
- Give events and subscriptions explicit owners and cleanup. Repeated restart/menu transitions must not accumulate listeners, music or sprites.
- Preserve original puzzle ordering and confirmed rules. Treat unsupported mechanics as explicit conversion failures, not harmless decorations. Tell the user about any material deviation.
- Use the project's minimal suitable tooling. Do not introduce network services, accounts, publication workflows or unrelated dependencies for a local browser game.

## Assets and rights

- The user owns original assets but authorizes reuse of **LEVEL DESIGNS ONLY: layouts and puzzle order**. Do NOT reuse original art, audio, names, level titles or chapter titles. Use original placeholder art/audio and newly written level/chapter titles. This restriction persists despite Phase 2 approval.
- Original strings/names in reference inspection reports describe evidence only. Do not copy them into shipped presentation. Extracted frames remain reference material, not game textures.
- Preserve reference files unchanged and record provenance for all shipped assets.

## Definition of done

For every task, first respect the current phase. For a Phase 1 documentation task, done means evidence/assumption labels, links, requested contents and scope are checked; no game tests or local playability can be claimed before implementation.

For an implementation task, all of the following must be true:

1. Required behaviour meets SPEC or a disclosed, recorded approved change; newly guessed behaviour is marked **ASSUMED**.
2. Relevant tests pass, strict type-check and build pass, and applicable level validators/solver replays pass. Use focused tests that protect rules and regressions; do not add tests that merely mirror reversible visual edits.
3. At M1, the logic runs locally through tests/solver and the Vite entry/build serves; rendering/browser gameplay are M2 and are not required or claimed. From M2 onward, the game runs locally. Verify affected behaviour in the browser; record actual viewport/browser and console/screenshot evidence when relevant. A unit test alone does not prove canvas rendering or browser input works.
4. Undo/restart and any affected transition/focus/persistence paths remain correct. All shipped puzzle levels eventually require replayable solver witnesses; report incomplete coverage honestly while milestones are in progress.
5. PLAN.md status and relevant docs reflect what exists. SPEC.md changes have been communicated. No unrelated files or original reference data were changed.
6. Report what changed, the checks actually run, and any unresolved limitations. Do not claim complete reference fidelity where the recording provides no coverage.

Stop after M1, report commands/results and new assumptions, and wait for the user before M2. Keep switch edge cases ASSUMED in SPEC's Needs verification section and isolated behind one tested rule function. Support disappearance defaults to a fallen soft-fail recoverable by unlimited undo/restart; no visible move counter.
