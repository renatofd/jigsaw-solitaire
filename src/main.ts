import { type Board, clampOffset, groupIds, isSolved, linked, moveGroup, shuffled } from './logic';
import { ALL_PICTURES, THEMES, type Picture, type Theme, gridFor } from './levels';
import { groupPath } from './outline';
import { type Lang, LANGS, applyStatic, detectLang, isLang, lang, langInfo, pictureTitle, setLang, t } from './i18n';
import { initAudio, play, setMusic, setSfx } from './audio';

const SAVE_KEY = 'jigsaw-solitaire:save:v2';
const SETTINGS_KEY = 'jigsaw-solitaire:settings';
const HINTS_START = 3;

interface Save {
  hints: number;
  done: string[];
  theme?: number;
  current?: { id: string; cells: number[]; moves: number };
}

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;

function loadSave(): Save {
  const empty: Save = { hints: HINTS_START, done: [] };
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    return raw ? { ...empty, ...JSON.parse(raw) } : empty;
  } catch {
    return empty;
  }
}
let save = loadSave();
function persist() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch { /* sem armazenamento */ }
}

// Preferências ficam separadas do progresso: apagar o progresso não muda idioma nem som.
interface Settings { music: boolean; sfx: boolean; lang?: Lang }
function loadSettings(): Settings {
  const def: Settings = { music: true, sfx: true };
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    return raw ? { ...def, ...JSON.parse(raw) } : def;
  } catch {
    return def;
  }
}
const settings = loadSettings();
function persistSettings() {
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch { /* sem armazenamento */ }
}
setLang(isLang(settings.lang) ? settings.lang : detectLang());
initAudio(settings.music, settings.sfx);

const themeTitle = (th: Theme) => t(`theme.${th.id}`);
const titleOf = (p: Picture) => pictureTitle(p.id, p.title);

function themeIndex(): number {
  const t = save.theme ?? 0;
  return t >= 0 && t < THEMES.length ? t : 0;
}

/** O primeiro nível de cada tema já vem liberado; os seguintes, ao completar o anterior. */
function isUnlocked(theme: Theme, i: number): boolean {
  return i === 0 || save.done.includes(theme.pictures[i - 1].id);
}

function nextInTheme(theme: Theme): number {
  return theme.pictures.findIndex((p, i) => !save.done.includes(p.id) && isUnlocked(theme, i));
}


// ---------- Tela inicial ----------

const LOCK_SVG = '<svg class="lock" viewBox="0 0 24 24" aria-hidden="true"><path class="shackle" d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/><rect class="body" x="5.5" y="10.5" width="13" height="10" rx="2.5"/><path class="hole" d="M12 14.5v2.5"/></svg>';

function showHome() {
  $('game').hidden = true;
  $('home').hidden = false;
  const theme = THEMES[themeIndex()];
  const doneCount = theme.pictures.filter((p) => save.done.includes(p.id)).length;
  $('theme-title').textContent = themeTitle(theme);
  $('theme-progress').textContent = t('progress', { done: doneCount, total: theme.pictures.length });
  const next = nextInTheme(theme);
  const grid = $('level-cards');
  grid.replaceChildren();
  theme.pictures.forEach((p, i) => {
    const el = document.createElement('button');
    el.className = 'lvl';
    if (save.done.includes(p.id)) {
      el.classList.add('done');
      el.style.backgroundImage = `url("${p.thumb}")`;
      el.setAttribute('aria-label', titleOf(p));
      el.addEventListener('click', () => { play('click'); openViewer(p); });
    } else if (isUnlocked(theme, i)) {
      el.innerHTML = `<span>${i + 1}</span>`;
      el.classList.add('current');
      el.setAttribute('aria-label', t('level', { n: i + 1 }));
      el.addEventListener('click', () => { play('click'); startLevel(themeIndex(), i); });
    } else {
      el.classList.add('locked');
      el.innerHTML = LOCK_SVG;
      el.setAttribute('aria-label', t('locked', { n: i + 1 }));
      el.setAttribute('aria-disabled', 'true');
      el.addEventListener('click', () => {
        play('locked');
        el.classList.remove('shake');
        void el.offsetWidth;
        el.classList.add('shake');
      });
    }
    grid.appendChild(el);
  });
  const playBtn = $<HTMLButtonElement>('btn-play');
  playBtn.textContent = next < 0 ? t('nextTheme') : t('level', { n: next + 1 });
  layoutHome();
}

