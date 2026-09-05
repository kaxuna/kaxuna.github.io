// Renders tools/og.html to public/og.png (1200x630) for link previews.
import { chromium } from 'playwright';
import { resolve } from 'node:path';
const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
await page.goto('file://' + resolve('tools/og.html'), { waitUntil: 'networkidle' });
await page.waitForTimeout(500);
await page.screenshot({ path: 'public/og.png' });
await browser.close();
console.log('wrote public/og.png');
