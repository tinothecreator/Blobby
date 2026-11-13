# Hue Trails

A browser recreation of the supplied colour/path puzzle reference. Only original
level layouts and puzzle order are reused by permission; art, audio, names and
level/chapter titles must be original replacements.

**M1 complete; stopped before M2.** This milestone provides pure puzzle logic,
tests, an audited first-level JSON fixture and a solver. The local page is a
status page. There is no playable scene, browser input, art or audio yet.

Use Node 26 and npm:

```sh
npm ci
npm test -- --run
npm run typecheck
npm run validate:levels
npm run solve:levels
npm run build
npm run dev -- --host 127.0.0.1
```

`npm run build` emits a status page and an importable pure ES module,
`dist/logic.js`. Phaser 4.2.1 is pinned for M2; the logic never imports it.

The core API is exported from [src/logic/index.ts](src/logic/index.ts): validate
JSON with `parseLevel`, construct state with `createState`, apply named actions
with `apply`, manage snapshots with `History`, and solve/replay with `solve` and
`replay`. Actions are `forward`, `left`, `right`, `back`; headings 0–3 mean world
+Z, +X, −Z, −X. The core resolves instantly and emits events for a future view.
Fallen/won states reject further gameplay actions but allow undo/restart.

The manifest contains **one** source-derived puzzle, with a new title “First
Footing.” Its solver witness uses 32 minimum accepted actions (22 forward steps,
10 turns; 86 states explored). Remaining puzzles and finale/credits are pending.
Rotating/moving platforms and teleporters are rejected until investigated in M3.
Synthetic fixtures test rules; they are not presented as original puzzle levels.

Conservative dual-switch behaviour is isolated in
[switch-rules.ts](src/logic/switch-rules.ts). It remains **ASSUMED** and is listed
under [SPEC: Needs verification](SPEC.md#needs-verification). No original program
or assembly is executed. Optional static audits:

```sh
python3 tools/inspect_managed.py
python3 tools/inspect_level1.py
```

See [SPEC.md](SPEC.md) for rules/evidence, [PLAN.md](PLAN.md) for milestone status
and verification results, and [AGENTS.md](AGENTS.md) for persistent constraints.
