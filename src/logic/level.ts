import { COLOURS, PRIMARIES } from './types.ts';
import type { Cell, Level, SwitchState } from './types.ts';

function fail(path: string, message: string): never { throw new Error(`${path}: ${message}`); }
function object(value: unknown, path: string, keys: readonly string[]): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return fail(path, 'expected object');
  const record = value as Record<string, unknown>;
  for (const key of Object.keys(record)) if (!keys.includes(key)) fail(path, `unsupported field/mechanic ${key}`);
  for (const key of keys) if (!(key in record)) fail(path, `missing ${key}`);
  return record;
}
function text(value: unknown, path: string): void {
  if (typeof value !== 'string' || value.trim() === '') fail(path, 'expected nonempty string');
}
function integer(value: unknown, path: string, min = -Number.MAX_SAFE_INTEGER): void {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < min) fail(path, 'expected safe integer');
}
function list(value: unknown, path: string): unknown[] {
  if (!Array.isArray(value)) return fail(path, 'expected array');
  return value as unknown[];
}
function choice(value: unknown, choices: readonly unknown[], path: string): void {
  if (!choices.includes(value)) fail(path, `expected one of ${choices.join(', ')}`);
}
function cell(record: Record<string, unknown>, path: string): void {
  for (const key of ['x', 'z', 'height']) integer(record[key], `${path}.${key}`);
}
const cellKey = (item: Cell): string => `${item.x},${item.z},${item.height}`;

/** Reject unknown mechanics. M1 deliberately does not parse late-level entities. */
export function parseLevel(value: unknown): Level {
  const root = object(value, 'level', [
    'schemaVersion', 'id', 'order', 'chapter', 'title', 'chapterTitle', 'source',
    'spawn', 'initialSwitches', 'tiles', 'walls', 'switches', 'exits',
  ]);
  choice(root.schemaVersion, [1], 'schemaVersion');
  for (const key of ['id', 'title', 'chapterTitle']) text(root[key], key);
  for (const key of ['order', 'chapter']) integer(root[key], key, 1);
  const source = object(root.source, 'source', ['buildIndex', 'file', 'notes']);
  integer(source.buildIndex, 'source.buildIndex', 1);
  text(source.file, 'source.file');
  list(source.notes, 'source.notes').forEach((note) => text(note, 'source.notes[]'));
  const spawn = object(root.spawn, 'spawn', ['x', 'z', 'height', 'heading']);
  cell(spawn, 'spawn');
  choice(spawn.heading, [0, 1, 2, 3], 'spawn.heading');
  const initial = object(root.initialSwitches, 'initialSwitches', [
    'effective', 'pending', 'mixed', 'unaryPressed', 'dualPressed', 'dualActivated',
  ]);
  choice(initial.effective, [null, ...COLOURS], 'initialSwitches.effective');
  for (const key of ['pending', 'unaryPressed']) choice(initial[key], [null, ...PRIMARIES], `initialSwitches.${key}`);
  choice(initial.mixed, [true, false], 'initialSwitches.mixed');
  for (const key of ['dualPressed', 'dualActivated']) {
    const items = list(initial[key], `initialSwitches.${key}`);
    items.forEach((item) => choice(item, PRIMARIES, `initialSwitches.${key}[]`));
    if (new Set(items).size !== items.length) fail(`initialSwitches.${key}`, 'duplicate colours');
  }
  const ids = new Set<string>();
  for (const collection of ['tiles', 'walls', 'switches', 'exits'] as const) {
    const occupied = new Set<string>();
    const keys = collection === 'exits' ? ['x', 'z', 'height']
      : collection === 'switches' ? ['id', 'x', 'z', 'height', 'kind', 'colour']
        : ['id', 'x', 'z', 'height', 'colour'];
    list(root[collection], collection).forEach((entry, index) => {
      const path = `${collection}[${index}]`;
      const item = object(entry, path, keys);
      cell(item, path);
      const key = `${String(item.x)},${String(item.z)},${String(item.height)}`;
      if (occupied.has(key)) fail(path, 'duplicate cell');
      occupied.add(key);
      if (collection !== 'exits') {
        text(item.id, `${path}.id`);
        const id = item.id as string;
        if (ids.has(id)) fail(path, 'duplicate entity ID');
        ids.add(id);
        choice(item.colour, collection === 'switches' ? PRIMARIES : [null, ...COLOURS], `${path}.colour`);
      }
      if (collection === 'switches') choice(item.kind, ['unary', 'dual'], `${path}.kind`);
    });
  }
  // All shapes have been checked; subsequent checks enforce cross-field invariants.
  const level = structuredClone(value) as Level;
  const supported = new Set(level.tiles.map(cellKey));
  if (level.tiles.length === 0 || level.exits.length === 0) fail('level', 'requires tiles and exits');
  for (const item of [level.spawn, ...level.exits, ...level.switches, ...level.walls]) {
    if (!supported.has(cellKey(item))) fail('level', 'entity has no defined support');
  }
  if (level.exits.some((exit) => cellKey(exit) === cellKey(level.spawn))) fail('spawn', 'cannot start at exit');
  const initialState = level.initialSwitches;
  const present = (colour: typeof COLOURS[number] | null): boolean => colour === null || colour !== initialState.effective;
  if (!level.tiles.some((tile) => cellKey(tile) === cellKey(level.spawn) && present(tile.colour))) fail('spawn', 'support initially absent');
  if (level.walls.some((wall) => cellKey(wall) === cellKey(level.spawn) && present(wall.colour))) fail('spawn', 'blocked by wall');
  validateInitialSwitches(initialState);
  const hasSwitch = (kind: 'unary' | 'dual', colour: unknown): boolean => level.switches.some((s) => s.kind === kind && s.colour === colour);
  if (initialState.unaryPressed !== null && !hasSwitch('unary', initialState.unaryPressed)) fail('initialSwitches', 'missing pressed unary switch');
  if (initialState.dualPressed.some((colour) => !hasSwitch('dual', colour))) fail('initialSwitches', 'missing pressed dual switch');
  return freeze(level);
}

function validateInitialSwitches(state: SwitchState): void {
  if (state.pending !== null && !state.dualPressed.includes(state.pending)) fail('initialSwitches', 'pending colour must be pressed');
  if (state.dualActivated.some((colour) => !state.dualPressed.includes(colour))) fail('initialSwitches', 'activated colour must be pressed');
  if (!state.mixed && state.dualActivated.length > 0) fail('initialSwitches', 'activation requires mixed state');
  if (state.unaryPressed !== null && (state.effective !== state.unaryPressed || state.mixed)) fail('initialSwitches', 'inconsistent unary state');
}

function freeze<T>(value: T): T {
  if (typeof value === 'object' && value !== null) {
    for (const child of Object.values(value)) freeze(child);
    Object.freeze(value);
  }
  return value;
}
