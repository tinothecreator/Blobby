import { expect, test } from '@playwright/test';
import { writeFileSync } from 'node:fs';
import type { Page } from '@playwright/test';
import type { PlayScene } from '../src/scenes/PlayScene.ts';
import type { Action } from '../src/logic/types.ts';
import { parseLevel } from '../src/logic/level.ts';
import { apply, createState, stateHash } from '../src/logic/core.ts';
import { solve } from '../src/logic/solver.ts';
import data from '../src/levels/puzzle-01.json' with { type: 'json' };

const level = parseLevel(data);
const solution = solve(level);
if (solution.status !== 'solved') throw new Error('Expected a solver witness');
const actions = solution.actions;
const keys: Readonly<Record<Action, string>> = { forward: 'w', left: 'a', right: 'd', back: 's' };
const inspect = (page: Page) => page.evaluate(() => (window.game.scene.getScene('play') as PlayScene).inspect());
const advance = (page: Page, ms = 240) => page.clock.runFor(ms);
async function windowListeners(page: Page) {
  const session = await page.context().newCDPSession(page);
  const handle = await session.send('Runtime.evaluate', { expression: 'window' });
  const objectId = handle.result.objectId;
  if (!objectId) throw new Error('Expected window handle');
  const { listeners } = await session.send('DOMDebugger.getEventListeners', { objectId });
  const counts = {
    keydown: listeners.filter((listener) => listener.type === 'keydown').length,
    keyup: listeners.filter((listener) => listener.type === 'keyup').length,
  };
  await session.detach();
  return counts;
}
let errors: string[] = [];

test.afterEach(() => { expect(errors).toEqual([]); });

test.beforeEach(async ({ page, browser }) => {
  errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  // Every test fails on browser errors, including those emitted during recovery.
  await page.clock.install({ time: new Date('2026-11-13T12:00:00Z') });
  await page.clock.pauseAt(new Date('2026-11-13T12:00:01Z'));
  await page.goto('/');
  await expect(page.locator('canvas')).toBeVisible();
  await advance(page, 1000);
  await page.waitForFunction(() => window.game?.scene.getScene('play')?.sys.isActive());
  await advance(page, 300);
  writeFileSync('reference/compare/browser-evidence.json', JSON.stringify({
    browser: browser.version(), viewport: page.viewportSize(),
    renderer: await page.evaluate(() => window.game.renderer.type),
  }, null, 2));
});

test('keyboard replay matches every pure state and wins in 32 actions; full undo/replay', async ({ page }) => {
  let expected = createState(level);
  expect((await inspect(page)).debugVisible).toBe(false);
  await page.keyboard.press('F1');
  expect((await inspect(page)).debugVisible).toBe(true);
  await page.keyboard.press('F1');
  expect((await inspect(page)).debugVisible).toBe(false);
  expect(await page.locator('canvas').count()).toBe(1);
  for (const [index, action] of actions.entries()) {
    await page.keyboard.press(keys[action]);
    if (index === actions.length-1) {
      await advance(page, 320);
      const winning = await inspect(page);
      expect(winning.animating).toBe(true);
      expect(winning.actor.alpha).toBeGreaterThan(0);
      expect(winning.actor.alpha).toBeLessThan(1);
      expect(winning.actor.scale).toBeLessThan(1);
      await advance(page, 380);
    } else await advance(page, 240);
    expected = apply(level, expected, action).state;
    expect((await inspect(page)).hash).toBe(stateHash(expected));
    if (index === 0) await page.screenshot({ path: 'reference/compare/build-33.5s.png' });
  }
  const won = await inspect(page);
  expect(won.state).toMatchObject({ status: 'won', actions: 32, steps: 22, position: { x: -2, z: 2 }, heading: 0 });
  expect(won.actor.alpha).toBe(0);
  await page.screenshot({ path: 'reference/compare/build-win.png' });
  for (let i=0; i<actions.length; i++) await page.keyboard.press('z');
  expect((await inspect(page)).hash).toBe(stateHash(createState(level)));
  expected = createState(level);
  for (const [index, action] of actions.entries()) {
    await page.keyboard.press(keys[action]); await advance(page, index === actions.length-1 ? 700 : 240);
    expected = apply(level, expected, action).state;
    const actual = await inspect(page);
    expect(actual.hash, `replay step ${index+1}: ${JSON.stringify(actual)}`).toBe(stateHash(expected));
  }
  expect((await inspect(page)).hash).toBe(won.hash);
  await page.keyboard.press('r');
  expect((await inspect(page)).hash).toBe(stateHash(createState(level)));
});

