// Temas (categorias) e níveis de cada tema.
import manifest from '../public/images/manifest.json';

export interface Picture {
  id: string;
  chapter: string;
  chapterTitle: string;
  title: string;
  file: string;
  thumb: string;
}

export interface Theme {
  id: string;
  title: string;
  pictures: Picture[];
}

const THEME_ORDER = ['paisagens', 'animais', 'cidades', 'flores', 'comidas', 'fantasia', 'anime'];

export const THEMES: Theme[] = (() => {
  const byId = new Map<string, Theme>();
  for (const p of manifest as Picture[]) {
    if (!byId.has(p.chapter)) byId.set(p.chapter, { id: p.chapter, title: p.chapterTitle, pictures: [] });
    byId.get(p.chapter)!.pictures.push(p);
  }
  const rank = (id: string) => (THEME_ORDER.indexOf(id) + 99) % 99;
  const out = [...byId.values()].sort((a, b) => rank(a.id) - rank(b.id));
  for (const t of out) t.pictures.sort((a, b) => a.id.localeCompare(b.id));
  return out;
})();

export const ALL_PICTURES: Picture[] = THEMES.flatMap((t) => t.pictures);

/** Grade de cada nível dentro do tema. Imagens 3:4 com grade quadrada dão cartas em pé. */
const GRIDS = [3, 3, 4, 4, 5, 5, 5, 6, 6, 7];
export function gridFor(indexInTheme: number): number {
  return GRIDS[Math.min(indexInTheme, GRIDS.length - 1)];
}
