import Phaser from 'phaser';
import data from '../levels/puzzle-01.json';
import { parseLevel } from '../logic/level.ts';
import { History } from '../logic/history.ts';
import { stateHash } from '../logic/core.ts';
import type { Action, MoveResult, State } from '../logic/types.ts';
import { KeyboardActions } from '../input/keyboard.ts';
import type { Command } from '../input/keyboard.ts';
import { drawActor, drawBoard, project } from '../view/board.ts';

const level = parseLevel(data);
// ASSUMED placeholder timings in milliseconds; visual completion never decides rules.
const STEP_MS = 180;
const TURN_MS = 140;
const TERMINAL_MS = 420;
interface Animation {
  readonly before: State;
  readonly result: MoveResult;
  elapsed: number;
  readonly duration: number;
}

export class PlayScene extends Phaser.Scene {
  private history = new History(level);
  private keys = new KeyboardActions();
  private queued: Action | null = null;
  private animation: Animation | null = null;
  private paused = false;
  private showDebug = false;
  private board!: Phaser.GameObjects.Graphics;
  private actor!: Phaser.GameObjects.Graphics;
  private debug!: Phaser.GameObjects.Text;
  private message!: Phaser.GameObjects.Text;
  private pauseShade!: Phaser.GameObjects.Rectangle;
  private completions = 0;

  constructor() { super('play'); }