test('held and spammed keys cannot apply mid-animation; first edge queues once', async ({ page }) => {
  await page.keyboard.down('w');
  await advance(page, 32);
  const started = await inspect(page);
  expect(started.animating).toBe(true);
  expect(started.state.actions).toBe(1);
  for (let i=0; i<8; i++) await page.keyboard.down('w'); // browser repeat=true
  expect((await inspect(page)).queued).toBe(null);
  await page.keyboard.up('w');
  for (let i=0; i<8; i++) await page.keyboard.press(i%2 === 0 ? 'd' : 'a');
  const spammed = await inspect(page);
  expect(spammed.hash).toBe(started.hash);
  expect(spammed.completions).toBe(started.completions);
  expect(spammed.queued).toBe('right');
  await advance(page, 80);
  expect((await inspect(page)).hash).toBe(started.hash);
  await advance(page, 300);
  const settled = await inspect(page);
  expect(settled.state.actions).toBe(2);
  expect(settled.state.heading).toBe(1);
  expect(settled.completions).toBe(2);
  expect(settled.queued).toBe(null);
  expect(settled.animating).toBe(false);
  await page.keyboard.down('a');
  await advance(page, 1000);
  for (let i=0; i<5; i++) await page.keyboard.down('a');
  await advance(page, 1000);
  expect((await inspect(page)).state.actions).toBe(3);
  await page.keyboard.up('a');
});

test('undo/restart/pause flush animations and queue; gaps block; recovery does not leak', async ({ page }) => {
  const baseline = await inspect(page);
  const baselineListeners = await windowListeners(page);
  expect(baselineListeners).toEqual({ keydown: 1, keyup: 1 });
  for (const recovery of ['z', 'r', 'Escape']) {
    await page.keyboard.press('w');
    await advance(page, 32);
    await page.keyboard.press('d');
    expect((await inspect(page)).queued).toBe('right');
    await page.keyboard.press(recovery);
    const recovered = await inspect(page);
    expect(recovered.queued).toBe(null);
    expect(recovered.animating, `${recovery}: ${JSON.stringify(recovered)}`).toBe(false);
    await advance(page, 600);
    expect((await inspect(page)).hash).toBe(recovered.hash);
    if (recovery === 'Escape') {
      await page.keyboard.press('w'); await advance(page);
      expect((await inspect(page)).hash).toBe(recovered.hash);
      await page.keyboard.press('Escape');
    }
    await page.keyboard.press('r');
  }
  // Spawn +X has no support. Turning is legal, walking into that gap is blocked.
  await page.keyboard.press('ArrowRight'); await advance(page);
  const turned = await inspect(page);
  await page.keyboard.press('ArrowUp'); await advance(page);
  expect((await inspect(page)).hash).toBe(turned.hash);
  await page.keyboard.press('ArrowDown'); await advance(page);
  expect((await inspect(page)).state.heading).toBe(3);
  await page.keyboard.press('ArrowLeft'); await advance(page);
  expect((await inspect(page)).state.heading).toBe(2);
  await page.keyboard.press('r');
  for (let i=0; i<60; i++) {
    await page.keyboard.press('w'); await advance(page, 32);
    await page.keyboard.press('z');
    await page.keyboard.press('r');
  }
  const after = await inspect(page);
  expect(after.hash).toBe(baseline.hash);
  expect(after.children).toBe(baseline.children);
  expect(await windowListeners(page)).toEqual(baselineListeners);
  expect(after.blurListeners).toBe(baseline.blurListeners);
  expect(after.hiddenListeners).toBe(baseline.hiddenListeners);
  expect(after.actor).toEqual(baseline.actor);
  // Actual scene shutdown/recreate also removes owned subscriptions.
  for (let i=0; i<8; i++) {
    await page.evaluate(() => window.game.scene.getScene('play').scene.restart());
    await advance(page);
  }
  const recreated = await inspect(page);
  expect(recreated.children).toBe(baseline.children);
  const recreatedListeners = await windowListeners(page);
  expect(recreatedListeners).toEqual(baselineListeners);
  expect(recreated.blurListeners).toBe(baseline.blurListeners);
  expect(recreated.hiddenListeners).toBe(baseline.hiddenListeners);
  writeFileSync('reference/compare/recovery-evidence.json', JSON.stringify({
    recoveryCycles: 60, sceneRestarts: 8, baseline, after, recreated, baselineListeners, recreatedListeners,
  }, null, 2));
  await page.keyboard.press('w');
  expect((await inspect(page)).state.actions).toBe(1);
});

