// Bateria de toques no celular: arrastos rápidos, multitoque, toque cancelado, toque duplo no Jogar.
// Depois de cada gesto confere que o jogo não ficou preso num arrasto e que o tabuleiro está íntegro.
import { chromium, devices } from 'playwright';
const URL = process.env.URL ?? 'http://localhost:4173/';
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const failures = [];
const check = (name, ok, info = '') => { if (!ok) failures.push(`${name} ${info}`); console.log(ok ? 'ok  ' : 'FAIL', name, info); };

async function setup(device, level = 4, delayImages = 0) {
  const ctx = await browser.newContext({ ...devices[device] });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e)));
  if (delayImages) await page.route('**/images/**', async (r) => { await new Promise((ok) => setTimeout(ok, delayImages)); r.continue(); });
  await page.goto(URL);
  const done = ['paisagens-01', 'paisagens-02', 'paisagens-03', 'paisagens-04', 'paisagens-05', 'paisagens-06'].slice(0, level);
  await page.evaluate((done) => localStorage.setItem('jigsaw-solitaire:save:v2', JSON.stringify({ hints: 3, done })), done);
  await page.reload();
  await page.waitForTimeout(300);
  const cdp = await ctx.newCDPSession(page);
  return { ctx, page, cdp, errs };
}
const touch = (cdp, type, points) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: points.map(([x, y, id]) => ({ x, y, id })) });
const center = (page, pos) => page.evaluate((p) => window.__game.cellCenter(p), pos);
async function state(page) {
  return page.evaluate(() => {
    const g = window.__game, b = g.board, n = b.cells.length;
    return { dragging: g.dragging, cards: g.cardCount, n, stuck: document.querySelectorAll('.card.dragging').length,
      perm: [...b.cells].sort((a, c) => a - c).every((v, i) => v === i) };
  });
}
async function healthy(page, label) {
  await page.waitForTimeout(80);
  const s = await state(page);
  check(label, !s.dragging && s.stuck === 0 && s.cards === s.n && s.perm, JSON.stringify(s));
}
/** Um arrasto completo com o dedo e confere se o jogo ainda reage a um arrasto normal depois. */
async function stillResponds(page, cdp, label) {
  const b0 = (await state(page)).n;
  const before = await page.evaluate(() => window.__game.board.cells.join());
  const cells = await page.evaluate(() => window.__game.board.cells);
  const p = cells.findIndex((id, i) => id !== i);
  if (p < 0) return;
  const [x0, y0] = await center(page, cells.indexOf(p));
  const [x1, y1] = await center(page, p);
  await touch(cdp, 'touchStart', [[x0, y0, 1]]);
  for (let k = 1; k <= 5; k++) await touch(cdp, 'touchMove', [[x0 + (x1 - x0) * k / 5, y0 + (y1 - y0) * k / 5, 1]]);
  await touch(cdp, 'touchEnd', []);
  await page.waitForTimeout(60);
  const after = await page.evaluate(() => window.__game.board.cells.join());
  check(`${label}: ainda responde`, before !== after, `n=${b0}`);
}

