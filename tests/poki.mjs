// Primeira partida com um SDK do Poki falso: confere o tutorial (mão + primeiro movimento)
// e a ordem dos eventos do SDK e dos game events, no PC e no celular.
import { chromium, devices } from 'playwright';
const URL = process.env.URL ?? 'http://localhost:4173/';
const OUT = process.env.SHOTS ?? '/tmp/claude-0/shots';
const browser = await chromium.launch({ executablePath: process.env.CHROME ?? '/opt/pw-browsers/chromium' });
const MOCK = `window.__poki = [];
window.PokiSDK = new Proxy({}, { get: (_, name) => (...args) => {
  window.__poki.push([name, ...args].join(' '));
  return name === 'init' ? Promise.resolve() : undefined;
} });`;

async function drag(page, from, to) {
  const [x0, y0] = await page.evaluate((p) => window.__game.cellCenter(p), from);
  const [x1, y1] = await page.evaluate((p) => window.__game.cellCenter(p), to);
  await page.mouse.move(x0, y0); await page.mouse.down();
  await page.mouse.move((x0 + x1) / 2, (y0 + y1) / 2, { steps: 4 });
  await page.mouse.move(x1, y1, { steps: 4 }); await page.mouse.up();
  await page.waitForTimeout(300);
}

async function run(name, ctxOpts) {
  const ctx = await browser.newContext(ctxOpts);
  await ctx.route('**/poki-sdk.js', (r) => r.fulfill({ contentType: 'text/javascript', body: MOCK }));
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e)));
  await page.goto(URL);
  await page.waitForTimeout(500);
  await page.click('#btn-play');
  await page.waitForTimeout(700);
  const tut = await page.evaluate(() => window.__game.tutorial);
  console.log(name, 'tutorial', JSON.stringify(tut), 'tip', await page.textContent('#tut-tip'));
  for (const ms of [500, 1200]) {
    await page.waitForTimeout(ms === 500 ? 500 : 700);
    await page.screenshot({ path: `${OUT}/${name}-tut-${ms}.png` });
  }
  await drag(page, tut.from, tut.to);
  console.log(name, 'after move: tutorial', await page.evaluate(() => window.__game.tutorial), 'tip', await page.textContent('#tut-tip'),
    'saved', await page.evaluate(() => localStorage.getItem('jigsaw-solitaire:tutorial')));
  await page.screenshot({ path: `${OUT}/${name}-tut-done.png` });
  for (let guard = 0; guard < 100; guard++) {
    const b = await page.evaluate(() => window.__game.board);
    const pos = b.cells.findIndex((id, p) => id !== p);
    if (pos < 0) break;
    await drag(page, b.cells.indexOf(pos), pos);
  }
  await page.waitForTimeout(1300);
  await page.click('#btn-continue');
  await page.waitForTimeout(400);
  // segundo nível: sem tutorial; sai no meio
  await page.click('#btn-play');
  await page.waitForTimeout(600);
  console.log(name, 'level 2 tutorial visible', await page.isVisible('#tutorial'));
  await page.click('#btn-back');
  await page.waitForTimeout(300);
  console.log(name, 'events:\n  ' + (await page.evaluate(() => window.__poki)).join('\n  '));
  console.log(name, 'errors', errs);
  await ctx.close();
}
await run('desktop', { viewport: { width: 1380, height: 800 } });
await run('mobile', { ...devices['iPhone 13'] });

// SDK bloqueado (bloqueador de anúncios): o jogo tem que abrir e jogar igual.
const ctx = await browser.newContext({ viewport: { width: 1000, height: 700 } });
await ctx.route('**/poki-sdk.js', (r) => r.abort());
const page = await ctx.newPage();
const errs = [];
page.on('pageerror', (e) => errs.push(String(e)));
await page.goto(URL);
await page.waitForTimeout(500);
await page.click('#btn-play');
await page.waitForTimeout(600);
console.log('blocked sdk: cards', await page.evaluate(() => window.__game.cardCount), 'tutorial', await page.isVisible('#tutorial'), 'errors', errs);
await browser.close();
