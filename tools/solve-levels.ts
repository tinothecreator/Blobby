import { solve, replay } from '../src/logic/solver.ts';
import { isWin } from '../src/logic/core.ts';
import { loadLevels } from './levels.ts';

const { levels, coverage } = loadLevels();
console.log(coverage);
for (const level of levels) {
  const result = solve(level);
  console.log(JSON.stringify({ id: level.id, ...result }));
  if (result.status !== 'solved' || !isWin(replay(level, result.actions))) process.exitCode = 1;
}