for (const device of ['iPhone 13', 'Pixel 7']) {
  const { ctx, page, cdp, errs } = await setup(device);
  await page.tap('#btn-play');
  await page.waitForTimeout(700);
  const n = (await state(page)).n;

  // 1. Arrastos rápidos e aleatórios, sem esperar a animação terminar
  for (let i = 0; i < 60; i++) {
    const a = Math.floor(Math.random() * n), b = Math.floor(Math.random() * n);
    const [x0, y0] = await center(page, a), [x1, y1] = await center(page, b);
    await touch(cdp, 'touchStart', [[x0, y0, 1]]);
    await touch(cdp, 'touchMove', [[(x0 + x1) / 2, (y0 + y1) / 2, 1]]);
    await touch(cdp, 'touchMove', [[x1, y1, 1]]);
    await touch(cdp, 'touchEnd', []);
    if ((await state(page)).n === 0) break;
  }
  await healthy(page, `${device}: arrastos rápidos`);

  // 2. Dois dedos: o segundo encosta durante o arrasto e solta antes do primeiro
  {
    const [x0, y0] = await center(page, 0), [x1, y1] = await center(page, n - 1);
    await touch(cdp, 'touchStart', [[x0, y0, 1]]);
    await touch(cdp, 'touchMove', [[x0 + 10, y0 + 10, 1]]);
    await touch(cdp, 'touchStart', [[x0 + 10, y0 + 10, 1], [x1, y1, 2]]);
    await touch(cdp, 'touchMove', [[x0 + 20, y0 + 20, 1], [x1 - 20, y1 - 20, 2]]);
    await touch(cdp, 'touchEnd', [[x0 + 20, y0 + 20, 1]]);
    await touch(cdp, 'touchEnd', []);
    await healthy(page, `${device}: dois dedos`);
  }

  // 3. Toque cancelado pelo sistema (gesto da borda, notificação)
  {
    const [x0, y0] = await center(page, 1);
    await touch(cdp, 'touchStart', [[x0, y0, 1]]);
    await touch(cdp, 'touchMove', [[x0 + 30, y0, 1]]);
    const before = await page.evaluate(() => window.__game.board.cells.join());
    await touch(cdp, 'touchCancel', []);
    await healthy(page, `${device}: toque cancelado`);
    const after = await page.evaluate(() => window.__game.board.cells.join());
    check(`${device}: cancelado não move peças`, before === after);
  }

  // 4. Toque perdido: o fim do toque nunca chega ao jogo (gesto do sistema no iOS, troca de app)
  {
    const [x0, y0] = await center(page, 2);
    await page.evaluate(() => {
      const eat = (e) => { if (window.__eat) e.stopImmediatePropagation(); };
      if (!window.__eatInstalled) for (const t of ['pointerup', 'pointercancel']) { window.addEventListener(t, eat, true); document.addEventListener(t, eat, true); }
      window.__eatInstalled = true;
      window.__eat = true;
    });
    await touch(cdp, 'touchStart', [[x0, y0, 1]]);
    await touch(cdp, 'touchMove', [[x0 + 30, y0, 1]]);
    await touch(cdp, 'touchEnd', []);
    await page.evaluate(() => { window.__eat = false; });
    await stillResponds(page, cdp, `${device}: toque perdido`);
    await healthy(page, `${device}: toque perdido`);
  }

  // 5. Toque sem mover (tap) e toque segurado muito tempo
  {
    const [x0, y0] = await center(page, 3);
    await touch(cdp, 'touchStart', [[x0, y0, 1]]);
    await touch(cdp, 'touchEnd', []);
    await touch(cdp, 'touchStart', [[x0, y0, 1]]);
    await page.waitForTimeout(1200);
    await touch(cdp, 'touchEnd', []);
    await healthy(page, `${device}: tap e toque longo`);
  }

  // 6. Arrastar para fora da tela
  {
    const [x0, y0] = await center(page, 4);
    await touch(cdp, 'touchStart', [[x0, y0, 1]]);
    await touch(cdp, 'touchMove', [[-50, -80, 1]]);
    await touch(cdp, 'touchMove', [[2000, 3000, 1]]);
    await touch(cdp, 'touchEnd', []);
    await healthy(page, `${device}: arrastar para fora`);
  }

  // 7. Girar a tela durante o arrasto
  {
    const [x0, y0] = await center(page, 5);
    await touch(cdp, 'touchStart', [[x0, y0, 1]]);
    await touch(cdp, 'touchMove', [[x0 + 40, y0, 1]]);
    const vp = page.viewportSize();
    await page.setViewportSize({ width: vp.height, height: vp.width });
    await page.waitForTimeout(150);
    await touch(cdp, 'touchEnd', []);
    await page.setViewportSize(vp);
    await page.waitForTimeout(150);
    await healthy(page, `${device}: girar durante arrasto`);
  }

  // 8. Voltar para a tela inicial com um dedo arrastando e outro no botão
  {
    const [x0, y0] = await center(page, 0);
    const bb = await page.locator('#btn-back').boundingBox();
    await touch(cdp, 'touchStart', [[x0, y0, 1]]);
    await touch(cdp, 'touchMove', [[x0 + 30, y0, 1]]);
    await touch(cdp, 'touchStart', [[x0 + 30, y0, 1], [bb.x + bb.width / 2, bb.y + bb.height / 2, 2]]);
    await touch(cdp, 'touchEnd', [[x0 + 30, y0, 1]]);
    await touch(cdp, 'touchEnd', []);
    await page.waitForTimeout(200);
    if (await page.isVisible('#home')) { await page.tap('#btn-play'); await page.waitForTimeout(700); }
    await healthy(page, `${device}: voltar no meio do arrasto`);
    await stillResponds(page, cdp, `${device}: voltar no meio do arrasto`);
  }

  // 9. Resolver o nível inteiro com o dedo
  for (let guard = 0; guard < 200; guard++) {
    const cells = await page.evaluate(() => window.__game.board.cells);
    const p = cells.findIndex((id, i) => id !== i);
    if (p < 0) break;
    const [x0, y0] = await center(page, cells.indexOf(p)), [x1, y1] = await center(page, p);
    await touch(cdp, 'touchStart', [[x0, y0, 1]]);
    for (let k = 1; k <= 4; k++) await touch(cdp, 'touchMove', [[x0 + (x1 - x0) * k / 4, y0 + (y1 - y0) * k / 4, 1]]);
    await touch(cdp, 'touchEnd', []);
  }
  await page.waitForTimeout(1200);
  check(`${device}: vitória`, await page.isVisible('#win'));
  check(`${device}: sem erros JS`, errs.length === 0, errs.join(' | '));
  await ctx.close();
}

// 10. Toque duplo no "Jogar" com a imagem demorando a carregar
{
  const { ctx, page, cdp, errs } = await setup('iPhone 13', 4, 600);
  const bb = await page.locator('#btn-play').boundingBox();
  const [x, y] = [bb.x + bb.width / 2, bb.y + bb.height / 2];
  await touch(cdp, 'touchStart', [[x, y, 1]]); await touch(cdp, 'touchEnd', []);
  await page.waitForTimeout(40);
  // o segundo toque já cai no tabuleiro (a tela de jogo abriu antes da imagem carregar)
  await page.evaluate(() => document.getElementById('btn-play').click());
  await page.waitForTimeout(1600);
  await healthy(page, 'toque duplo no Jogar');
  // voltar e entrar de novo enquanto a imagem carrega
  await page.tap('#btn-back');
  await page.tap('#btn-play');
  await page.tap('#btn-back');
  await page.waitForTimeout(1500);
  check('voltar enquanto carrega: fica na tela inicial', await page.isVisible('#home') && !(await page.isVisible('#game')));
  check('toque duplo: sem erros JS', errs.length === 0, errs.join(' | '));
  await ctx.close();
}

await browser.close();
console.log(failures.length ? `\n${failures.length} falha(s)` : '\ntudo ok');
process.exit(failures.length ? 1 : 0);
