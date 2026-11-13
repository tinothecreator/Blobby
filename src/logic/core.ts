import { resolveSwitch } from './switch-rules.ts';
import type { Action, Cell, Event, Heading, Level, MoveResult, State } from './types.ts';

export function sameCell(a: Cell, b: Cell): boolean {
  return a.x === b.x && a.z === b.z && a.height === b.height;
}

export function hasSupport(level: Level, state: State, cell: Cell): boolean {
  return level.tiles.some((tile) => sameCell(tile, cell)
    && (tile.colour === null || tile.colour !== state.switches.effective));
}

export function createState(level: Level): State {
  return {
    levelId: level.id,
    position: { x: level.spawn.x, z: level.spawn.z, height: level.spawn.height },
    heading: level.spawn.heading,
    switches: structuredClone(level.initialSwitches),
    status: 'playing', actions: 0, steps: 0,
  };
}

export function isWin(state: State): boolean { return state.status === 'won'; }

/** Pure, synchronous transaction. No input queue/clock/animation is part of rules. */
export function apply(level: Level, before: State, action: Action): MoveResult {
  if (before.levelId !== level.id) throw new Error('State/level mismatch');
  const reject = (reason: MoveResult['reason']): MoveResult => ({
    state: before, accepted: false, reason, events: [],
  });
  if (before.status !== 'playing') return reject('terminal');
  if (action !== 'forward') {
    const offset = { left: 3, right: 1, back: 2 }[action];
    const heading = ((before.heading + offset) % 4) as Heading;
    return {
      accepted: true, reason: 'accepted',
      state: { ...before, heading, actions: before.actions + 1 },
      events: [{ type: 'turned', from: before.heading, to: heading }],
    };
  }
  const direction = [
    { x: 0, z: 1 }, { x: 1, z: 0 }, { x: 0, z: -1 }, { x: -1, z: 0 },
  ] as const;
  const delta = direction[before.heading];
  const position = { ...before.position, x: before.position.x + delta.x, z: before.position.z + delta.z };
  if (!hasSupport(level, before, position)) return reject('unsupported');
  if (level.walls.some((wall) => sameCell(wall, position)
    && (wall.colour === null || wall.colour !== before.switches.effective))) return reject('wall');
  let state: State = {
    ...before, position, actions: before.actions + 1, steps: before.steps + 1,
  };
  const events: Event[] = [{ type: 'moved', from: before.position, to: position }];
  const input = level.switches.find((item) => sameCell(item, position));
  if (input) {
    const result = resolveSwitch(state.switches, input);
    state = { ...state, switches: result.state };
    events.push({ type: 'switch', id: input.id, outcome: result.outcome });
    if (before.switches.effective !== state.switches.effective) {
      events.push({ type: 'colour-changed', from: before.switches.effective, to: state.switches.effective });
    }
  }
  if (!hasSupport(level, state, position)) {
    state = { ...state, status: 'fallen' };
    events.push({ type: 'fell', at: position });
  } else if (level.exits.some((exit) => sameCell(exit, position))) {
    state = { ...state, status: 'won' };
    events.push({ type: 'won', levelId: level.id });
  }
  return { accepted: true, reason: 'accepted', state, events };
}

/** Exact full-state representation for undo checks (includes counters). */
export function stateHash(state: State): string {
  return JSON.stringify([
    state.levelId, state.position.x, state.position.z, state.position.height, state.heading,
    state.switches.effective, state.switches.pending, state.switches.mixed,
    state.switches.unaryPressed, [...state.switches.dualPressed].sort(),
    [...state.switches.dualActivated].sort(), state.status, state.actions, state.steps,
  ]);
}

/** Solver equivalence intentionally excludes unbounded diagnostic counters. */
export function searchKey(state: State): string {
  return stateHash({ ...state, actions: 0, steps: 0 });
}
