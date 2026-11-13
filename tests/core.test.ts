import { describe, expect, it } from 'vitest';
import { apply, createState, isWin, searchKey, stateHash } from '../src/logic/core.ts';
import { History } from '../src/logic/history.ts';
import { ACTIONS } from '../src/logic/types.ts';
import { fixture, freeze, playground } from './fixtures.ts';

describe('movement and transactions', () => {
  it('moves forward in world heading and turns in place with correct counters', () => {
    const level = fixture();
    const initial = freeze(createState(level));
    const moved = apply(level, initial, 'forward');
    expect(moved.state.position).toEqual({ x: 0, z: 1, height: 0 });
    expect(moved.state).toMatchObject({ heading: 0, actions: 1, steps: 1 });
    expect(apply(level, initial, 'left').state).toMatchObject({ position: initial.position, heading: 3, actions: 1, steps: 0 });
    expect(apply(level, initial, 'right').state.heading).toBe(1);
    expect(apply(level, initial, 'back').state.heading).toBe(2);
    expect(apply(level, apply(level, initial, 'left').state, 'right').state.heading).toBe(0);
    expect(initial.actions).toBe(0);
  });

  it('rejects gaps and active walls without events or counter/history changes', () => {
    const wall = fixture({ walls: [{ id: 'w', x: 0, z: 1, height: 0, colour: 'blue' }] });
    const before = freeze(createState(wall));
    expect(apply(wall, before, 'forward')).toEqual({ state: before, accepted: false, reason: 'wall', events: [] });
    const gap = fixture({ tiles: fixture().tiles.filter((tile) => tile.z !== 1) });
    expect(apply(gap, createState(gap), 'forward').reason).toBe('unsupported');
    const history = new History(wall);
    expect(history.move('forward').accepted).toBe(false);
    expect(history.depth).toBe(0);
    expect(history.undo()).toBe(false);
  });

  it('selected colour removes matching walls/floors and restores the prior colour', () => {
    const level = fixture({
      tiles: fixture().tiles.map((tile) => tile.z === 3 ? { ...tile, colour: 'blue' } : tile),
      switches: [
        { id: 'b', kind: 'unary', colour: 'blue', x: 0, z: 1, height: 0 },
        { id: 'r', kind: 'unary', colour: 'red', x: 0, z: 2, height: 0 },
      ],
      walls: [{ id: 'w', x: 0, z: 2, height: 0, colour: 'blue' }],
    });
    const blue = apply(level, freeze(createState(level)), 'forward');
    expect(blue.state.switches.effective).toBe('blue');
    expect(blue.events.map((e) => e.type)).toEqual(['moved', 'switch', 'colour-changed']);
    const red = apply(level, freeze(blue.state), 'forward');
    expect(red.state.switches).toMatchObject({ effective: 'red', unaryPressed: 'red' });
    expect(apply(level, red.state, 'forward').accepted).toBe(true); // blue floor restored
    const previousBlue = { ...blue.state, position: { x: 0, z: 2, height: 0 } };
    expect(apply(level, previousBlue, 'forward').reason).toBe('unsupported');
  });

  it('falls after its destination switch removes support, before checking portal', () => {
    const level = fixture({
      tiles: fixture().tiles.map((tile) => tile.z === 1 ? { ...tile, colour: 'red' } : tile),
      switches: [{ id: 'r', kind: 'unary', colour: 'red', x: 0, z: 1, height: 0 }],
      exits: [{ x: 0, z: 1, height: 0 }],
    });
    const history = new History(level);
    const before = stateHash(history.state);
    const result = history.move('forward');
    expect(result.state.status).toBe('fallen');
    expect(result.events.map((event) => event.type)).toEqual(['moved', 'switch', 'colour-changed', 'fell']);
    expect(isWin(result.state)).toBe(false);
    expect(history.move('left').reason).toBe('terminal');
    expect(history.undo()).toBe(true);
    expect(stateHash(history.state)).toBe(before);
    history.move('forward'); history.restart();
    expect(stateHash(history.state)).toBe(before);
  });

  it('wins on entry, permits exact undo, and does not accept terminal gameplay moves', () => {
    const level = fixture({ exits: [{ x: 0, z: 1, height: 0 }] });
    const history = new History(level);
    const initial = history.state;
    const result = history.move('forward');
    expect(isWin(result.state)).toBe(true);
    expect(result.events.at(-1)).toEqual({ type: 'won', levelId: level.id });
    expect(history.move('back').accepted).toBe(false);
    expect(history.depth).toBe(1);
    history.undo();
    expect(history.state).toEqual(initial);
  });

  it('turning does not activate a switch underfoot', () => {
    const level = fixture({ switches: [{ id: 'r', kind: 'unary', colour: 'red', x: 0, z: 0, height: 0 }] });
    expect(apply(level, createState(level), 'left').state.switches.effective).toBe(null);
  });

  it('distinguishes full undo hashes from counter-free solver keys, retaining every rule field', () => {
    const state = createState(playground());
    expect(stateHash({ ...state, actions: 10 })).not.toBe(stateHash(state));
    expect(searchKey({ ...state, actions: 10, steps: 2 })).toBe(searchKey(state));
    expect(searchKey({ ...state, switches: { ...state.switches, pending: 'red' } })).not.toBe(searchKey(state));
    expect(searchKey({ ...state, heading: 1 })).not.toBe(searchKey(state));
    expect(searchKey({ ...state, switches: { ...state.switches, mixed: true } })).not.toBe(searchKey(state));
  });

  it('rejects cross-level state', () => {
    expect(() => apply(fixture({ id: 'other' }), createState(fixture()), 'forward')).toThrow('mismatch');
  });
});

