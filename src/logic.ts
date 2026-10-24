// Regras puras do jogo: tabuleiro, grupos e movimentos. Sem dependência de renderização.

export interface Board {
  rows: number;
  cols: number;
  /** cells[pos] = id da carta naquela posição; a carta id pertence à posição id */
  cells: number[];
}

export type Rng = () => number;

export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Verdadeiro se a carta em `a` e a carta em `b` (vizinhas no tabuleiro) também são vizinhas na imagem. */
export function linked(board: Board, a: number, b: number): boolean {
  const { cols, cells } = board;
  const pa = cells[a];
  const pb = cells[b];
  if (b === a + 1 && a % cols !== cols - 1) return pb === pa + 1 && pa % cols !== cols - 1;
  if (b === a - 1 && b % cols !== cols - 1) return pa === pb + 1 && pb % cols !== cols - 1;
  if (b === a + cols) return pb === pa + cols;
  if (b === a - cols) return pa === pb + cols;
  return false;
}

/** Retorna, para cada posição, o índice do grupo a que pertence (union-find por vizinhança correta). */
export function groupIds(board: Board): number[] {
  const n = board.cells.length;
  const parent = Array.from({ length: n }, (_, i) => i);
  const find = (x: number): number => {
    while (parent[x] !== x) {
      parent[x] = parent[parent[x]];
      x = parent[x];
    }
    return x;
  };
  for (let p = 0; p < n; p++) {
    const c = p % board.cols;
    if (c < board.cols - 1 && linked(board, p, p + 1)) parent[find(p)] = find(p + 1);
    if (p + board.cols < n && linked(board, p, p + board.cols)) parent[find(p)] = find(p + board.cols);
  }
  return parent.map((_, i) => find(i));
}

export function groupOf(board: Board, pos: number): number[] {
  const ids = groupIds(board);
  const out: number[] = [];
  ids.forEach((g, p) => g === ids[pos] && out.push(p));
  return out;
}

export function isSolved(board: Board): boolean {
  return board.cells.every((id, pos) => id === pos);
}

/** Limita o deslocamento para que o grupo inteiro continue dentro do tabuleiro. */
export function clampOffset(board: Board, group: number[], dr: number, dc: number): [number, number] {
  let minR = Infinity, maxR = -Infinity, minC = Infinity, maxC = -Infinity;
  for (const p of group) {
    const r = Math.floor(p / board.cols);
    const c = p % board.cols;
    minR = Math.min(minR, r); maxR = Math.max(maxR, r);
    minC = Math.min(minC, c); maxC = Math.max(maxC, c);
  }
  dr = Math.max(-minR, Math.min(board.rows - 1 - maxR, dr));
  dc = Math.max(-minC, Math.min(board.cols - 1 - maxC, dc));
  return [dr, dc];
}

/**
 * Move um grupo (lista de posições) por (dr, dc). As cartas que estavam no destino
 * deslizam para as posições que o grupo deixou, seguindo o sentido inverso do movimento.
 */
export function moveGroup(board: Board, group: number[], dr: number, dc: number): Board {
  const off = dr * board.cols + dc;
  const from = new Set(group);
  const to = new Set(group.map((p) => p + off));
  const cells = board.cells.slice();
  for (const p of group) cells[p + off] = board.cells[p];
  for (const q of to) {
    if (from.has(q)) continue;
    let dest = q - off;
    while (to.has(dest)) dest -= off;
    cells[dest] = board.cells[q];
  }
  return { ...board, cells };
}

/** Embaralha garantindo que nenhuma carta comece encaixada com uma vizinha. */
export function shuffled(rows: number, cols: number, rng: Rng): Board {
  const n = rows * cols;
  let best: Board | null = null;
  let bestLinks = Infinity;
  for (let attempt = 0; attempt < 500; attempt++) {
    const cells = Array.from({ length: n }, (_, i) => i);
    for (let i = n - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [cells[i], cells[j]] = [cells[j], cells[i]];
    }
    const board = { rows, cols, cells };
    const links = countLinks(board);
    if (links < bestLinks) {
      best = board;
      bestLinks = links;
    }
    if (links === 0) break;
  }
  return best!;
}

/** Quantos pares de cartas vizinhas já estão encaixados. */
export function countLinks(board: Board): number {
  const { cols } = board;
  const n = board.cells.length;
  let links = 0;
  for (let p = 0; p < n; p++) {
    if (p % cols < cols - 1 && linked(board, p, p + 1)) links++;
    if (p + cols < n && linked(board, p, p + cols)) links++;
  }
  return links;
}

export interface Suggestion {
  /** posição da carta que o jogador arrasta */
  from: number;
  /** posição onde ela deve ser solta */
  to: number;
  dr: number;
  dc: number;
}

/**
 * Melhor jogada para ensinar: a que mais encaixa cartas. Prefere mover uma carta sozinha
 * (mais fácil de entender); só usa grupos se nenhuma carta solta encaixa nada.
 */
export function suggestMove(board: Board): Suggestion | null {
  const ids = groupIds(board);
  const groups = new Map<number, number[]>();
  ids.forEach((g, p) => {
    if (!groups.has(g)) groups.set(g, []);
    groups.get(g)!.push(p);
  });
  const base = countLinks(board);
  let best: (Suggestion & { gain: number; size: number }) | null = null;
  for (const group of groups.values()) {
    for (let dr = -board.rows + 1; dr < board.rows; dr++) {
      for (let dc = -board.cols + 1; dc < board.cols; dc++) {
        if (dr === 0 && dc === 0) continue;
        const [cr, cc] = clampOffset(board, group, dr, dc);
        if (cr !== dr || cc !== dc) continue;
        const gain = countLinks(moveGroup(board, group, dr, dc)) - base;
        if (gain <= 0) continue;
        const better = !best || group.length < best.size || (group.length === best.size && gain > best.gain);
        if (better) best = { from: group[0], to: group[0] + dr * board.cols + dc, dr, dc, gain, size: group.length };
      }
    }
  }
  return best && { from: best.from, to: best.to, dr: best.dr, dc: best.dc };
}
