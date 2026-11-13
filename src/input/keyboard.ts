import type { Action } from '../logic/types.ts';

export type Command = Action | 'undo' | 'restart' | 'pause' | 'debug';
const BINDINGS: Readonly<Record<string, Command>> = {
  KeyW: 'forward', ArrowUp: 'forward', KeyA: 'left', ArrowLeft: 'left',
  KeyD: 'right', ArrowRight: 'right', KeyS: 'back', ArrowDown: 'back',
  KeyZ: 'undo', KeyR: 'restart', Escape: 'pause', F1: 'debug',
};

/** Edge-triggered discrete controls. Keyup is never prevented (Phaser 4.2 contract). */
export class KeyboardActions {
  readonly #held = new Set<string>();
  // Repeated delivery of the same event cannot create another edge or release a
  // newer held key. Weak references do not retain completed DOM events.
  readonly #seen = new WeakSet<object>();

  down(event: Pick<KeyboardEvent, 'code' | 'repeat' | 'preventDefault' | 'altKey' | 'ctrlKey' | 'metaKey'>): Command | undefined {
    if (this.#seen.has(event)) return undefined;
    this.#seen.add(event);
    if (event.altKey || event.ctrlKey || event.metaKey) return undefined;
    const command = BINDINGS[event.code];
    if (!command) return undefined;
    event.preventDefault();
    if (event.repeat || this.#held.has(event.code)) return undefined;
    this.#held.add(event.code);
    return command;
  }

  up(event: Pick<KeyboardEvent, 'code'>): void {
    if (this.#seen.has(event)) return;
    this.#seen.add(event);
    this.#held.delete(event.code);
  }
  clear(): void { this.#held.clear(); }
}
