import type { ProcessEdge, ProcessGraph, ProcessNode } from "@napkin/shared";

/**
 * Раскладка процесса «как в Draw.io» в двух ориентациях:
 * - «h» — слева направо: шаги идут по столбцам, исполнители — горизонтальные дорожки;
 * - «v» — сверху вниз: шаги идут по строкам, исполнители — вертикальные дорожки-колонки.
 * Всё считается в общих осях: u — вдоль процесса, v — поперёк дорожек; в конце оси превращаются в x/y.
 * Стрелки — под прямым углом; возвраты назад («на доработку») идут по краю дорожки, не задевая шагов.
 */

export type Dir = "h" | "v";
export type Box = { w: number; h: number };
export type Rect = { x: number; y: number; w: number; h: number };
export type PlacedNode = ProcessNode & Rect & { rank: number; laneIdx: number };
export type PlacedEdge = ProcessEdge & { points: [number, number][]; back: boolean; labelAt?: [number, number] };
export type PlacedLane = Rect & { name: string; idx: number; head: Rect };
export type ProcessLayout = { dir: Dir; width: number; height: number; lanes: PlacedLane[]; nodes: PlacedNode[]; edges: PlacedEdge[] };

const RANK_GAP: Record<Dir, number> = { h: 84, v: 64 }; // между шагами вдоль процесса — здесь идут повороты стрелок
const SLOT_GAP = 26; // между шагами в одной ячейке
const LANE_PAD: Record<Dir, number> = { h: 26, v: 26 }; // поля дорожки поперёк процесса; в них идут возвраты
export const LANE_HEAD: Record<Dir, number> = { h: 128, v: 52 }; // заголовок дорожки: слева или сверху
const MIN_LANE: Record<Dir, number> = { h: 60, v: 210 }; // ширина дорожки поперёк (в «v» справа от кружков — подпись)

/** Узел в общих осях: u — вдоль процесса, v — поперёк. */
type UV = { u: number; v: number; su: number; sv: number };

