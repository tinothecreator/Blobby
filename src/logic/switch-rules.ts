import type { Primary, Switch, SwitchOutcome, SwitchState } from './types.ts';

export const EMPTY_SWITCHES: SwitchState = Object.freeze({
  effective: null, pending: null, mixed: false, unaryPressed: null,
  dualPressed: Object.freeze([]), dualActivated: Object.freeze([]),
});

/** Observed RulesManager.dualButton table; same-colour returns no mixture. */
export function mix(first: Primary, second: Primary): 'purple' | 'green' | 'orange' | null {
  if (first === second) return null;
  if (first !== 'yellow' && second !== 'yellow') return 'purple';
  return first === 'blue' || second === 'blue' ? 'green' : 'orange';
}

function union(...colours: readonly (readonly Primary[])[]): readonly Primary[] {
  return [...new Set(colours.flat())].sort();
}

/**
 * ASSUMED conservative source-order policy; see SPEC "Needs verification".
 * All pending/third/repeat/cancellation behaviour lives here, not in movement/UI.
 * Unary does not clear pending; source updateButtons clears activated dual flags
 * only when the PREVIOUS mixed flag is true. Do not simplify that ordering.
 */
export function resolveSwitch(
  state: SwitchState,
  input: Pick<Switch, 'kind' | 'colour'>,
): { readonly state: SwitchState; readonly outcome: SwitchOutcome } {
  const colour = input.colour;
  if (input.kind === 'unary') {
    if (state.unaryPressed === colour) return { state, outcome: 'disabled' };
    return {
      outcome: 'selected',
      state: {
        ...state, effective: colour, unaryPressed: colour,
        dualPressed: state.mixed
          ? state.dualPressed.filter((c) => !state.dualActivated.includes(c))
          : [...state.dualPressed],
        dualActivated: state.mixed ? [] : [...state.dualActivated],
        mixed: false,
      },
    };
  }
  if (state.dualPressed.includes(colour)) return { state, outcome: 'disabled' };
  if (state.pending === null) {
    return {
      outcome: 'pending',
      state: { ...state, pending: colour, dualPressed: union(state.dualPressed, [colour]) },
    };
  }
  const effective = mix(state.pending, colour);
  // Valid states cannot reach a same-colour pair: all matching tags are pressed.
  if (effective === null) throw new Error('Inconsistent pending dual state');
  const activated = union(state.dualActivated, [state.pending, colour]);
  const pressed = union(state.dualPressed, [colour]);
  return {
    outcome: 'mixed',
    state: {
      effective, pending: null, unaryPressed: null, mixed: true,
      dualPressed: state.mixed ? pressed.filter((c) => !activated.includes(c)) : pressed,
      dualActivated: state.mixed ? [] : activated,
    },
  };
}
