import { readFileSync } from 'node:fs';
import { parseLevel } from '../src/logic/level.ts';

export function loadLevels() {
  const manifest = JSON.parse(readFileSync(new URL('../src/levels/manifest.json', import.meta.url), 'utf8')) as {
    schemaVersion: number; coverage: string; levels: string[];
  };
  if (manifest.schemaVersion !== 1 || !Array.isArray(manifest.levels) || manifest.levels.length === 0) {
    throw new Error('Unsupported/empty manifest');
  }
  const levels = manifest.levels.map((file) => {
    if (!/^[a-z0-9-]+\.json$/.test(file)) throw new Error('Invalid level filename');
    return parseLevel(JSON.parse(readFileSync(new URL(`../src/levels/${file}`, import.meta.url), 'utf8')));
  });
  if (new Set(levels.map((l) => l.id)).size !== levels.length) throw new Error('Duplicate level IDs');
  levels.forEach((level, index) => {
    if (level.order !== index + 1 || level.source.buildIndex !== level.order) throw new Error('Unexpected source order');
  });
  return { levels, coverage: manifest.coverage };
}
