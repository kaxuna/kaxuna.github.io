// Screenshot script: uses installed Google Chrome through Playwright's chrome channel.
import { chromium, devices } from 'playwright';
const base = 'http://localhost:5173/';
const out = 'shots/';
const browser = await chromium.launch({ channel: 'chrome' });

async function shot(name, ctxOpts, path, actions, fullPage = true) {
  const ctx = await browser.newContext(ctxOpts);
  const page = await ctx.newPage();
  await page.goto(base + path, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  if (actions) await actions(page);
  await page.screenshot({ path: out + name + '.png', fullPage });
  await ctx.close();
  console.log('saved', name);
}

const mobile = { ...devices['iPhone 14'] };
const desktop = { viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1 };

await shot('desktop-pipeline', desktop, '#pipeline');
await shot('desktop-panel', desktop, '#pipeline', async (p) => {
  const c = p.locator('#pipeline-canvas'); const b = await c.boundingBox(); const s = b.width / 1000;
  await p.mouse.click(b.x + 760 * s, b.y + 250 * s); await p.waitForTimeout(500);
}, false);
await shot('desktop-sql', desktop, '#sql', async (p) => {
  await p.waitForFunction(() => /ready|ok|failed/.test(document.getElementById('sql-status').textContent), null, { timeout: 60000 });
  await p.locator('#sql-presets button').nth(5).click();
  await p.waitForFunction(() => /^(ok|error)$/.test(document.getElementById('sql-status').textContent), null, { timeout: 30000 });
  await p.waitForTimeout(300);
});
await shot('desktop-terminal', desktop, '#pipeline', async (p) => {
  await p.keyboard.press('`'); await p.waitForTimeout(200);
  for (const cmd of ['git log --graph', 'leetcode']) { await p.keyboard.type(cmd); await p.keyboard.press('Enter'); await p.waitForTimeout(400); }
  await p.setViewportSize({ width: 1280, height: 1500 }); await p.waitForTimeout(300);
});
await shot('desktop-skills', desktop, '#skills', async (p) => { await p.waitForTimeout(900); });
await shot('mobile-pipeline', mobile, '#pipeline');
await shot('mobile-panel', mobile, '#pipeline', async (p) => {
  const c = p.locator('#pipeline-canvas'); const b = await c.boundingBox(); const s = b.width / 440;
  await c.scrollIntoViewIfNeeded();
  const b2 = await c.boundingBox();
  await p.mouse.click(b2.x + 135 * s, b2.y + 640 * s); await p.waitForTimeout(600);
}, false);
await shot('mobile-sql', mobile, '#sql', async (p) => {
  await p.waitForFunction(() => /ready|ok|failed/.test(document.getElementById('sql-status').textContent), null, { timeout: 60000 });
  await p.locator('#sql-run').click();
  await p.waitForFunction(() => /^(ok|error)$/.test(document.getElementById('sql-status').textContent), null, { timeout: 30000 });
  await p.waitForTimeout(300);
});
await browser.close();
