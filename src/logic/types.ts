export const PRIMARIES = ['red', 'blue', 'yellow'] as const;
export const COLOURS = [...PRIMARIES, 'purple', 'green', 'orange'] as const;
export const ACTIONS = ['forward', 'left', 'right', 'back'] as const;
export type Primary = typeof PRIMARIES[number];
export type Colour = typeof COLOURS[number];
export type Action = typeof ACTIONS[number];
// Clockwise around world Y: +Z, +X, -Z, -X; independent of camera projection.
export type Heading = 0 | 1 | 2 | 3;
export interface Cell { readonly x: number; readonly z: number; readonly height: number }
export interface Tile extends Cell { readonly id: string; readonly colour: Colour | null }
export interface Wall extends Cell { readonly id: string; readonly colour: Colour | null }
export interface Switch extends Cell {
  readonly id: string;
  readonly kind: 'unary' | 'dual';
  readonly colour: Primary;
}
export interface SwitchState {
  readonly effective: Colour | null;
  readonly pending: Primary | null;
  readonly mixed: boolean;
  readonly unaryPressed: Primary | null;
  readonly dualPressed: readonly Primary[];
  readonly dualActivated: readonly Primary[];
}
export interface Level {
  readonly schemaVersion: 1;
  readonly id: string;
  readonly order: number;
  readonly chapter: number;
  readonly title: string;
  readonly chapterTitle: string;
  readonly source: {
    readonly buildIndex: number;
    readonly file: string;
    readonly notes: readonly string[];
  };
  readonly spawn: Cell & { readonly heading: Heading };
  readonly initialSwitches: SwitchState;
  readonly tiles: readonly Tile[];
  readonly walls: readonly Wall[];
  readonly switches: readonly Switch[];
  readonly exits: readonly Cell[];
}
export interface State {
  readonly levelId: string;
  readonly position: Cell;
  readonly heading: Heading;
  readonly switches: SwitchState;
  readonly status: 'playing' | 'fallen' | 'won';
  readonly actions: number;
  readonly steps: number;
}
export type SwitchOutcome = 'disabled' | 'pending' | 'selected' | 'mixed';
export type Event =
  | { readonly type: 'turned'; readonly from: Heading; readonly to: Heading }
  | { readonly type: 'moved'; readonly from: Cell; readonly to: Cell }
  | { readonly type: 'switch'; readonly id: string; readonly outcome: SwitchOutcome }
  | { readonly type: 'colour-changed'; readonly from: Colour | null; readonly to: Colour | null }
  | { readonly type: 'fell'; readonly at: Cell }
  | { readonly type: 'won'; readonly levelId: string };
export interface MoveResult {
  readonly accepted: boolean;
  readonly reason: 'accepted' | 'unsupported' | 'wall' | 'terminal';
  readonly state: State;
  readonly events: readonly Event[];
}
