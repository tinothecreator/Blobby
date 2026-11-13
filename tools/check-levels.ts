import { loadLevels } from './levels.ts';

const { levels, coverage } = loadLevels();
console.log(coverage);
for (const level of levels) {
  console.log(`${level.id}: valid (${level.tiles.length} tiles, ${level.switches.length} switches, ${level.exits.length} exits)`);
}