export function layoutProcess(g: ProcessGraph, size: (n: ProcessNode) => Box, top: number, left: number, dir: Dir = "h"): ProcessLayout {
  const byId = new Map(g.nodes.map((n) => [n.id, n]));
  const outs = (id: string) => g.edges.filter((e) => e.from === id);
  const H = dir === "h";

  // 1. Обратные связи: обход в глубину от старта; связь в узел, который ещё «на стеке», — возврат назад
  const start = g.nodes.find((n) => n.type === "start") ?? g.nodes[0];
  const back = new Set<ProcessEdge>();
  const state = new Map<string, 1 | 2>();
  const dfs = (id: string) => {
    state.set(id, 1);
    for (const e of outs(id)) {
      const st = state.get(e.to);
      if (st === 1) back.add(e);
      else if (!st) dfs(e.to);
    }
    state.set(id, 2);
  };
  dfs(start.id);
  for (const n of g.nodes) if (!state.has(n.id)) dfs(n.id);
  const fwd = g.edges.filter((e) => !back.has(e));

  // 2. Ранг (шаг процесса) = самый длинный путь от старта по прямым связям
  const rank = new Map<string, number>(g.nodes.map((n) => [n.id, 0]));
  for (let pass = 0; pass < g.nodes.length; pass++) {
    let changed = false;
    for (const e of fwd) {
      const r = rank.get(e.from)! + 1;
      if (r > rank.get(e.to)!) {
        rank.set(e.to, r);
        changed = true;
      }
    }
    if (!changed) break;
  }

  // 3. Размеры в общих осях
  const laneNames = g.lanes.length ? g.lanes : [""];
  const laneOf = (n: ProcessNode) => Math.max(0, laneNames.indexOf(n.lane));
  const box = new Map(
    g.nodes.map((n) => {
      const b = size(n);
      return [n.id, H ? { su: b.w, sv: b.h } : { su: b.h, sv: b.w }];
    }),
  );
  const nRanks = Math.max(...rank.values()) + 1;
  const rankSize = Array.from({ length: nRanks }, (_, r) => Math.max(44, ...g.nodes.filter((n) => rank.get(n.id) === r).map((n) => box.get(n.id)!.su)));
  const origin = { u: H ? left : top, v: H ? top : left };
  const headU = g.lanes.length ? LANE_HEAD[dir] : 0;
  const rankU: number[] = [];
  let u = origin.u + headU + (H ? 40 : 30);
  for (let r = 0; r < nRanks; r++) {
    rankU.push(u);
    u += rankSize[r] + RANK_GAP[dir];
  }
  const endU = u - RANK_GAP[dir] + (H ? 40 : 30);

  // ячейка (дорожка × ранг) может содержать несколько шагов — ставим их рядом поперёк процесса;
  // выше/левее тот, чьи соседи по связям выше/левее — так стрелки меньше пересекаются
  const pull = (n: ProcessNode) => {
    const near = g.edges.flatMap((e) => (e.from === n.id ? [e.to] : e.to === n.id ? [e.from] : [])).map((id) => laneOf(byId.get(id)!));
    return near.length ? near.reduce((a, b) => a + b, 0) / near.length : laneOf(n);
  };
  const cell = (lane: number, r: number) => g.nodes.filter((n) => laneOf(n) === lane && rank.get(n.id) === r).sort((a, b) => pull(a) - pull(b));
  // в «h» подпись кружка — под ним, то есть поперёк процесса: после кружка в ячейке нужен запас
  const after = (n: ProcessNode) => SLOT_GAP + (H && (n.type === "start" || n.type === "end") ? 30 : 0);
  const stack = (ns: ProcessNode[]) => ns.reduce((s, n, i) => s + box.get(n.id)!.sv + (i < ns.length - 1 ? after(n) : 0), 0);

  const laneV: { v: number; sv: number }[] = [];
  let v = origin.v;
  for (let l = 0; l < laneNames.length; l++) {
    const inner = Math.max(MIN_LANE[dir], ...Array.from({ length: nRanks }, (_, r) => stack(cell(l, r))));
    const sv = inner + 2 * LANE_PAD[dir] + 8;
    laneV.push({ v, sv });
    v += sv;
  }
  const endV = v;

  const uv = new Map<string, UV>();
  laneV.forEach((ln, l) => {
    const mid = ln.v + (ln.sv - 8) / 2;
    for (let r = 0; r < nRanks; r++) {
      const ns = cell(l, r);
      let vv = mid - stack(ns) / 2;
      for (const n of ns) {
        const b = box.get(n.id)!;
        uv.set(n.id, { u: rankU[r] + (rankSize[r] - b.su) / 2, v: vv, su: b.su, sv: b.sv });
        vv += b.sv + after(n);
      }
    }
  });

  // 4. Стрелки в общих осях
  const list = [...uv.entries()];
  const cu = (id: string) => uv.get(id)!.u + uv.get(id)!.su / 2;
  const cv = (id: string) => uv.get(id)!.v + uv.get(id)!.sv / 2;
  /** Отрезок вдоль u на уровне vv свободен от чужих шагов */
  const clearU = (vv: number, u1: number, u2: number, skip: string[]) =>
    !list.some(([id, n]) => !skip.includes(id) && vv > n.v - 6 && vv < n.v + n.sv + 6 && Math.max(u1, u2) > n.u - 4 && Math.min(u1, u2) < n.u + n.su + 4);
  const clearV = (uu: number, v1: number, v2: number, skip: string[]) =>
    !list.some(([id, n]) => !skip.includes(id) && uu > n.u - 6 && uu < n.u + n.su + 6 && Math.max(v1, v2) > n.v - 4 && Math.min(v1, v2) < n.v + n.sv + 4);
  // сколько поворотов уже в промежутке между рангами — следующие сдвигаем, чтобы не сливались
  const gapUse = new Map<number, number>();
  const gapU = (r: number) => {
    const k = gapUse.get(r) ?? 0;
    gapUse.set(r, k + 1);
    return rankU[r] + rankSize[r] + RANK_GAP[dir] / 2 + (k % 2 ? 1 : -1) * Math.ceil(k / 2) * 9;
  };
  const usedPort = new Set<string>();
  // боковой угол развилки отдаём самой дальней цели в эту сторону: ближние идут основным путём и не пересекают её
  const farthest = new Map<string, ProcessEdge>();
  for (const e of g.edges) {
    const d = cv(e.to) - cv(e.from);
    if (Math.abs(d) <= 2) continue;
    const k = `${e.from}:${d > 0 ? 1 : -1}`;
    const cur = farthest.get(k);
    if (!cur || Math.abs(d) > Math.abs(cv(cur.to) - cv(cur.from))) farthest.set(k, e);
  }
  let backN = 0;
  // подписи у выхода: «вдоль» — сразу за выходом, «поперёк» — у угла развилки
  const labelFlow = (uu: number, vv: number): [number, number] => (H ? [uu + 8, vv - 7] : [uu + 16, vv + 6]);
  const labelCross = (uu: number, vEdge: number, sign: 1 | -1): [number, number] => (H ? [uu + 8, vEdge + (sign > 0 ? 14 : -6)] : [uu - 8, vEdge + (sign > 0 ? 8 : -34)]);

  type Route = { pts: [number, number][]; label: [number, number] };
  const routeBack = (s: string, t: string): Route => {
    const S = uv.get(s)!;
    const T = uv.get(t)!;
    const skip = [s, t];
    const shift = (backN++ % 3) * 9;
    const cands: number[] = [];
    for (const l of [...new Set([laneOf(byId.get(s)!), laneOf(byId.get(t)!)])]) {
      const ln = laneV[l];
      cands.push(ln.v + ln.sv - 12 - shift, ln.v + 12 + shift);
    }
    cands.push(endV - 10 - shift);
    for (const vv of cands) {
      const sOut = vv > cv(s) ? S.v + S.sv : S.v;
      const tIn = vv > cv(t) ? T.v + T.sv : T.v;
      if (vv === cands[cands.length - 1] || (clearV(cu(s), sOut, vv, skip) && clearU(vv, cu(s), cu(t), skip) && clearV(cu(t), vv, tIn, skip)))
        return {
          pts: [
            [cu(s), sOut],
            [cu(s), vv],
            [cu(t), vv],
            [cu(t), tIn],
          ],
          // подпись — на обходном отрезке ближе к началу возврата: у середины часто стоит развилка со своими «да»/«нет»
          label: H ? [cu(s) * 0.7 + cu(t) * 0.3, vv - 6] : [cu(s) * 0.7 + cu(t) * 0.3, vv + 6],
        };
    }
    throw new Error("unreachable");
  };

  const routes: (Route & { e: ProcessEdge; back: boolean })[] = g.edges.map((e) => {
    const S = uv.get(e.from)!;
    const T = uv.get(e.to)!;
    const skip = [e.from, e.to];
    const isBack = back.has(e) || rank.get(e.to)! <= rank.get(e.from)!;
    if (isBack) return { e, back: true, ...routeBack(e.from, e.to) };
    const sv = cv(e.from);
    const tv = cv(e.to);
    const type = byId.get(e.from)!.type;
    const gateway = type === "decision" || type === "parallel";
    // из развилки к шагу в другой дорожке — выходим из бокового угла ромба
    const sign: 1 | -1 = tv > sv ? 1 : -1;
    const port = `${e.from}:${sign}`;
    if (gateway && Math.abs(tv - sv) > 2 && !usedPort.has(port) && farthest.get(port) === e && clearV(cu(e.from), sv, tv, skip) && clearU(tv, cu(e.from), T.u, skip)) {
      usedPort.add(port);
      const vEdge = sign > 0 ? S.v + S.sv : S.v;
      return {
        e,
        back: false,
        pts: [
          [cu(e.from), vEdge],
          [cu(e.from), tv],
          [T.u, tv],
        ],
        label: labelCross(cu(e.from), vEdge, sign),
      };
    }
    const exitU = S.u + S.su;
    if (Math.abs(tv - sv) <= 2 && clearU(sv, exitU, T.u, skip))
      return {
        e,
        back: false,
        pts: [
          [exitU, sv],
          [T.u, tv],
        ],
        label: labelFlow(exitU, sv),
      };
    // поворот — в промежутке перед целью, если вдоль процесса путь свободен; иначе сразу после источника
    const rs = rank.get(e.from)!;
    const rt = rank.get(e.to)!;
    let gu = gapU(rt - 1);
    if (!clearU(sv, exitU, gu, skip) && clearU(tv, rankU[rs] + rankSize[rs], T.u, skip)) {
      gapUse.set(rt - 1, (gapUse.get(rt - 1) ?? 1) - 1);
      gu = gapU(rs);
    }
    return {
      e,
      back: false,
      pts: [
        [exitU, sv],
        [gu, sv],
        [gu, tv],
        [T.u, tv],
      ],
      label: labelFlow(exitU, sv),
    };
  });

  // 5. Общие оси → x/y
  const P = (uu: number, vv: number): [number, number] => (H ? [uu, vv] : [vv, uu]);
  const R = (uu: number, vv: number, su: number, sv: number): Rect => (H ? { x: uu, y: vv, w: su, h: sv } : { x: vv, y: uu, w: sv, h: su });
  const nodes: PlacedNode[] = g.nodes.map((n) => {
    const q = uv.get(n.id)!;
    return { ...n, ...R(q.u, q.v, q.su, q.sv), rank: rank.get(n.id)!, laneIdx: laneOf(n) };
  });
  const lanes: PlacedLane[] = laneV.map((ln, l) => ({
    name: laneNames[l],
    idx: l,
    ...R(origin.u, ln.v, endU - origin.u, ln.sv - 6),
    head: R(origin.u, ln.v, headU, ln.sv - 6),
  }));
  const edges: PlacedEdge[] = routes.map((r) => ({
    ...r.e,
    back: r.back,
    points: r.pts.map(([a, b]) => P(a, b)),
    labelAt: P(r.label[0], r.label[1]),
  }));
  const [width, height] = P(endU, endV);
  return { dir, width, height, lanes, nodes, edges };
}
