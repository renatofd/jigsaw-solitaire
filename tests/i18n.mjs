// Confere idioma automático, painel de configurações, painel de idiomas e árabe (direita para esquerda).
import { chromium, devices } from 'playwright';
const URL = process.env.URL ?? 'http://localhost:4173/';
const OUT = process.env.SHOTS ?? '/tmp/claude-0/shots';
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
for (const [name, opts] of [['ja-desktop', { locale: 'ja-JP', viewport: { width: 1280, height: 800 } }], ['de-mobile', { ...devices['iPhone 13'], locale: 'de-DE' }]]) {
  const ctx = await browser.newContext(opts);
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e)));
  page.on('requestfailed', (r) => errs.push('failed ' + r.url()));
  page.on('response', (r) => r.status() >= 400 && !r.url().endsWith('favicon.ico') && errs.push(r.status() + ' ' + r.url()));
  await page.goto(URL);
  await page.waitForTimeout(500);
  console.log(name, 'lang', await page.getAttribute('html', 'lang'), 'theme', await page.textContent('#theme-title'), 'play', await page.textContent('#btn-play'));
  await page.screenshot({ path: `${OUT}/${name}-home.png` });
  await page.click('#btn-settings');
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/${name}-settings.png` });
  await page.click('#btn-language');
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/${name}-languages.png` });
  await page.click('.lang-option[lang="ar"]');
  await page.waitForTimeout(300);
  await page.click('#settings [data-close]');
  await page.waitForTimeout(300);
  console.log(name, 'after ar: dir', await page.getAttribute('html', 'dir'), 'theme', await page.textContent('#theme-title'));
  await page.screenshot({ path: `${OUT}/${name}-arabic.png` });
  await page.click('#btn-play');
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${OUT}/${name}-arabic-game.png` });
  console.log(name, 'pill', await page.textContent('#level-pill'), 'errors', errs);
  await ctx.close();
}
await browser.close();
