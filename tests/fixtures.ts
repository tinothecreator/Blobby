import { parseLevel } from '../src/logic/level.ts';
import { EMPTY_SWITCHES } from '../src/logic/switch-rules.ts';
import type { Level, Tile } from '../src/logic/types.ts';

export function fixture(patch: Partial<Level> = {}): Level {
  return parseLevel({
    schemaVersion: 1, id: 'test-only', order: 1, chapter: 1,
    title: 'Test only', chapterTitle: 'Test only',
    source: { buildIndex: 1, file: 'synthetic-test-only', notes: ['Synthetic rule fixture, not an original puzzle.'] },
    spawn: { x: 0, z: 0, height: 0, heading: 0 },
    initialSwitches: EMPTY_SWITCHES,
    tiles: Array.from({ length: 5 }, (_, z) => ({ id: `tile-${z}`, x: 0, z, height: 0, colour: null })),
    walls: [], switches: [], exits: [{ x: 0, z: 4, height: 0 }],
    ...patch,
  });
}

export function playground(): Level {
  const tiles: Tile[] = [];
  for (let x = -2; x <= 2; x++) {
    for (let z = -2; z <= 2; z++) tiles.push({ id: `tile-${x}-${z}`, x, z, height: 0, colour: x === 0 && z === -1 ? 'red' : null });
  }
  return fixture({
    tiles, exits: [{ x: 2, z: 2, height: 0 }],
    walls: [{ id: 'wall', x: 2, z: 0, height: 0, colour: 'green' }],
    switches: [
      { id: 'dr', kind: 'dual', colour: 'red', x: -1, z: 0, height: 0 },
      { id: 'db', kind: 'dual', colour: 'blue', x: 1, z: 0, height: 0 },
      { id: 'dy', kind: 'dual', colour: 'yellow', x: 0, z: 1, height: 0 },
      { id: 'ur', kind: 'unary', colour: 'red', x: 0, z: -1, height: 0 },
      { id: 'ub', kind: 'unary', colour: 'blue', x: -1, z: -1, height: 0 },
      { id: 'uy', kind: 'unary', colour: 'yellow', x: 1, z: -1, height: 0 },
    ],
  });
}

export function freeze<T>(value: T): T {
  if (typeof value === 'object' && value !== null) {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}
