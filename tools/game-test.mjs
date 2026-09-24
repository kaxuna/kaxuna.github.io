// Play-tests the game in real Chrome via Playwright (dev server must be running).
// - Checks every achievement block and skill gem can be reached by jumping from the surface below it.
// - Screenshots each stage on desktop, plus title/logbook/ending and an iPhone portrait run.
// Usage: node tools/game-test.mjs [baseUrl]
import { chromium, devices } from 'playwright';
import { mkdirSync } from 'node:fs';

const base = (process.argv[2] ?? 'http://localhost:5174/') + '?debug';
const out = 'shots/game/';
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome' });
const errors = [];

async function newPage(opts) {
  const ctx = await browser.newContext(opts);
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(base, { waitUntil: 'networkidle' });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(600);
  return { ctx, page };
}

// Put the player on the surface under (px, row) and do a full-height jump.
async function jumpUnder(page, px, row) {
  await page.evaluate(({ px, row }) => {
    const w = window.__game.world;
    const L = w.level;
    const tx = Math.floor(px / 16);
    let r = row + 1;
    while (r < 15) {
      const t = L.get(tx, r);
      if ([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].includes(t)) break;
      r++;
    }
    w.p.x = px - w.p.w / 2;
    w.p.y = r * 16 - w.p.h;
    w.p.vx = 0;
    w.p.vy = 0;
    w.p.invuln = 5;
    for (const e of w.enemies) { e.alive = false; e.dead = 0; }
  }, { px, row });
  await page.waitForTimeout(60);
  await page.keyboard.down('Space');
  await page.waitForTimeout(650);
  await page.keyboard.up('Space');
  await page.waitForTimeout(300);
}

// ---------- desktop ----------
{
  const { ctx, page } = await newPage({ viewport: { width: 1280, height: 800 } });
  await page.screenshot({ path: out + 'd-title.png' });
  await page.click('#btn-start');
  await page.waitForTimeout(300);
  await page.keyboard.down('ArrowRight');
  await page.waitForTimeout(1300);
  await page.keyboard.up('ArrowRight');
  await page.waitForTimeout(200);
  await page.screenshot({ path: out + 'd-play.png' });

  // Reachability: every block and gem.
  const targets = await page.evaluate(() => {
    const L = window.__game.world.level;
    const blocks = [...L.blocks.entries()].map(([idx, key]) => ({ kind: 'block', key, px: (idx % L.W) * 16 + 8, row: Math.floor(idx / L.W) }));
    const gems = L.gems.map((g) => ({ kind: 'gem', key: g.skill, px: g.x + 5, row: Math.floor(g.y / 16) }));
    return [...blocks, ...gems];
  });
  const missed = [];
  for (const t of targets) {
    await jumpUnder(page, t.px, t.row);
    const ok = await page.evaluate((t) => {
      const w = window.__game.world;
      return t.kind === 'block' ? w.collected.has(t.key) : w.skills.has(t.key);
    }, t);
    if (!ok) missed.push(`${t.kind}:${t.key}`);
  }
  console.log(`reachability: ${targets.length - missed.length}/${targets.length} ok`, missed.length ? `MISSED ${missed.join(', ')}` : '');

  // One screenshot per stage.
  const n = await page.evaluate(() => window.__game.world.level.zones.length);
  for (let i = 0; i < n; i++) {
    await page.evaluate((i) => window.__game.warp(i), i);
    await page.keyboard.down('ArrowRight');
    await page.waitForTimeout(900);
    await page.keyboard.up('ArrowRight');
    await page.waitForTimeout(250);
    await page.screenshot({ path: `${out}d-stage-${String(i + 1).padStart(2, '0')}.png` });
  }

  // Logbook.
  await page.keyboard.press('KeyL');
  await page.waitForTimeout(300);
  await page.screenshot({ path: out + 'd-logbook.png' });
  await page.keyboard.press('Escape');

  // Walk into the finale door.
  await page.evaluate(() => window.__game.warp(9));
  await page.keyboard.down('ArrowRight');
  await page.waitForFunction(() => !document.getElementById('end-screen').hidden, null, { timeout: 15000 });
  await page.keyboard.up('ArrowRight');
  await page.waitForTimeout(300);
  await page.screenshot({ path: out + 'd-end.png' });
  await ctx.close();
}

// ---------- iPhone portrait ----------
{
  const { ctx, page } = await newPage({ ...devices['iPhone 14'] });
  await page.screenshot({ path: out + 'm-title.png' });
  await page.tap('#btn-start');
  await page.waitForTimeout(400);
  // Hold right on the d-pad via a synthetic pointer, and tap jump.
  const dp = await page.locator('#dpad').boundingBox();
  const jb = await page.locator('#btn-jump').boundingBox();
  await page.evaluate(({ dp, jb }) => {
    const fire = (el, type, x, y, id) => el.dispatchEvent(new PointerEvent(type, { bubbles: true, pointerId: id, clientX: x, clientY: y, pointerType: 'touch', isPrimary: id === 1 }));
    const d = document.getElementById('dpad');
    const j = document.getElementById('btn-jump');
    fire(d, 'pointerdown', dp.x + dp.width * 0.8, dp.y + dp.height / 2, 1);
    setTimeout(() => fire(j, 'pointerdown', jb.x + 10, jb.y + 10, 2), 500);
    setTimeout(() => fire(j, 'pointerup', jb.x + 10, jb.y + 10, 2), 900);
    setTimeout(() => fire(d, 'pointerup', dp.x + dp.width * 0.8, dp.y + dp.height / 2, 1), 1400);
  }, { dp, jb });
  await page.waitForTimeout(700);
  await page.screenshot({ path: out + 'm-play-jump.png' });
  await page.waitForTimeout(1200);
  const moved = await page.evaluate(() => window.__game.world.p.x);
  console.log('mobile: player x after touch run =', Math.round(moved));
  await page.evaluate(() => window.__game.warp(7));
  await page.waitForTimeout(700);
  await page.screenshot({ path: out + 'm-google.png' });
  await page.setViewportSize({ width: 844, height: 390 });
  await page.waitForTimeout(500);
  await page.screenshot({ path: out + 'm-landscape.png' });
  await ctx.close();
}

await browser.close();
console.log(errors.length ? `ERRORS:\n${errors.join('\n')}` : 'no console errors');
