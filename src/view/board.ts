import Phaser from 'phaser';
import { hasSupport, sameCell } from '../logic/core.ts';
import type { Cell, Colour, Heading, Level, State } from '../logic/types.ts';

// ASSUMED presentation constants; source world axes are preserved, camera is fixed.
export const palette: Readonly<Record<Colour, number>> = {
  blue: 0x52cce8, red: 0xef7482, yellow: 0xf1d875,
  purple: 0xb89ae5, green: 0x8bd4a6, orange: 0xf1ac72,
};
export function project(cell: Cell): { x: number; y: number } {
  return { x: 690 + (cell.x - cell.z) * 55, y: 390 - (cell.x + cell.z) * 28 - cell.height * 45 };
}
function polygon(g: Phaser.GameObjects.Graphics, points: readonly (readonly [number, number])[], colour: number): void {
  g.fillStyle(colour).fillPoints(points.map(([x, y]) => new Phaser.Math.Vector2(x, y)), true);
}

/** One persistent board Graphics; rebuild its commands from pure state after recovery. */
export function drawBoard(g: Phaser.GameObjects.Graphics, level: Level, state: State): void {
  g.clear();
  for (const tile of [...level.tiles].sort((a, b) => project(a).y - project(b).y)) {
    if (!hasSupport(level, state, tile)) continue;
    const { x, y } = project(tile);
    polygon(g, [[x-53,y],[x,y+27],[x+53,y],[x+53,y+12],[x,y+39],[x-53,y+12]], 0x253b49);
    polygon(g, [[x-52,y],[x,y-26],[x+52,y],[x,y+26]], tile.colour ? palette[tile.colour] : 0x8499a5);
    g.lineStyle(1, 0xb5c6cf, 0.45).strokePoints([
      new Phaser.Math.Vector2(x-52,y), new Phaser.Math.Vector2(x,y-26), new Phaser.Math.Vector2(x+52,y),
    ]);
    const button = level.switches.find((s) => sameCell(s, tile));
    if (button) {
      g.lineStyle(4, palette[button.colour]).strokeEllipse(x, y-3, 48, 23);
      g.fillStyle(palette[button.colour]).fillEllipse(x, y-5, 30, 14);
      g.fillStyle(0xf4fbff).fillCircle(x, y-5, 3);
    }
    if (level.exits.some((exit) => sameCell(exit, tile))) {
      // Original geometric portal: rectangular doorway and inset oval, no source texture.
      g.fillStyle(0x304957).fillRoundedRect(x-25, y-79, 50, 84, 9);
      g.lineStyle(4, 0xf1d875).strokeRoundedRect(x-22, y-77, 44, 80, 8);
      g.fillStyle(0xaddfe0, 0.9).fillEllipse(x, y-38, 29, 64);
    }
  }
}

/** Abstract faceted actor with an explicit light facing arrow; all geometry is authored here. */
export function drawActor(g: Phaser.GameObjects.Graphics, heading: Heading, colour: Colour | null): void {
  g.clear();
  g.fillStyle(0x0a141b, 0.35).fillEllipse(0, 5, 47, 19);
  polygon(g, [[-19,-9],[0,-54],[19,-9],[0,2]], colour ? palette[colour] : 0xd9e5e9);
  polygon(g, [[0,-54],[19,-9],[0,2]], 0x385665);
  const vectors = [{x:-1,y:-0.51},{x:1,y:-0.51},{x:1,y:0.51},{x:-1,y:0.51}] as const;
  const v = vectors[heading];
  const ex = v.x * 35, ey = v.y * 35 - 20;
  g.lineStyle(5, 0xf7fbff).lineBetween(0, -20, ex, ey);
  const length = Math.hypot(v.x, v.y), ux = v.x/length, uy = v.y/length;
  polygon(g, [[ex,ey],[ex-ux*12-uy*7,ey-uy*12+ux*7],[ex-ux*12+uy*7,ey-uy*12-ux*7]], 0xf7fbff);
}