/** Escolhe quantas colunas deixam as cartas do tema maiores no espaço disponível. */
function layoutHome() {
  const area = $('level-grid');
  const grid = $('level-cards');
  const cs = getComputedStyle(area);
  const r = {
    width: area.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight),
    height: area.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom),
  };
  if (r.width <= 0 || r.height <= 0) return;
  const n = grid.children.length, gap = 10;
  let best = { cols: 5, w: 0 };
  for (const cols of [5, 4, 3, 2]) {
    const rows = Math.ceil(n / cols);
    const w = Math.min((r.width - gap * (cols - 1)) / cols, ((r.height - gap * (rows - 1)) / rows) * 0.75, 170);
    if (w > best.w + 0.5) best = { cols, w };
  }
  grid.style.setProperty('--card-w', `${Math.floor(best.w)}px`);
  grid.style.setProperty('--cols', String(best.cols));
}

function changeTheme(step: number) {
  play('theme');
  save.theme = (themeIndex() + step + THEMES.length) % THEMES.length;
  persist();
  showHome();
}
$('btn-theme-prev').addEventListener('click', () => changeTheme(-1));
$('btn-theme-next').addEventListener('click', () => changeTheme(1));
window.addEventListener('keydown', (e) => {
  if ($('home').hidden || document.querySelector('.overlay:not([hidden])')) return;
  if (e.key === 'ArrowLeft') changeTheme(-1);
  if (e.key === 'ArrowRight') changeTheme(1);
});
new ResizeObserver(() => { if (!$('home').hidden) layoutHome(); }).observe($('level-grid'));

$('btn-play').addEventListener('click', () => {
  const th = themeIndex();
  const next = nextInTheme(THEMES[th]);
  play('click');
  if (next >= 0) startLevel(th, next);
  else changeTheme(1);
});

// ---------- Jogo ----------

interface Card {
  id: number;
  el: HTMLDivElement;
  face: HTMLDivElement;
  svg: SVGSVGElement;
  paths: SVGPathElement[];
}

let picture: Picture;
let levelTheme = 0;
let levelIndex = 0;
let board: Board;
let moves = 0;
let cards: Card[] = [];
let solved = false;
let layout = { left: 0, top: 0, w: 0, h: 0, cw: 0, ch: 0, gap: 0, radius: 0, line: 2 };
/** As cartas se sobrepõem um pouco para não aparecer fresta entre cartas unidas. */
const BLEED = 1;
const SVG_NS = 'http://www.w3.org/2000/svg';
let drag: { pointerId: number; group: number[]; sx: number; sy: number } | null = null;

const boardEl = $('board');
const stageEl = $('stage');

function preload(src: string) {
  return new Promise<void>((resolve) => {
    const img = new Image();
    img.onload = img.onerror = () => resolve();
    img.src = src;
  });
}

function levelName() {
  return `${themeTitle(THEMES[levelTheme])} ${levelIndex + 1}/${THEMES[levelTheme].pictures.length}`;
}

async function startLevel(th: number, i: number) {
  levelTheme = th;
  levelIndex = i;
  picture = THEMES[th].pictures[i];
  const n = gridFor(i);
  const saved = save.current?.id === picture.id && save.current.cells.length === n * n ? save.current : null;
  board = saved
    ? { rows: n, cols: n, cells: saved.cells.slice() }
    : shuffled(n, n, Math.random);
  moves = saved?.moves ?? 0;
  solved = false;
  drag = null;
  save.current = { id: picture.id, cells: board.cells, moves };
  persist();

  $('home').hidden = true;
  $('game').hidden = false;
  $('win').hidden = true;
  $('level-pill').textContent = levelName();
  updateHint();
  boardEl.classList.remove('solved');
  boardEl.replaceChildren();
  cards = [];
  await preload(picture.file);
  for (let id = 0; id < n * n; id++) {
    const el = document.createElement('div');
    el.className = 'card';
    const face = document.createElement('div');
    face.className = 'face';
    face.style.backgroundImage = `url("${picture.file}")`;
    el.appendChild(face);
    const svg = document.createElementNS(SVG_NS, 'svg');
    const paths = ['edge-light', 'edge-dark'].map((cls) => {
      const path = document.createElementNS(SVG_NS, 'path');
      path.setAttribute('class', cls);
      svg.appendChild(path);
      return path;
    });
    el.appendChild(svg);
    const card = { id, el, face, svg, paths };
    el.addEventListener('pointerdown', (e) => onPointerDown(e, card));
    boardEl.appendChild(el);
    cards.push(card);
  }
  computeLayout();
  render(true);
}

