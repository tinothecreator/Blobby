import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import rawFirst from '../src/levels/puzzle-01.json';
import { parseLevel } from '../src/logic/level.ts';
import { createState, isWin, stateHash } from '../src/logic/core.ts';
import { replay, solve } from '../src/logic/solver.ts';
import { History } from '../src/logic/history.ts';
import { fixture, playground } from './fixtures.ts';

describe('validated level boundary', () => {
  it('loads and freezes a separate level definition without modifying caller JSON', () => {
    const original = JSON.stringify(rawFirst);
    const level = parseLevel(rawFirst);
    expect(JSON.stringify(rawFirst)).toBe(original);
    expect(Object.isFrozen(level.tiles[0])).toBe(true);
    expect(level.title).toBe('First Footing');
    expect(level.tiles).toHaveLength(23);
    expect(level.spawn).toEqual({ x: 0, z: 0, height: 0, heading: 0 });
    expect(level.exits).toEqual([{ x: -2, z: 2, height: 0 }]);
  });

  it.each(['groups', 'teleporters', 'rotatingPlatforms', 'movingPlatforms'])('rejects deferred mechanics: %s', (field) => {
    expect(() => parseLevel({ ...rawFirst, [field]: [] })).toThrow('unsupported field/mechanic');
  });

  it('rejects malformed coordinates, colours, IDs, unsupported switches and inconsistent initial states', () => {
    expect(() => parseLevel({ ...rawFirst, spawn: { ...rawFirst.spawn, x: 0.5 } })).toThrow('safe integer');
    expect(() => parseLevel({ ...rawFirst, tiles: [...rawFirst.tiles, rawFirst.tiles[0]] })).toThrow('duplicate cell');
    expect(() => parseLevel({ ...rawFirst, walls: [{ ...rawFirst.tiles[0], x: 0, z: 1 }] })).toThrow('duplicate entity ID');
    expect(() => parseLevel({ ...rawFirst, switches: [{ ...rawFirst.switches[0], colour: 'white' }] })).toThrow('expected one of');
    expect(() => parseLevel({ ...rawFirst, switches: [{ ...rawFirst.switches[0], kind: 'rotate' }] })).toThrow('expected one of');
    expect(() => parseLevel({ ...rawFirst, spawn: { ...rawFirst.spawn, x: 200 } })).toThrow('no defined support');
    expect(() => parseLevel({ ...rawFirst, initialSwitches: { ...rawFirst.initialSwitches, pending: 'red' } })).toThrow('pending');
    expect(() => parseLevel({ ...rawFirst, initialSwitches: { ...rawFirst.initialSwitches, dualActivated: ['blue'] } })).toThrow('activated');
    expect(() => parseLevel({ ...rawFirst, initialSwitches: { ...rawFirst.initialSwitches, effective: 'red' } })).toThrow('inconsistent unary');
    expect(() => parseLevel({ ...rawFirst, schemaVersion: 2 })).toThrow('expected one of');
  });

  it('documents exact source IDs and authorized coordinate normalization for level 1', () => {
    const level = parseLevel(rawFirst);
    const source12 = level.tiles.find((tile) => tile.id === 'support-12');
    expect(source12).toMatchObject({ x: -2, z: -3, height: 0, colour: null });
    expect(level.tiles.find((tile) => tile.id === 'support-349')).toMatchObject(level.exits[0]!);
    expect(level.initialSwitches).toMatchObject({ effective: 'blue', unaryPressed: 'blue' });
  });
});

describe('solver and replay', () => {
  it('finds a known minimum action solution', () => {
    const level = fixture();
    const result = solve(level);
    expect(result.status).toBe('solved');
    if (result.status !== 'solved') throw new Error('Expected solved');
    expect(result.actions).toEqual(['forward', 'forward', 'forward', 'forward']);
    expect(result.steps).toBe(4);
    expect(isWin(replay(level, result.actions))).toBe(true);
  });

  it('requires the correct dual mixture to remove a wall on the only route', () => {
    const level = fixture({ switches: [
      { id: 'dr', kind: 'dual', colour: 'red', x: 0, z: 1, height: 0 },
      { id: 'db', kind: 'dual', colour: 'blue', x: 0, z: 2, height: 0 },
    ], walls: [{ id: 'purple-wall', x: 0, z: 3, height: 0, colour: 'purple' }] });
    const result = solve(level);
    expect(result.status).toBe('solved');
    if (result.status !== 'solved') throw new Error('Expected solved');
    expect(result.actions).toHaveLength(4);
    expect(replay(level, result.actions)).toMatchObject({ status: 'won', switches: { effective: 'purple', pending: null, mixed: true } });
  });

  it('proves exhausted finite state space separately from resource limits', () => {
    const level = fixture({ walls: [{ id: 'w', x: 0, z: 1, height: 0, colour: null }] });
    expect(solve(level)).toEqual({ status: 'unsolvable', explored: 4 });
    expect(solve(fixture(), 1).status).toBe('limit');
    expect(() => solve(level, 0)).toThrow('Invalid state limit');
    expect(() => replay(level, ['forward'])).toThrow('Invalid replay');
  });

  it('solves source level 1, replays to win, and undoes the complete witness', () => {
    const level = parseLevel(rawFirst);
    const result = solve(level);
    expect(result.status).toBe('solved');
    if (result.status !== 'solved') throw new Error('Expected solved');
    expect(result.steps).toBe(22); // all 23 support cells form the single source path
    expect(isWin(replay(level, result.actions))).toBe(true);
    const history = new History(level);
    for (const action of result.actions) expect(history.move(action).accepted).toBe(true);
    while (history.undo()) { /* unwind every accepted action */ }
    expect(stateHash(history.state)).toBe(stateHash(createState(level)));
  });

  it('solves a synthetic board with primary/dual/fall branches and retains full rule state', () => {
    const level = playground();
    const result = solve(level);
    expect(result.status).toBe('solved');
    if (result.status === 'solved') expect(isWin(replay(level, result.actions))).toBe(true);
  });
});

it('keeps logic free of browser/engine imports', () => {
  for (const name of ['types', 'level', 'switch-rules', 'core', 'history', 'solver', 'index']) {
    const source = readFileSync(new URL(`../src/logic/${name}.ts`, import.meta.url), 'utf8');
    expect(source).not.toMatch(/from\s+['"](?:phaser|node:|.*(?:view|input|audio|persistence))/);
    expect(source).not.toMatch(/\b(?:window|document|localStorage|Date\.now|Math\.random|setTimeout)\b/);
  }
});
