// Resolve o nível 1 arrastando cartas, no PC e no celular, e tira capturas.
import { chromium, devices } from 'playwright';
const URL = process.env.URL ?? 'http://localhost:4173/';
const OUT = process.env.SHOTS ?? '/tmp/claude-0/shots';
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
async function run(name, ctxOpts) {
  const ctx = await browser.newContext(ctxOpts);
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e)));
  page.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
  await page.goto(URL);
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${OUT}/${name}-home.png` });
  await page.click('#btn-theme-next');
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/${name}-theme2.png` });
  await page.click('#btn-theme-prev');
  await page.waitForTimeout(300);
  console.log(name, 'theme', await page.textContent('#theme-title'), 'locked', await page.locator('.lvl.locked').count());
  await page.click('#btn-play');
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${OUT}/${name}-start.png` });
  let moves = 0;
  for (let guard = 0; guard < 100; guard++) {
    const b = await page.evaluate(() => window.__game.board);
    const pos = b.cells.findIndex((id, p) => id !== p);
    if (pos < 0) break;
    const q = b.cells.indexOf(pos);
    const [x0, y0] = await page.evaluate((p) => window.__game.cellCenter(p), q);
    const [x1, y1] = await page.evaluate((p) => window.__game.cellCenter(p), pos);
    await page.mouse.move(x0, y0); await page.mouse.down();
    await page.mouse.move((x0 + x1) / 2, (y0 + y1) / 2, { steps: 4 });
    if (moves === 1) await page.screenshot({ path: `${OUT}/${name}-dragging.png` });
    await page.mouse.move(x1, y1, { steps: 4 }); await page.mouse.up();
    moves++;
    await page.waitForTimeout(300);
    if (moves === 5) await page.screenshot({ path: `${OUT}/${name}-mid.png` });
  }
  await page.waitForTimeout(1300);
  await page.screenshot({ path: `${OUT}/${name}-win.png` });
  const winVisible = await page.isVisible('#win');
  await page.click('#btn-continue');
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}/${name}-home2.png` });
  await page.click('#btn-gallery');
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/${name}-gallery.png` });
  console.log(name, 'moves', moves, 'win overlay', winVisible, 'errors', errs);
  await ctx.close();
}
await run('desktop', { viewport: { width: 1380, height: 800 } });
await run('mobile', { ...devices['iPhone 13'] });
await browser.close();