  create(): void {
    this.history = new History(level);
    this.keys = new KeyboardActions();
    this.queued = null; this.animation = null; this.paused = false; this.showDebug = false; this.completions = 0;
    this.add.text(40, 34, 'HUE TRAILS  /  01', { fontFamily: 'monospace', fontSize: '16px', color: '#aac3cd' });
    this.add.text(40, 64, level.title, { fontFamily: 'sans-serif', fontSize: '30px', color: '#f0f7fa' });
    this.board = this.add.graphics();
    this.actor = this.add.graphics().setDepth(1);
    this.add.text(682, 666, 'W / ↑  Forward     A / ←  Turn left     D / →  Turn right     S / ↓  Turn around', {
      fontFamily: 'monospace', fontSize: '16px', color: '#c2d4dd',
    }).setOrigin(0.5);
    this.add.text(682, 703, 'Z  Undo     R  Restart     Esc  Pause     F1  Debug', {
      fontFamily: 'monospace', fontSize: '15px', color: '#9ab2bf',
    }).setOrigin(0.5);
    this.pauseShade = this.add.rectangle(682, 381, 1364, 762, 0x0a1620, 0.75).setDepth(8).setVisible(false);
    this.message = this.add.text(682, 596, '', {
      fontFamily: 'sans-serif', fontSize: '23px', color: '#f1d875', align: 'center',
    }).setOrigin(0.5).setDepth(9);
    this.debug = this.add.text(35, 132, '', {
      fontFamily: 'monospace', fontSize: '13px', color: '#e5f7ff', backgroundColor: '#10212c',
      padding: { x: 10, y: 10 },
    }).setDepth(10).setVisible(false);

    const down = (event: KeyboardEvent): void => {
      const command = this.keys.down(event);
      if (command) this.command(command);
    };
    const up = (event: KeyboardEvent): void => this.keys.up(event);
    const blur = (): void => { this.keys.clear(); this.setPaused(true); };
    // Native edges avoid Phaser's timestamp-based keyboard deduplication and its
    // revisited per-frame event queue. This scene explicitly owns both listeners.
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    this.game.events.on(Phaser.Core.Events.BLUR, blur);
    this.game.events.on(Phaser.Core.Events.HIDDEN, blur);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      this.game.events.off(Phaser.Core.Events.BLUR, blur);
      this.game.events.off(Phaser.Core.Events.HIDDEN, blur);
      this.keys.clear(); this.queued = null; this.animation = null;
    });
    this.sync();
  }

  private command(command: Command): void {
    if (command === 'debug') {
      this.showDebug = !this.showDebug; this.debug.setVisible(this.showDebug); this.updateDebug(); return;
    }
    if (command === 'pause') { this.setPaused(!this.paused); return; }
    if (command === 'undo' || command === 'restart') {
      this.cancelAnimation();
      if (command === 'undo') this.history.undo(); else this.history.restart();
      this.sync(); return;
    }
    if (this.paused) return;
    if (this.animation) {
      // First arriving edge wins; later edges cannot create a second queued action.
      this.queued ??= command; return;
    }
    this.begin(command);
  }

  private setPaused(value: boolean): void {
    this.cancelAnimation();
    this.paused = value;
    this.pauseShade.setVisible(value);
    this.sync();
  }

  private cancelAnimation(): void {
    this.queued = null;
    this.animation = null;
    this.actor.setAlpha(1).setScale(1);
  }

  private begin(action: Action): void {
    const before = this.history.state;
    const result = this.history.move(action);
    if (!result.accepted) return;
    const terminal = result.events.some((event) => event.type === 'fell' || event.type === 'won');
    this.animation = { before, result, elapsed: 0, duration: (action === 'forward' ? STEP_MS : TURN_MS) + (terminal ? TERMINAL_MS : 0) };
    drawBoard(this.board, level, result.state);
    this.message.setText('');
    this.updateDebug();
  }

  update(_time: number, delta: number): void {
    const animation = this.animation;
    if (!animation || this.paused) return;
    animation.elapsed = Math.min(animation.elapsed + delta, animation.duration);
    const { before, result } = animation;
    const moved = result.events.some((event) => event.type === 'moved');
    const motionMs = moved ? STEP_MS : TURN_MS;
    const t = Math.min(animation.elapsed / motionMs, 1);
    const eased = t*t*(3-2*t);
    const from = project(before.position), to = project(result.state.position);
    drawActor(this.actor, t < 0.5 ? before.heading : result.state.heading, result.state.switches.effective);
    this.actor.setPosition(from.x+(to.x-from.x)*eased, from.y+(to.y-from.y)*eased - (moved ? Math.sin(t*Math.PI)*8 : 0));
    if (!moved) this.actor.setScale(1 - Math.sin(t*Math.PI)*0.12, 1 + Math.sin(t*Math.PI)*0.08);
    const terminalT = Phaser.Math.Clamp((animation.elapsed-motionMs)/TERMINAL_MS, 0, 1);
    if (result.events.some((event) => event.type === 'fell')) {
      this.actor.y += 150*terminalT*terminalT;
      this.actor.setAlpha(1-terminalT);
    } else if (result.events.some((event) => event.type === 'won')) {
      this.actor.setScale(1-terminalT*0.9).setAlpha(1-terminalT);
    }
    if (animation.elapsed < animation.duration) return;
    this.animation = null;
    this.completions++;
    this.sync();
    const queued = this.queued;
    this.queued = null;
    if (queued) this.begin(queued);
  }

  private sync(): void {
    const state = this.history.state;
    drawBoard(this.board, level, state);
    drawActor(this.actor, state.heading, state.switches.effective);
    const at = project(state.position);
    this.actor.setPosition(at.x, at.y).setScale(1).setAlpha(state.status === 'playing' ? 1 : 0);
    this.message.setText(this.paused ? 'Paused · Esc to resume' : state.status === 'won' ? 'Path complete · Z to undo or R to replay' : state.status === 'fallen' ? 'Fallen · Z to undo or R to restart' : '');
    this.updateDebug();
  }

  private updateDebug(): void {
    const state = this.history.state;
    this.debug.setText(`hash ${stateHash(state)}\nactions ${state.actions}   heading ${state.heading}   colour ${state.switches.effective ?? 'neutral'}`);
  }

  /** Diagnostics do not expose a state setter or an alternate action path. */
  inspect() {
    return {
      state: this.history.state, hash: stateHash(this.history.state), historyDepth: this.history.depth,
      animating: this.animation !== null, animationElapsed: this.animation?.elapsed ?? null,
      queued: this.queued, paused: this.paused, debugVisible: this.debug.visible, completions: this.completions,
      children: this.children.length, blurListeners: this.game.events.listenerCount(Phaser.Core.Events.BLUR),
      hiddenListeners: this.game.events.listenerCount(Phaser.Core.Events.HIDDEN),
      actor: { x: this.actor.x, y: this.actor.y, alpha: this.actor.alpha, scale: this.actor.scaleX },
    };
  }
}