function computeLayout() {
  const r = stageEl.getBoundingClientRect();
  const pad = Math.max(8, Math.min(r.width, r.height) * 0.02);
  const s = Math.min((r.width - pad * 2) / 3, (r.height - pad * 2) / 4);
  // tamanhos inteiros: cartas vizinhas encostam sem frestas de arredondamento
  const cw = Math.floor((3 * s) / board.cols), ch = Math.floor((4 * s) / board.rows);
  const w = cw * board.cols, h = ch * board.rows;
  layout = {
    left: Math.round((r.width - w) / 2),
    top: Math.round(Math.max(pad, (r.height - h) / 2 - pad)),
    w, h, cw, ch,
    gap: Math.max(1.5, Math.min(cw, 140) * 0.025),
    radius: Math.max(4, Math.min(cw, 140) * 0.08),
    line: cw < 60 ? 1.5 : 2,
  };
  boardEl.style.left = `${layout.left}px`;
  boardEl.style.top = `${layout.top}px`;
  boardEl.style.width = `${w}px`;
  boardEl.style.height = `${h}px`;
}

function cellXY(pos: number): [number, number] {
  return [(pos % board.cols) * layout.cw, Math.floor(pos / board.cols) * layout.ch];
}

function render(instant = false) {
  const { cw, ch, gap, radius, w, h, line } = layout;
  const cols = board.cols;
  const ids = groupIds(board);
  const members = new Map<number, number[]>();
  ids.forEach((g, pos) => {
    if (!members.has(g)) members.set(g, []);
    members.get(g)!.push(pos);
  });
  const geom = { cols, cw, ch, inset: gap, radius };
  const bw = cw + 2 * BLEED, bh = ch + 2 * BLEED;
  board.cells.forEach((id, pos) => {
    const card = cards[id];
    const [x, y] = cellXY(pos);
    const group = members.get(ids[pos])!;
    // contorno do grupo inteiro, no sistema de coordenadas desta carta
    const local = groupPath(group, geom, x - BLEED, y - BLEED);
    const el = card.el.style;
    el.width = `${bw}px`;
    el.height = `${bh}px`;
    el.clipPath = `path('${local}')`;
    el.setProperty('-webkit-clip-path', `path('${local}')`);
    const f = card.face.style;
    const ic = id % cols, ir = Math.floor(id / cols);
    f.backgroundSize = `${w}px ${h}px`;
    f.backgroundPosition = `${-(ic * cw - BLEED)}px ${-(ir * ch - BLEED)}px`;
    card.svg.setAttribute('viewBox', `0 0 ${bw} ${bh}`);
    // o recorte esconde a metade de fora do traço: fica a linha escura na borda e o filete claro por dentro
    card.paths[0].setAttribute('d', local);
    card.paths[0].setAttribute('stroke-width', String((line + 1.5) * 2));
    card.paths[1].setAttribute('d', local);
    card.paths[1].setAttribute('stroke-width', String(line * 2));
    if (instant) el.transition = 'none';
    el.transform = `translate(${x - BLEED}px, ${y - BLEED}px)`;
    if (instant) {
      void card.el.offsetWidth;
      el.transition = '';
    }
  });
}

function groupAt(pos: number): number[] {
  const ids = groupIds(board);
  return board.cells.map((_, i) => i).filter((i) => ids[i] === ids[pos]);
}

function onPointerDown(e: PointerEvent, card: Card) {
  if (drag || solved || e.button > 0) return;
  e.preventDefault();
  const pos = board.cells.indexOf(card.id);
  const group = groupAt(pos);
  for (const gp of group) cards[board.cells[gp]].el.classList.add('dragging');
  card.el.setPointerCapture(e.pointerId);
  play('pick');
  drag = { pointerId: e.pointerId, group, sx: e.clientX, sy: e.clientY };
}

