// Renders the link-preview image (public/og.png, 1120x630) from a real game frame.
// Needs the dev server: npm run dev -- --port 5174
import { chromium } from 'playwright';

const base = process.argv[2] ?? 'http://localhost:5174/';
const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 1120, height: 630 }, deviceScaleFactor: 1 });
await page.goto(base + '?debug', { waitUntil: 'networkidle' });
await page.evaluate(() => localStorage.clear());
await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(400);
await page.click('#btn-start');
await page.evaluate(() => window.__game.warp(7));
await page.waitForTimeout(200);
await page.evaluate(() => {
  const w = window.__game.world;
  w.p.x += 150; // stand between the warehouse pipes
  w.snapCamera();
});
await page.waitForTimeout(3000); // let the banner fade
await page.addStyleTag({ content: `
  .hud, .bubble, .banner, .toasts, #controls { display: none !important; }
  .og-card { position: fixed; left: 40px; top: 36px; padding: 22px 28px 24px; background: rgba(11,16,32,.9);
    box-shadow: inset 0 0 0 4px #f3ecd8, 8px 8px 0 rgba(0,0,0,.45); font-family: 'Pixelify Sans', monospace; color: #f3ecd8; }
  .og-card p { margin: 0; } .og-k { color: #f7b733; font-size: 20px; letter-spacing: .12em; text-transform: uppercase; }
  .og-t { font-size: 64px; font-weight: 700; line-height: 1; margin-top: 8px !important; }
  .og-s { font-size: 24px; color: #a3aecb; margin-top: 12px !important; }` });
await page.evaluate(() => {
  const d = document.createElement('div');
  d.className = 'og-card';
  d.innerHTML = '<p class="og-k">A career in ten stages</p><p class="og-t">Kakha Philauri</p><p class="og-s">Backend engineer · Google BigQuery · kaxuna.github.io</p>';
  document.body.appendChild(d);
});
await page.waitForTimeout(300);
await page.screenshot({ path: 'public/og.png' });
await browser.close();
console.log('wrote public/og.png');
