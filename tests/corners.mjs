// Abre um nível 5x5 já quase montado e fotografa grupos em L para conferir cantos e emendas.
import { chromium } from 'playwright';
const URL = process.env.URL ?? 'http://localhost:4173/';
const OUT = process.env.SHOTS ?? '/tmp/claude-0/shots';
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
for (const [name, scale] of [['dpr1', 1], ['dpr125', 1.25]]) {
  const ctx = await browser.newContext({ viewport: { width: 1100, height: 760 }, deviceScaleFactor: scale });
  const page = await ctx.newPage();
  await page.goto(URL);
  await page.evaluate(() => localStorage.setItem('jigsaw-solitaire:save:v2', JSON.stringify({ coins: 50, hints: 3, done: ['paisagens-01', 'paisagens-02', 'paisagens-03', 'paisagens-04'] })));
  await page.reload();
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/${name}-home-progress.png` });
  await page.click('#btn-play');
  await page.waitForTimeout(800);
  for (let k = 0; k < 9; k++) {
    const b = await page.evaluate(() => window.__game.board);
    const pos = b.cells.findIndex((id, p) => id !== p);
    const q = b.cells.indexOf(pos);
    const [x0, y0] = await page.evaluate((p) => window.__game.cellCenter(p), q);
    const [x1, y1] = await page.evaluate((p) => window.__game.cellCenter(p), pos);
    await page.mouse.move(x0, y0); await page.mouse.down();
    await page.mouse.move(x1, y1, { steps: 5 }); await page.mouse.up();
    await page.waitForTimeout(300);
  }
  await page.screenshot({ path: `${OUT}/${name}-groups.png` });
  const box = await page.locator('#board').boundingBox();
  await page.screenshot({ path: `${OUT}/${name}-groups-zoom.png`, clip: { x: box.x, y: box.y, width: box.width * 0.7, height: box.height * 0.45 } });
  await ctx.close();
}
await browser.close();
