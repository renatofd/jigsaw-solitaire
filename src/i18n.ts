// Idiomas: detecção automática, textos e bandeiras.
import { type Lang, STRINGS, TITLES } from './i18n-strings';

export type { Lang };

export interface LangInfo {
  code: Lang;
  name: string;
  flag: string;
}

// Bandeiras simplificadas em SVG (emojis de bandeira não aparecem no Windows).
const F = (body: string) => `<svg viewBox="0 0 30 20" aria-hidden="true">${body}</svg>`;
const stripesH = (...c: string[]) => c.map((col, i) => `<rect y="${(20 / c.length) * i}" width="30" height="${20 / c.length + 0.1}" fill="${col}"/>`).join('');
const stripesV = (...c: string[]) => c.map((col, i) => `<rect x="${10 * i}" width="10.1" height="20" fill="${col}"/>`).join('');
const star = (cx: number, cy: number, r: number, fill: string, rot = 0) => {
  const pts = Array.from({ length: 10 }, (_, i) => {
    const a = ((i * 36 - 90 + rot) * Math.PI) / 180;
    const rr = i % 2 ? r * 0.4 : r;
    return `${(cx + rr * Math.cos(a)).toFixed(2)},${(cy + rr * Math.sin(a)).toFixed(2)}`;
  });
  return `<polygon points="${pts.join(' ')}" fill="${fill}"/>`;
};

export const LANGS: LangInfo[] = [
  { code: 'en', name: 'English', flag: F('<rect width="30" height="20" fill="#012169"/><path d="M0 0l30 20M30 0L0 20" stroke="#fff" stroke-width="4"/><path d="M0 0l30 20M30 0L0 20" stroke="#C8102E" stroke-width="1.6"/><path d="M15 0v20M0 10h30" stroke="#fff" stroke-width="6"/><path d="M15 0v20M0 10h30" stroke="#C8102E" stroke-width="3.4"/>') },
  { code: 'pt', name: 'Português', flag: F('<rect width="30" height="20" fill="#009C3B"/><path d="M15 2.5L27 10 15 17.5 3 10z" fill="#FFDF00"/><circle cx="15" cy="10" r="4.6" fill="#002776"/><path d="M10.6 9.2q4.6-1.4 8.9 1.4" stroke="#fff" stroke-width="0.9" fill="none"/>') },
  { code: 'es', name: 'Español', flag: F('<rect width="30" height="20" fill="#AA151B"/><rect y="5" width="30" height="10" fill="#F1BF00"/>') },
  { code: 'fr', name: 'Français', flag: F(stripesV('#002395', '#fff', '#ED2939')) },
  { code: 'de', name: 'Deutsch', flag: F(stripesH('#000', '#DD0000', '#FFCE00')) },
  { code: 'it', name: 'Italiano', flag: F(stripesV('#009246', '#fff', '#CE2B37')) },
  { code: 'tr', name: 'Türkçe', flag: F(`<rect width="30" height="20" fill="#E30A17"/><circle cx="11" cy="10" r="5" fill="#fff"/><circle cx="12.3" cy="10" r="4" fill="#E30A17"/>${star(17.6, 10, 2.4, '#fff', -18)}`) },
  { code: 'ru', name: 'Русский', flag: F(stripesH('#fff', '#0039A6', '#D52B1E')) },
  { code: 'ar', name: 'العربية', flag: F('<rect width="30" height="20" fill="#006C35"/><path d="M8 7.5q2-1.6 3 0t3 0 3 0 3 0 3 0M9 10q2.5-1.2 5 0t5 0" stroke="#fff" stroke-width="1" fill="none" stroke-linecap="round"/><path d="M8.5 13.6h12.5l1.6-.9" stroke="#fff" stroke-width="0.9" fill="none" stroke-linecap="round"/>') },
  { code: 'hi', name: 'हिन्दी', flag: F(`${stripesH('#FF9933', '#fff', '#138808')}<circle cx="15" cy="10" r="2.6" fill="none" stroke="#000080" stroke-width="0.6"/><circle cx="15" cy="10" r="0.6" fill="#000080"/>`) },
  { code: 'id', name: 'Bahasa Indonesia', flag: F(stripesH('#CE1126', '#fff')) },
  { code: 'ja', name: '日本語', flag: F('<rect width="30" height="20" fill="#fff"/><circle cx="15" cy="10" r="6" fill="#BC002D"/>') },
  { code: 'zh', name: '中文', flag: F(`<rect width="30" height="20" fill="#EE1C25"/>${star(5, 5, 3, '#FFFF00')}${star(10, 2, 1, '#FFFF00', 23)}${star(12, 4, 1, '#FFFF00', 45)}${star(12, 7, 1, '#FFFF00', 0)}${star(10, 9, 1, '#FFFF00', 23)}`) },
  { code: 'ko', name: '한국어', flag: F('<rect width="30" height="20" fill="#fff"/><g transform="rotate(33.7 15 10)"><path d="M10 10a5 5 0 0 1 10 0z" fill="#CD2E3A"/><path d="M10 10a5 5 0 0 0 10 0z" fill="#0047A0"/><circle cx="12.5" cy="10" r="2.5" fill="#CD2E3A"/><circle cx="17.5" cy="10" r="2.5" fill="#0047A0"/></g><g stroke="#000" stroke-width="0.8"><path d="M4.2 5.6l2.6-3.9M5.1 6.2l2.6-3.9M6 6.8l2.6-3.9"/><path d="M21.4 2.9l2.6 3.9M22.3 2.3l2.6 3.9M23.2 1.7l2.6 3.9"/><path d="M4.2 14.4l2.6 3.9M5.1 13.8l2.6 3.9M6 13.2l2.6 3.9"/><path d="M21.4 17.1l2.6-3.9M22.3 17.7l2.6-3.9M23.2 18.3l2.6-3.9"/></g>') },
];

const CODES = new Set(LANGS.map((l) => l.code));

/** Primeiro idioma do navegador que o jogo tem; senão, inglês. */
export function detectLang(): Lang {
  const prefs = navigator.languages?.length ? navigator.languages : [navigator.language];
  for (const p of prefs) {
    const base = (p || '').toLowerCase().split('-')[0];
    if (CODES.has(base as Lang)) return base as Lang;
  }
  return 'en';
}

export function isLang(v: unknown): v is Lang {
  return typeof v === 'string' && CODES.has(v as Lang);
}

let current: Lang = 'en';

export function setLang(lang: Lang) {
  current = lang;
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
}

export function lang(): Lang {
  return current;
}

export function langInfo(code: Lang = current): LangInfo {
  return LANGS.find((l) => l.code === code)!;
}

export function t(key: string, vars: Record<string, string | number> = {}): string {
  const s = STRINGS[current]?.[key] ?? STRINGS.en[key] ?? key;
  return s.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? `{${k}}`));
}

export function pictureTitle(id: string, fallback: string): string {
  return TITLES[current]?.[id] ?? fallback;
}

/** Aplica os textos fixos do HTML marcados com data-i18n / data-i18n-aria. */
export function applyStatic(root: ParentNode = document) {
  for (const el of root.querySelectorAll<HTMLElement>('[data-i18n]')) el.textContent = t(el.dataset.i18n!);
  for (const el of root.querySelectorAll<HTMLElement>('[data-i18n-aria]')) el.setAttribute('aria-label', t(el.dataset.i18nAria!));
}
