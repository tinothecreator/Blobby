import { apply, createState, isWin, searchKey } from './core.ts';
import { ACTIONS } from './types.ts';
import type { Action, Level, State } from './types.ts';

export type Solution =
  | { readonly status: 'solved'; readonly actions: readonly Action[]; readonly steps: number; readonly explored: number }
  | { readonly status: 'unsolvable' | 'limit'; readonly explored: number };

/** Exact BFS for minimum accepted actions, including turns. A limit is not a proof. */
export function solve(level: Level, maxStates = 100_000): Solution {
  if (!Number.isInteger(maxStates) || maxStates < 1) throw new Error('Invalid state limit');
  interface Node { readonly state: State; readonly parent: number; readonly action: Action | null }
  const nodes: Node[] = [{ state: createState(level), parent: -1, action: null }];
  const seen = new Set([searchKey(nodes[0]!.state)]);
  for (let head = 0; head < nodes.length; head++) {
    const node = nodes[head]!;
    if (isWin(node.state)) {
      const actions: Action[] = [];
      let cursor = node;
      while (cursor.action !== null) {
        actions.push(cursor.action);
        cursor = nodes[cursor.parent]!;
      }
      return { status: 'solved', actions: actions.reverse(), steps: node.state.steps, explored: head + 1 };
    }
    for (const action of ACTIONS) {
      const result = apply(level, node.state, action);
      if (!result.accepted || result.state.status === 'fallen') continue;
      const key = searchKey(result.state);
      if (seen.has(key)) continue;
      if (nodes.length >= maxStates) return { status: 'limit', explored: head + 1 };
      seen.add(key);
      nodes.push({ state: result.state, parent: head, action });
    }
  }
  return { status: 'unsolvable', explored: nodes.length };
}

export function replay(level: Level, actions: readonly Action[]): State {
  let state = createState(level);
  for (const action of actions) {
    const result = apply(level, state, action);
    if (!result.accepted) throw new Error(`Invalid replay action ${action}: ${result.reason}`);
    state = result.state;
  }
  return state;
}