describe('snapshot history', () => {
  it('restores pending, mixed, activated, third and unary transitions through the complete history', () => {
    const level = fixture({ switches: [
      { id: 'dr', kind: 'dual', colour: 'red', x: 0, z: 1, height: 0 },
      { id: 'db', kind: 'dual', colour: 'blue', x: 0, z: 2, height: 0 },
      { id: 'dy', kind: 'dual', colour: 'yellow', x: 0, z: 3, height: 0 },
      { id: 'ub', kind: 'unary', colour: 'blue', x: 0, z: 4, height: 0 },
    ] });
    const history = new History(level);
    const hashes = [stateHash(history.state)];
    for (let step = 1; step <= 4; step++) {
      history.move('forward');
      hashes.push(stateHash(history.state));
      if (step === 1) expect(history.state.switches.pending).toBe('red');
      if (step === 2) expect(history.state.switches).toMatchObject({ effective: 'purple', mixed: true, pending: null, dualActivated: ['blue', 'red'] });
      if (step === 3) expect(history.state.switches).toMatchObject({ effective: 'purple', pending: 'yellow' });
      if (step === 4) expect(history.state.switches).toMatchObject({ effective: 'blue', pending: 'yellow', mixed: false, dualActivated: [], dualPressed: ['yellow'] });
    }
    for (let step = 3; step >= 0; step--) {
      expect(history.undo()).toBe(true);
      expect(stateHash(history.state)).toBe(hashes[step]);
    }
  });

  it('keeps more than 1,000 history entries without truncation', () => {
    const level = fixture();
    const history = new History(level);
    for (let i = 0; i < 1100; i++) history.move('right');
    expect(history.depth).toBe(1100);
    for (let i = 0; i < 1100; i++) expect(history.undo()).toBe(true);
    expect(history.state).toEqual(createState(level));
  });

  it('1,000 seeded accepted-action/undo round trips restore full states across mixed board states', () => {
    const level = playground();
    const history = new History(level);
    let seed = 192837;
    let rounds = 0;
    let maxDepth = 0;
    const visitedColours = new Set<string | null>();
    const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed; };
    while (rounds < 1000) {
      if (history.state.status !== 'playing') history.restart();
      const action = ACTIONS[(random() >>> 16) % ACTIONS.length]!;
      const before = stateHash(history.state);
      const depth = history.depth;
      const result = history.move(action);
      if (!result.accepted) {
        expect(stateHash(history.state)).toBe(before);
        expect(history.depth).toBe(depth);
        continue;
      }
      visitedColours.add(result.state.switches.effective);
      expect(history.undo()).toBe(true);
      expect(stateHash(history.state)).toBe(before);
      expect(history.depth).toBe(depth);
      // Advance again so the next trial tests different states, not only spawn.
      history.move(action);
      maxDepth = Math.max(maxDepth, history.depth);
      if (random() % 53 === 0) history.restart();
      rounds++;
    }
    expect(rounds).toBe(1000);
    expect(maxDepth).toBeGreaterThan(5);
    expect(visitedColours.size).toBeGreaterThan(1);
    history.restart();
    expect(history.state).toEqual(createState(level));
    expect(history.depth).toBe(0);
  });

  it('does not leak mutable state/result references out of history', () => {
    const history = new History(fixture());
    const result = history.move('forward');
    Object.assign(result.state.position, { z: 99 });
    Object.assign(history.state.position, { z: 99 });
    expect(history.state.position.z).toBe(1);
    history.undo();
    expect(history.state.position.z).toBe(0);
  });
});