window.addEventListener('pointermove', (e) => {
  if (!drag || e.pointerId !== drag.pointerId) return;
  const dx = e.clientX - drag.sx, dy = e.clientY - drag.sy;
  for (const gp of drag.group) {
    const [x, y] = cellXY(gp);
    cards[board.cells[gp]].el.style.transform = `translate(${x + dx - BLEED}px, ${y + dy - BLEED}px)`;
  }
});

function endDrag(e: PointerEvent) {
  if (!drag || e.pointerId !== drag.pointerId) return;
  const d = drag;
  drag = null;
  for (const gp of d.group) cards[board.cells[gp]].el.classList.remove('dragging');
  const [dr, dc] = clampOffset(board, d.group, Math.round((e.clientY - d.sy) / layout.ch), Math.round((e.clientX - d.sx) / layout.cw));
  if (dr === 0 && dc === 0) {
    render();
    return;
  }
  play('drop');
  applyMove(d.group, dr, dc);
}
window.addEventListener('pointerup', endDrag);
window.addEventListener('pointercancel', endDrag);

function groupSizes(): Map<number, number> {
  const ids = groupIds(board);
  const count = new Map<number, number>();
  ids.forEach((g) => count.set(g, (count.get(g) ?? 0) + 1));
  const out = new Map<number, number>();
  board.cells.forEach((id, pos) => out.set(id, count.get(ids[pos])!));
  return out;
}

function applyMove(group: number[], dr: number, dc: number) {
  const before = groupSizes();
  board = moveGroup(board, group, dr, dc);
  moves++;
  render();
  const after = groupSizes();
  if (!isSolved(board) && cards.some((c) => after.get(c.id)! > before.get(c.id)!)) play('merge');
  for (const c of cards) {
    if (after.get(c.id)! > before.get(c.id)!) {
      c.el.classList.remove('flash');
      void c.el.offsetWidth;
      c.el.classList.add('flash');
    }
  }
  save.current = { id: picture.id, cells: board.cells, moves };
  persist();
  if (isSolved(board)) win();
}

// ---------- Dica ----------

function updateHint() {
  const badge = $('hint-count');
  const btn = $<HTMLButtonElement>('btn-hint');
  badge.textContent = String(save.hints);
  btn.title = save.hints > 0 ? t('hint') : t('noHints');
  btn.setAttribute('aria-label', btn.title);
  btn.classList.toggle('empty', save.hints === 0);
  btn.disabled = solved;
}

/** Leva o grupo de uma carta fora do lugar para a posição certa. */
$('btn-hint').addEventListener('click', () => {
  if (solved || drag) return;
  if (save.hints === 0) {
    play('locked');
    toast(t('noHints'));
    return;
  }
  const target = board.cells.findIndex((id, pos) => id !== pos);
  if (target < 0) return;
  const from = board.cells.indexOf(target);
  const group = groupAt(from);
  const r = Math.floor(target / board.cols) - Math.floor(from / board.cols);
  const c = (target % board.cols) - (from % board.cols);
  save.hints--;
  updateHint();
  play('hint');
  for (const gp of group) {
    const el = cards[board.cells[gp]].el;
    el.classList.remove('hinted');
    void el.offsetWidth;
    el.classList.add('hinted');
  }
  applyMove(group, r, c);
});

// ---------- Vitória ----------

function win() {
  solved = true;
  save.hints++;
  if (!save.done.includes(picture.id)) save.done.push(picture.id);
  save.theme = levelTheme;
  delete save.current;
  persist();
  updateHint();
  boardEl.classList.add('solved');
  play('win');
  setTimeout(() => {
    $('win-kicker').textContent = t('completed', { name: levelName() });
    $('win-title').textContent = titleOf(picture);
    $('win-reward').textContent = t('hintReward');
    $('win').hidden = false;
  }, 900);
}

$('btn-continue').addEventListener('click', () => {
  play('click');
  $('win').hidden = true;
  showHome();
});
$('btn-back').addEventListener('click', () => { play('click'); showHome(); });

let toastTimer = 0;
function toast(text: string) {
  const el = $('toast');
  el.textContent = text;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => (el.hidden = true), 2200);
}

// ---------- Coleção e configurações ----------

