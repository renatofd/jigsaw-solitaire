import { chromium } from 'playwright';
const browser = await chromium.launch({ executablePath: process.env.CHROME ?? '/opt/pw-browsers/chromium' });
const page = await browser.newPage({ viewport: { width: 1500, height: 560 } });
await page.goto('http://localhost:4173/');
for (let i = 0; i < 5; i++) {
  await page.evaluate((i) => localStorage.setItem('jigsaw-solitaire:level', String(i)), i);
  await page.reload(); await page.waitForTimeout(700);
  const b = await page.locator('#btn-peek').boundingBox();
  await page.mouse.move(b.x + 5, b.y + 5); await page.mouse.down(); await page.waitForTimeout(100);
  await page.screenshot({ path: `/tmp/claude-0/shots/scene-${i}.png`, clip: { x: 550, y: 56, width: 400, height: 504 } });
  await page.mouse.up();
}
await page.evaluate(() => localStorage.clear());
await browser.close();
