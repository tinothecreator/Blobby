import { describe, expect, it } from 'vitest';
import { EMPTY_SWITCHES, mix, resolveSwitch } from '../src/logic/switch-rules.ts';
import type { Primary, SwitchState } from '../src/logic/types.ts';
import { freeze } from './fixtures.ts';

const press = (state: SwitchState, colour: Primary, kind: 'unary' | 'dual' = 'dual') => resolveSwitch(state, { colour, kind });
const pair = () => press(press(EMPTY_SWITCHES, 'red').state, 'blue').state;

describe('OBSERVED primary mixing table', () => {
  it.each([
    ['red', 'blue', 'purple'], ['blue', 'red', 'purple'],
    ['blue', 'yellow', 'green'], ['yellow', 'blue', 'green'],
    ['red', 'yellow', 'orange'], ['yellow', 'red', 'orange'],
    ['red', 'red', null], ['blue', 'blue', null], ['yellow', 'yellow', null],
  ] as const)('%s + %s = %s', (a, b, expected) => expect(mix(a, b)).toBe(expected));
});

describe('ASSUMED source-order switch policy — SPEC Needs verification', () => {
  it('records a first dual selection without changing the board colour', () => {
    const state = press(EMPTY_SWITCHES, 'yellow', 'unary').state;
    const result = press(freeze(state), 'red');
    expect(result.outcome).toBe('pending');
    expect(result.state).toEqual({ ...state, pending: 'red', dualPressed: ['red'] });
  });

  it('blocks same-colour repeats, including a duplicate switch of that colour', () => {
    for (const colour of ['red', 'blue', 'yellow'] as const) {
      const state = press(EMPTY_SWITCHES, colour).state;
      expect(press(freeze(state), colour)).toEqual({ state, outcome: 'disabled' });
    }
  });

  it('applies the second primary as a mixture, marks both colours and clears pending/unary', () => {
    expect(pair()).toEqual({ effective: 'purple', pending: null, mixed: true,
      unaryPressed: null, dualPressed: ['blue', 'red'], dualActivated: ['blue', 'red'] });
  });

  it('does not cancel pending dual when unary is selected', () => {
    const pending = press(EMPTY_SWITCHES, 'red').state;
    const unary = press(freeze(pending), 'yellow', 'unary').state;
    expect(unary).toEqual({ ...pending, effective: 'yellow', unaryPressed: 'yellow' });
    expect(press(unary, 'blue').state.effective).toBe('purple');
  });

  it('keeps selected unary disabled rather than clearing it', () => {
    const state = press(EMPTY_SWITCHES, 'red', 'unary').state;
    expect(press(freeze(state), 'red', 'unary')).toEqual({ state, outcome: 'disabled' });
    expect(press(state, 'blue', 'unary').state.unaryPressed).toBe('blue');
  });

  it('rejects either pressed pair member as third press', () => {
    const state = freeze(pair());
    expect(press(state, 'red')).toEqual({ state, outcome: 'disabled' });
    expect(press(state, 'blue')).toEqual({ state, outcome: 'disabled' });
  });

  it('allows unused third primary to become pending while retaining mixture/old pair', () => {
    const state = freeze(pair());
    expect(press(state, 'yellow')).toEqual({ outcome: 'pending', state: {
      ...state, pending: 'yellow', dualPressed: ['blue', 'red', 'yellow'],
    } });
  });

  it('unary after mixed clears activated flags but preserves an unactivated third pending', () => {
    const third = press(pair(), 'yellow').state;
    const unary = press(freeze(third), 'blue', 'unary').state;
    expect(unary).toEqual({ effective: 'blue', unaryPressed: 'blue', mixed: false,
      pending: 'yellow', dualPressed: ['yellow'], dualActivated: [] });
    expect(press(unary, 'red').state.effective).toBe('orange');
  });

  it('fourth same-colour repeats remain disabled; never accumulates a tertiary colour', () => {
    const third = freeze(press(pair(), 'yellow').state);
    for (const colour of ['red', 'blue', 'yellow'] as const) {
      expect(press(third, colour)).toEqual({ state: third, outcome: 'disabled' });
    }
  });

  it('preserves literal previous-mixed cleanup order on a valid next pair', () => {
    // This branch may be unreachable from EMPTY_SWITCHES. Exercise it directly
    // to retain source ordering for future imported initial switch states.
    const before: SwitchState = freeze({ effective: 'purple', pending: 'yellow',
      mixed: true, unaryPressed: null, dualPressed: ['yellow'], dualActivated: [] });
    const next = press(before, 'red').state;
    expect(next).toEqual({ effective: 'orange', pending: null, mixed: true,
      unaryPressed: null, dualPressed: [], dualActivated: [] });
  });
});
