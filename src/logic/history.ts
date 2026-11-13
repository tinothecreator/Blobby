import { apply, createState } from './core.ts';
import type { Action, Level, MoveResult, State } from './types.ts';

/** Plain-data snapshots, unlimited within the current level. No engine imports. */
export class History {
  readonly #level: Level;
  #state: State;
  #past: State[] = [];

  constructor(level: Level) {
    this.#level = structuredClone(level);
    this.#state = createState(this.#level);
  }

  get state(): State { return structuredClone(this.#state); }
  get depth(): number { return this.#past.length; }

  move(action: Action): MoveResult {
    const result = apply(this.#level, this.#state, action);
    if (result.accepted) {
      this.#past.push(structuredClone(this.#state));
      this.#state = result.state;
    }
    return structuredClone(result);
  }

  undo(): boolean {
    const previous = this.#past.pop();
    if (!previous) return false;
    this.#state = previous;
    return true;
  }

  restart(): void {
    this.#past = [];
    this.#state = createState(this.#level);
  }
}