test('focus loss clears queued input and pauses safely', async ({ page }) => {
  await page.keyboard.press('w'); await advance(page, 32);
  await page.keyboard.press('d');
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  const paused = await inspect(page);
  expect(paused.paused).toBe(true);
  expect(paused.queued).toBe(null);
  await page.keyboard.press('w'); await advance(page, 500);
  expect((await inspect(page)).hash).toBe(paused.hash);
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await page.keyboard.press('Escape');
  await advance(page, 500);
  expect((await inspect(page)).hash).toBe(paused.hash);
  expect((await inspect(page)).paused).toBe(false);
});

test('synthetic support disappearance uses the same fall animation and undo/restart recovery', async ({ page }) => {
  // Level 1 is entirely neutral and cannot fall. Replace only its imported JSON in this
  // browser test with a validated pure-rule fixture; no fixture is shipped or selected in UI.
  const synthetic = parseLevel({
    ...data,
    initialSwitches: { ...data.initialSwitches, effective: null, unaryPressed: null },
    tiles: [
      { id: 'start', x: 0, z: 0, height: 0, colour: null },
      { id: 'vanishing', x: 0, z: 1, height: 0, colour: 'red' },
      { id: 'exit', x: 0, z: 2, height: 0, colour: null },
    ],
    switches: [{ id: 'red-switch', x: 0, z: 1, height: 0, kind: 'unary', colour: 'red' }],
    exits: [{ x: 0, z: 2, height: 0 }],
  });
  await page.route('**/src/levels/puzzle-01.json*', (route) => route.fulfill({
    contentType: 'application/javascript', body: `export default ${JSON.stringify(synthetic)};`,
  }));
  await page.reload();
  await advance(page, 1000);
  await page.waitForFunction(() => window.game?.scene.getScene('play')?.sys.isActive());
  await advance(page, 300);
  const initial = await inspect(page);
  expect(initial.state.switches.effective).toBe(null);
  await page.keyboard.press('w');
  await advance(page, 320);
  const falling = await inspect(page);
  expect(falling.state.status).toBe('fallen');
  expect(falling.animating).toBe(true);
  expect(falling.actor.y).toBeGreaterThan(362);
  expect(falling.actor.alpha).toBeGreaterThan(0);
  expect(falling.actor.alpha).toBeLessThan(1);
  await page.keyboard.press('z');
  expect((await inspect(page)).hash).toBe(initial.hash);
  expect((await inspect(page)).actor.alpha).toBe(1);
  await page.keyboard.press('w'); await advance(page, 700);
  expect((await inspect(page)).state.status, JSON.stringify(await inspect(page))).toBe('fallen');
  expect((await inspect(page)).actor.alpha).toBe(0);
  await page.keyboard.press('r');
  expect((await inspect(page)).hash).toBe(initial.hash);
});
