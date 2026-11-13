import { describe, expect, it, vi } from 'vitest';
import { KeyboardActions } from '../src/input/keyboard.ts';

const edge = (code: string, repeat = false) => ({ code, repeat, altKey: false, ctrlKey: false, metaKey: false, preventDefault: vi.fn() });

describe('keyboard event ownership', () => {
  it('consumes each physical event once when Phaser revisits events within one frame', () => {
    const input = new KeyboardActions();
    const down = edge('KeyW'), up = edge('KeyW');
    expect(input.down(down)).toBe('forward');
    input.up(up);
    // Replaying an old down/up pair must not create an action or release a newer held key.
    expect(input.down(down)).toBeUndefined();
    const next = edge('KeyW');
    expect(input.down(next)).toBe('forward');
    input.up(up);
    expect(input.down(edge('KeyW'))).toBeUndefined();
    input.up(edge('KeyW'));
    expect(input.down(edge('KeyW'))).toBe('forward');
  });

  it('ignores repeats and keeps recovery/debug controls edge-triggered', () => {
    const input = new KeyboardActions();
    expect(input.down(edge('KeyW', true))).toBeUndefined();
    expect(input.down(edge('KeyW'))).toBe('forward');
    expect(input.down(edge('KeyW'))).toBeUndefined();
    input.clear();
    expect(input.down(edge('KeyW', true))).toBeUndefined();
    expect(input.down(edge('KeyZ'))).toBe('undo');
    expect(input.down(edge('KeyR'))).toBe('restart');
    expect(input.down(edge('Escape'))).toBe('pause');
    expect(input.down(edge('F1'))).toBe('debug');
    expect(input.down(edge('KeyQ'))).toBeUndefined();
    const shortcut = { ...edge('KeyR'), ctrlKey: true };
    expect(input.down(shortcut)).toBeUndefined();
    expect(shortcut.preventDefault).not.toHaveBeenCalled();
  });
});