function openViewer(p: Picture) {
  $<HTMLImageElement>('viewer-img').src = p.file;
  $('viewer-cap').textContent = titleOf(p);
  $('viewer').hidden = false;
}
$('viewer').addEventListener('click', () => ($('viewer').hidden = true));

$('btn-gallery').addEventListener('click', () => {
  const grid = $('gallery-grid');
  grid.replaceChildren();
  const done = ALL_PICTURES.filter((p) => save.done.includes(p.id));
  if (!done.length) {
    const p = document.createElement('p');
    p.className = 'gallery-empty';
    p.textContent = t('collectionEmpty');
    grid.appendChild(p);
  }
  for (const p of ALL_PICTURES) {
    if (p === THEMES.find((t) => t.id === p.chapter)!.pictures[0]) {
      const h = document.createElement('h3');
      h.textContent = themeTitle(THEMES.find((th) => th.id === p.chapter)!);
      grid.appendChild(h);
    }
    const b = document.createElement('button');
    if (save.done.includes(p.id)) {
      b.style.backgroundImage = `url("${p.thumb}")`;
      b.setAttribute('aria-label', titleOf(p));
      b.addEventListener('click', () => openViewer(p));
    } else {
      b.className = 'locked';
      b.disabled = true;
      b.innerHTML = LOCK_SVG;
    }
    grid.appendChild(b);
  }
  $('gallery').hidden = false;
});
$('btn-settings').addEventListener('click', () => {
  play('click');
  $('settings').hidden = false;
});
for (const el of document.querySelectorAll<HTMLElement>('.sheet')) {
  el.addEventListener('click', (e) => {
    if (e.target === el || (e.target as HTMLElement).closest('[data-close]')) {
      play('click');
      el.hidden = true;
    }
  });
}

// ---------- Som e idioma ----------

const optMusic = $<HTMLInputElement>('opt-music');
const optSfx = $<HTMLInputElement>('opt-sfx');
optMusic.checked = settings.music;
optSfx.checked = settings.sfx;
optMusic.addEventListener('change', () => {
  settings.music = optMusic.checked;
  setMusic(settings.music);
  persistSettings();
});
optSfx.addEventListener('change', () => {
  settings.sfx = optSfx.checked;
  setSfx(settings.sfx);
  persistSettings();
  play('click');
});

function refreshTexts() {
  applyStatic();
  const info = langInfo();
  $('lang-flag').innerHTML = info.flag;
  $('lang-name').textContent = info.name;
  $<HTMLButtonElement>('btn-reset').textContent = t('reset');
  updateHint();
  if (!$('home').hidden) showHome();
  if (!$('game').hidden && picture) $('level-pill').textContent = levelName();
}

$('btn-language').addEventListener('click', () => {
  play('click');
  const grid = $('lang-grid');
  grid.replaceChildren();
  for (const l of LANGS) {
    const b = document.createElement('button');
    b.className = 'lang-option';
    if (l.code === lang()) b.classList.add('selected');
    b.lang = l.code;
    b.innerHTML = `<span class="flag">${l.flag}</span><span class="lang-label"></span>`;
    b.querySelector('.lang-label')!.textContent = l.name;
    b.addEventListener('click', () => {
      play('click');
      settings.lang = l.code;
      persistSettings();
      setLang(l.code);
      refreshTexts();
      $('languages').hidden = true;
    });
    grid.appendChild(b);
  }
  $('languages').hidden = false;
});
$('btn-reset').addEventListener('click', (e) => {
  const btn = e.currentTarget as HTMLButtonElement;
  if (btn.dataset.confirm !== '1') {
    btn.dataset.confirm = '1';
    btn.textContent = t('resetConfirm');
    return;
  }
  save = { hints: HINTS_START, done: [] };
  persist();
  btn.dataset.confirm = '';
  btn.textContent = t('reset');
  $('settings').hidden = true;
  showHome();
});

new ResizeObserver(() => {
  if ($('game').hidden || !board || cards.length !== board.cells.length) return;
  computeLayout();
  render(true);
}).observe(stageEl);

// Gancho para testes automatizados.
(window as unknown as { __game: unknown }).__game = {
  get board() { return board; },
  cellCenter(pos: number) {
    const r = boardEl.getBoundingClientRect();
    const [x, y] = cellXY(pos);
    return [r.left + x + layout.cw / 2, r.top + y + layout.ch / 2];
  },
};

refreshTexts();
showHome();
