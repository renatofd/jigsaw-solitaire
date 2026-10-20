// Contorno de um grupo de cartas unidas: um caminho com todos os cantos
// arredondados (inclusive os cantos internos de grupos em L), recuado da borda
// da grade para deixar o espaço entre cartas soltas.

export interface OutlineGeom {
  cols: number;
  cw: number;
  ch: number;
  /** recuo de cada lado solto */
  inset: number;
  radius: number;
}

type Pt = [number, number];
interface Edge { from: Pt; to: Pt; dir: Pt }

const key = (p: Pt) => `${p[0]},${p[1]}`;

/** Laços do contorno (em coordenadas de grade), com o interior sempre à direita (y para baixo). */
function loops(cells: number[], cols: number): Pt[][] {
  const set = new Set(cells);
  const has = (r: number, c: number) => c >= 0 && c < cols && r >= 0 && set.has(r * cols + c);
  const out = new Map<string, Edge[]>();
  const add = (from: Pt, to: Pt) => {
    const e = { from, to, dir: [Math.sign(to[0] - from[0]), Math.sign(to[1] - from[1])] as Pt };
    const k = key(from);
    if (!out.has(k)) out.set(k, []);
    out.get(k)!.push(e);
  };
  for (const pos of cells) {
    const r = Math.floor(pos / cols), c = pos % cols;
    if (!has(r - 1, c)) add([c, r], [c + 1, r]);
    if (!has(r, c + 1)) add([c + 1, r], [c + 1, r + 1]);
    if (!has(r + 1, c)) add([c + 1, r + 1], [c, r + 1]);
    if (!has(r, c - 1)) add([c, r + 1], [c, r]);
  }
  const result: Pt[][] = [];
  for (;;) {
    let start: Edge | undefined;
    for (const list of out.values()) if (list.length) { start = list[0]; break; }
    if (!start) break;
    const pts: Pt[] = [];
    let e = start;
    for (;;) {
      const list = out.get(key(e.from))!;
      list.splice(list.indexOf(e), 1);
      pts.push(e.from);
      const next = [...(out.get(key(e.to)) ?? [])];
      if (key(e.to) === key(start.from)) next.push(start);
      // Em vértices onde duas cartas se tocam só pela diagonal, vira à direita
      // para que cada canto seja arredondado separadamente.
      const right: Pt = [-e.dir[1], e.dir[0]];
      const chosen = next.find((x) => x.dir[0] === right[0] && x.dir[1] === right[1]) ?? next[0];
      if (!chosen || chosen === start) break;
      e = chosen;
    }
    // tira pontos no meio de lados retos
    const n = pts.length;
    result.push(pts.filter((p, i) => {
      const a = pts[(i - 1 + n) % n], b = pts[(i + 1) % n];
      return !((a[0] === p[0] && p[0] === b[0]) || (a[1] === p[1] && p[1] === b[1]));
    }));
  }
  return result;
}

const f = (v: number) => Math.round(v * 100) / 100;

/** Caminho SVG do grupo, deslocado por (ox, oy). */
export function groupPath(cells: number[], g: OutlineGeom, ox = 0, oy = 0): string {
  let d = '';
  for (const loop of loops(cells, g.cols)) {
    const n = loop.length;
    const px = loop.map(([c, r]) => [c * g.cw - ox, r * g.ch - oy] as Pt);
    const corners = px.map((p, i) => {
      const a = px[(i - 1 + n) % n], b = px[(i + 1) % n];
      const d1: Pt = [Math.sign(p[0] - a[0]), Math.sign(p[1] - a[1])];
      const d2: Pt = [Math.sign(b[0] - p[0]), Math.sign(b[1] - p[1])];
      // normal para dentro (à direita do sentido do contorno)
      const v: Pt = [p[0] + g.inset * (-d1[1] - d2[1]), p[1] + g.inset * (d1[0] + d2[0])];
      const rad = g.radius;
      return {
        v,
        a: [v[0] - d1[0] * rad, v[1] - d1[1] * rad] as Pt,
        b: [v[0] + d2[0] * rad, v[1] + d2[1] * rad] as Pt,
      };
    });
    corners.forEach((c, i) => {
      d += `${i ? 'L' : 'M'}${f(c.a[0])} ${f(c.a[1])}Q${f(c.v[0])} ${f(c.v[1])} ${f(c.b[0])} ${f(c.b[1])}`;
    });
    d += 'Z';
  }
  return d;
}
