import Phaser from 'phaser';
import { PlayScene } from './scenes/PlayScene.ts';
import './style.css';

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: 1364,
  height: 762,
  backgroundColor: '#172732',
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: [PlayScene],
  audio: { noAudio: true },
  input: { keyboard: false },
});

// Read-only inspection of the same scene used by keyboard play, for browser verification.
Object.assign(window, { game });
if (import.meta.hot) import.meta.hot.dispose(() => game.destroy(true));
