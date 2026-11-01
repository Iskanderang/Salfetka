import type { Item } from "@napkin/shared";
import { Text } from "./primitives";
import { textHeight, type Fitted } from "./text";
import { lighten, mix, tint } from "./themes";
import type { Paint, Spec } from "./paint";
import { INNER, PAD, W, accentText, cardBlock, drawCard, max, type Renderer } from "./layouts";
import { halo } from "./layoutsMore";
import { arrowHead, drawLabel, labelBlock, valueText } from "./layoutsMetaphors";

/** Сплошная заливка без контура — для «неживых» деталей (ствол, сопло, цоколь). */
const solid = (c: string, p: Paint): Spec => ({ fill: c, stroke: p.sketchy ? p.lineColor : c, sw: 1.2, on: "", onMuted: "", icon: "" });

/** Колонка подписей: раскладывает блоки сверху вниз и возвращает y каждого. */
function stack(blocks: { h: number }[], y0: number, gap: number) {
  let y = y0;
  return blocks.map((b) => {
    const at = y;
    y += b.h + gap;
    return at;
  });
}
const stackH = (blocks: { h: number }[], gap: number) => blocks.reduce((s, b) => s + b.h, 0) + gap * Math.max(0, blocks.length - 1);

/** Карточки «что ещё» под главной фигурой — обычная сетка карточек. */
function extraCards(p: Paint, items: Item[], first: number, y: number) {
  if (!items.length) return { h: 0, node: null };
  const cols = Math.min(3, items.length);
  const gap = 20;
  const w = (INNER - gap * (cols - 1)) / cols;
  const blocks = items.map((it) => cardBlock(p, it, w));
  const rows = Math.ceil(items.length / cols);
  const h = max(blocks.map((b) => b.h));
  return {
    h: rows * (h + gap),
    node: (
      <g>
        {items.map((it, j) => {
          const inRow = Math.min(cols, items.length - Math.floor(j / cols) * cols);
          const x = (W - (inRow * w + (inRow - 1) * gap)) / 2 + (j % cols) * (w + gap);
          return drawCard(p, it, first + j, x, y + Math.floor(j / cols) * (h + gap), w, h, blocks[j]);
        })}
      </g>
    ),
  };
}

/** Цвет палитры, ближе всего к зелёному: крона «живая» в любой палитре, где зелёный есть. */
function greenest(p: Paint) {
  const hue = (c: string) => {
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16) / 255);
    const mx = Math.max(r, g, b);
    const mn = Math.min(r, g, b);
    if (mx === mn) return { h: 0, s: 0 };
    const d = mx - mn;
    const h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
    return { h: (h * 60 + 360) % 360, s: d / mx };
  };
  const cands = p.t.palette.map((c) => ({ c, ...hue(c) })).filter((x) => x.s > 0.25);
  if (!cands.length) return p.color(0);
  return cands.sort((a, b) => Math.abs(a.h - 140) - Math.abs(b.h - 140))[0].c;
}

// ───────────────────────── Дерево ─────────────────────────
const tree: Renderer = (v, p, top) => {
  const n = v.items.length;
  const nRoots = Math.max(1, Math.ceil(n / 2));
  const roots = v.items.slice(0, nRoots);
  const fruits = v.items.slice(nRoots);
  const cx = W / 2;
  const colW = 230;
  // плоды: чётные слева, нечётные справа
  const sides = [0, 1].map((s) => fruits.map((it, j) => ({ it, i: nRoots + j })).filter((_, j) => j % 2 === s));
  const fBlocks = sides.map((side) => side.map(({ it }) => labelBlock(p, it, colW, 17, 3)));
  const fGap = 34;
  const colH = max(fBlocks.map((b) => stackH(b, fGap)));
  const cy = top + Math.max(165, colH / 2 + 10);
  const crownC = p.premium ? greenest(p) : fruits.length ? p.color(nRoots) : p.color(0);
  const crownSp: Spec = p.sketchy
    ? { ...p.spec("card", crownC), stroke: "none" }
    : {
        // крона из перекрывающихся кругов — только сплошной цвет, иначе на стыках пятна
        fill: p.premium === "dark" ? mix(crownC, p.t.bg, 0.5) : lighten(crownC, p.premium ? 0.7 : 0.78),
        stroke: "none",
        sw: 0,
        on: "",
        onMuted: "",
        icon: "",
      };
  const blobs: [number, number, number][] = [
    [0, -70, 100],
    [-100, -20, 88],
    [100, -20, 88],
    [-62, 52, 86],
    [62, 52, 86],
    [0, 10, 104],
  ];
  const wood = p.style.fixedTheme || p.sketchy ? p.lineColor : "#9A7456";
  const groundY = cy + 240;

  const fruitNodes = sides.flatMap((side, s) => {
    const ys = stack(fBlocks[s], cy - stackH(fBlocks[s], fGap) / 2, fGap);
    return side.map(({ it, i }, k) => {
      const b = fBlocks[s][k];
      const ly = ys[k];
      const mid = ly + Math.min(b.h, 26) / 2 + 2;
      const fx = cx + (s === 0 ? -1 : 1) * (58 + (k % 2) * 56);
      const fy = Math.max(cy - 100, Math.min(cy + 90, mid));
      const c = p.color(i);
      const sp = p.spec("accent", c);
      const lx = s === 0 ? cx - 210 : cx + 210;
      return (
        <g key={i} data-item={i}>
          {p.line(fx + (s === 0 ? -22 : 22), fy, lx + (s === 0 ? 10 : -10), mid, p.sketchy ? p.lineColor : tint(p.t.text, 0.35), 1.5, "3 4", `fl${i}`)}
          {halo(p, fx, fy, 25)}
          {p.circle(fx, fy, 21, sp)}
          {p.icon(it.icon, fx, fy, 20, sp.icon, i)}
          {drawLabel(p, b, lx, ly, s === 0 ? "end" : "start")}
        </g>
      );
    });
  });

  const k = roots.length;
  const span = Math.min(700, 230 * (k - 1));
  const xs = roots.map((_, j) => (k === 1 ? cx : cx - span / 2 + (span * j) / (k - 1)));
  const rw = k === 1 ? 320 : Math.min(260, span / (k - 1) - 18);
  const rBlocks = roots.map((it) => labelBlock(p, it, rw, 16, 3));
  const nodeY = groundY + 120;
  const rootNodes = roots.map((it, j) => {
    const x = xs[j];
    const c = p.color(j);
    const sp = p.spec("accent", c);
    const sx = cx + (x - cx) * 0.06;
    return (
      <g key={j} data-item={j}>
        {p.curve(`M${sx},${groundY - 4} C${cx + (x - cx) * 0.25},${groundY + 55} ${x},${groundY + 30} ${x},${nodeY - 24}`, wood, 6, `root${j}`)}
        {halo(p, x, nodeY, 27)}
        {p.circle(x, nodeY, 23, sp)}
        {p.icon(it.icon, x, nodeY, 21, sp.icon, j)}
        {drawLabel(p, rBlocks[j], x, nodeY + 34, "middle")}
      </g>
    );
  });

  return {
    height: nodeY + 34 + max(rBlocks.map((b) => b.h)) + 30,
    body: (
      <g>
        <rect x={0} y={groundY} width={W} height={nodeY + 34 + max(rBlocks.map((b) => b.h)) + 30 - groundY} fill={tint(wood, 0.07)} />
        {p.line(PAD, groundY, W - PAD, groundY, tint(p.t.text, 0.35), 2, undefined, "ground")}
        {rootNodes}
        {p.poly(
          [
            [cx - 20, cy + 40],
            [cx + 20, cy + 40],
            [cx + 34, groundY + 2],
            [cx - 34, groundY + 2],
          ],
          solid(wood, p),
        )}
        {blobs.map(([dx, dy, r], j) => (
          <g key={`b${j}`}>{p.circle(cx + dx, cy + dy, r, { ...crownSp, stroke: p.sketchy ? crownSp.stroke : "none" })}</g>
        ))}
        {fruitNodes}
      </g>
    ),
  };
};

// ───────────────────────── Ракета ─────────────────────────
const rocket: Renderer = (v, p, top) => {
  const n = v.items.length;
  const cx = 270;
  const bw = 150;
  const lx = cx + bw / 2 + 120;
  const lw = W - PAD - lx;
  const blocks = v.items.map((it) => labelBlock(p, it, lw, 18, 3));
  const noseH = Math.max(150, blocks[n - 1].h + 30);
  const segH = v.items.map((_, i) => Math.max(86, blocks[i].h + 24));
  const noseTop = top + 20;
  const noseBottom = noseTop + noseH;
  // ступени сверху вниз: n-2 … 0
  const segTop: number[] = [];
  let y = noseBottom;
  for (let i = n - 2; i >= 0; i--) {
    segTop[i] = y;
    y += segH[i];
  }
  const bottom = y;
  const ink = p.sketchy ? p.lineColor : p.t.title;
  const finSp = p.spec("accent", p.color(n - 1));
  const lineC = p.sketchy ? p.lineColor : tint(p.t.text, 0.35);

  const label = (i: number, mid: number) => {
    const b = blocks[i];
    return (
      <>
        {p.line(cx + bw / 2 + 12, mid, lx - 14, mid, lineC, 1.5, "3 4", `ln${i}`)}
        {p.circle(lx - 14, mid, 4, solid(accentText(p, p.color(i)), p))}
        {drawLabel(p, b, lx, mid - b.h / 2, "start")}
      </>
    );
  };

  const segs = v.items.slice(0, n - 1).map((it, i) => {
    const c = p.color(i);
    const sp = p.spec("accent", c);
    const mid = segTop[i] + segH[i] / 2;
    return (
      <g key={i} data-item={i}>
        {p.rect(cx - bw / 2, segTop[i], bw, segH[i], 0, sp)}
        {p.icon(it.icon, cx, mid, 30, sp.icon, i)}
        {label(i, mid)}
      </g>
    );
  });
  const last = n - 1;
  const ns = p.spec("accent", p.color(last));
  const nose = `M${cx - bw / 2},${noseBottom} C${cx - bw / 2},${noseTop + noseH * 0.45} ${cx - bw * 0.2},${noseTop + 12} ${cx},${noseTop} C${cx + bw * 0.2},${noseTop + 12} ${cx + bw / 2},${noseTop + noseH * 0.45} ${cx + bw / 2},${noseBottom} Z`;
  const winY = noseTop + noseH * 0.62;
  const flameTop = bottom + 22;
  const flame = `M${cx - 42},${flameTop} Q${cx - 46},${flameTop + 50} ${cx},${flameTop + 110} Q${cx + 46},${flameTop + 50} ${cx + 42},${flameTop} Z`;
  const core = `M${cx - 22},${flameTop} Q${cx - 24},${flameTop + 34} ${cx},${flameTop + 70} Q${cx + 24},${flameTop + 34} ${cx + 22},${flameTop} Z`;
  const stars = [
    [cx - 170, top + 60],
    [cx + 150, top + 40],
    [cx - 130, top + 210],
    [cx + 175, top + 250],
  ];

  return {
    height: flameTop + 130,
    body: (
      <g>
        {stars.map(([sx, sy], j) => (
          <g key={`s${j}`}>{p.icon("sparkle", sx, sy, 18, tint(p.t.text, 0.3))}</g>
        ))}
        {p.poly(
          [
            [cx - bw / 2, bottom - 90],
            [cx - bw / 2 - 58, bottom + 24],
            [cx - bw / 2, bottom],
          ],
          finSp,
        )}
        {p.poly(
          [
            [cx + bw / 2, bottom - 90],
            [cx + bw / 2 + 58, bottom + 24],
            [cx + bw / 2, bottom],
          ],
          finSp,
        )}
        {p.path(flame, { fill: "#FF8A3D", stroke: p.sketchy ? p.lineColor : "none", sw: 1, on: "", onMuted: "", icon: "" }, "flame", [cx, 91])}
        {p.path(core, { fill: "#FFD166", stroke: "none", sw: 0, on: "", onMuted: "", icon: "" }, "core", [cx, 92])}
        {p.poly(
          [
            [cx - 44, bottom],
            [cx + 44, bottom],
            [cx + 54, bottom + 24],
            [cx - 54, bottom + 24],
          ],
          solid(ink, p),
        )}
        {segs}
        <g data-item={last}>
          {p.path(nose, ns, "nose", [cx, noseTop, 5])}
          {p.circle(cx, winY, 30, { fill: p.t.bg, stroke: p.sketchy ? p.lineColor : ns.on, sw: 4, on: "", onMuted: "", icon: "" })}
          {p.icon(v.items[last].icon, cx, winY, 28, accentText(p, p.color(last)), last)}
          {label(last, winY)}
        </g>
      </g>
    ),
  };
};

// ───────────────────────── Пазл ─────────────────────────
/** Контур детали пазла: +1 — выступ наружу, -1 — выемка, 0 — ровный край. */
function piecePath(x: number, y: number, w: number, h: number, t: { top: number; right: number; bottom: number; left: number }, r: number) {
  const edge = (ax: number, ay: number, bx: number, by: number, s: number) => {
    if (!s) return `L${bx},${by}`;
    const L = Math.hypot(bx - ax, by - ay);
    const dx = (bx - ax) / L;
    const dy = (by - ay) / L;
    const n1 = L / 2 - r * 0.75;
    const n2 = L / 2 + r * 0.75;
    return `L${ax + dx * n1},${ay + dy * n1} A${r},${r} 0 1 ${s > 0 ? 1 : 0} ${ax + dx * n2},${ay + dy * n2} L${bx},${by}`;
  };
  return `M${x},${y} ${edge(x, y, x + w, y, t.top)} ${edge(x + w, y, x + w, y + h, t.right)} ${edge(x + w, y + h, x, y + h, t.bottom)} ${edge(x, y + h, x, y, t.left)} Z`;
}

const puzzle: Renderer = (v, p, top) => {
  const n = v.items.length;
  const cols = n <= 3 ? n : n === 4 ? 2 : n <= 6 ? 3 : 4;
  const rows = Math.ceil(n / cols);
  const r = 22;
  const pw = Math.min(280, (INNER - 2 * r) / cols);
  const blocks = v.items.map((it) => {
    const label = p.fit(it.label, pw - 84, 18, 2, p.labelWeight, 13);
    const text = p.fit(valueText(it), pw - 84, 13, 4, 400, 11);
    return { label, text, h: 44 + textHeight(label) + 4 + textHeight(text) };
  });
  const ph = Math.max(180, max(blocks.map((b) => b.h)) + 90);
  const x0 = (W - cols * pw) / 2;
  const y0 = top + 2 * r;
  const has = (row: number, col: number) => col >= 0 && col < cols && row * cols + col < n;
  const pieces = v.items.map((it, i) => {
    const row = Math.floor(i / cols);
    const col = i % cols;
    const x = x0 + col * pw;
    const y = y0 + row * ph;
    const tabs = { top: row > 0 ? -1 : 0, left: col > 0 ? -1 : 0, right: has(row, col + 1) ? 1 : 0, bottom: has(row + 1, col) ? 1 : 0 };
    const c = p.color(i);
    // от руки плотная штриховка «съедает» текст — деталь светлее
    const base = p.spec(p.sketchy ? "card" : "accent", c);
    // ровный зазор между деталями: обводка цветом фона
    const sp: Spec = p.sketchy ? base : { ...base, stroke: p.t.bg, sw: 4 };
    const b = blocks[i];
    const cy = y + ph / 2 - b.h / 2 + 4;
    return (
      <g key={i} data-item={i}>
        {p.path(piecePath(x, y, pw, ph, tabs, r), sp, `pc${i}`, [x, y, i])}
        {p.icon(it.icon, x + pw / 2, cy + 16, 30, sp.icon, i)}
        <Text fit={b.label} x={x + pw / 2} y={cy + 44} color={sp.on} weight={p.labelWeight} />
        <Text fit={b.text} x={x + pw / 2} y={cy + 44 + textHeight(b.label) + 4} color={sp.onMuted} />
      </g>
    );
  });
  return { height: y0 + rows * ph + 2 * r + 20, body: <g>{pieces}</g> };
};

// ───────────────────────── Дорога с указателями ─────────────────────────
const road: Renderer = (v, p, top) => {
  const n = v.items.length;
  const x1 = PAD + 100;
  const x2 = W - PAD - 100;
  const xs = v.items.map((_, i) => (n === 1 ? W / 2 : x1 + ((x2 - x1) * i) / (n - 1)));
  const spacing = n > 1 ? (x2 - x1) / (n - 1) : 400;
  const tiered = spacing < 220;
  const bw = Math.min(220, tiered ? spacing * 2 - 18 : spacing - 18);
  const forkW = bw - 16;
  const stacks = v.items.map((it) => {
    const text = p.fit(valueText(it), bw, 13, 3, 400, 11);
    const label = p.fit(it.label, bw - 62, 16, 2, p.labelWeight, 12);
    const boardH = Math.max(48, textHeight(label) + 18);
    const forks: Fitted[] = it.children.slice(0, 3).map((ch) => p.fit(ch, forkW - 34, 12, 1, 400, 10));
    const h = (text.lines.length ? textHeight(text) + 8 : 0) + boardH + forks.reduce((s) => s + 36, 0);
    return { text, label, boardH, forks, h };
  });
  const tier = (i: number) => (tiered ? i % 2 : 0);
  const h0 = max(stacks.filter((_, i) => tier(i) === 0).map((s) => s.h));
  const h1 = max(stacks.filter((_, i) => tier(i) === 1).map((s) => s.h));
  const lift = (t: number) => (t === 0 ? 40 : 40 + h0 + 34);
  const roadY = top + (tiered ? h1 + 34 : 0) + h0 + 40 + 24;
  const wave = (x: number) => roadY + 12 * Math.sin((x - PAD) / 120);
  const pts: string[] = [];
  for (let x = PAD; x <= W - PAD; x += 20) pts.push(`${pts.length ? "L" : "M"}${x},${wave(x)}`);
  const d = pts.join(" ");
  const ink = p.sketchy ? p.lineColor : tint(p.t.text, 0.6);
  const asphalt = tint(p.t.text, 0.16);

  const signs = v.items.map((it, i) => {
    const s = stacks[i];
    const x = xs[i];
    const c = p.color(i);
    const sp = p.spec(p.sketchy ? "card" : "accent", c);
    const bottomY = wave(x) - 22 - lift(tier(i));
    let yy = bottomY - s.h;
    const textY = yy;
    if (s.text.lines.length) yy += textHeight(s.text) + 8;
    const by = yy;
    yy += s.boardH;
    const board: [number, number][] = [
      [x - bw / 2, by],
      [x + bw / 2 - 16, by],
      [x + bw / 2, by + s.boardH / 2],
      [x + bw / 2 - 16, by + s.boardH],
      [x - bw / 2, by + s.boardH],
    ];
    const forks = s.forks.map((f, j) => {
      const fy = yy + 6 + j * 36;
      const right = j % 2 === 0;
      const fx = x - forkW / 2;
      const fp: [number, number][] = right
        ? [
            [fx, fy],
            [fx + forkW - 12, fy],
            [fx + forkW, fy + 15],
            [fx + forkW - 12, fy + 30],
            [fx, fy + 30],
          ]
        : [
            [fx + 12, fy],
            [fx + forkW, fy],
            [fx + forkW, fy + 30],
            [fx + 12, fy + 30],
            [fx, fy + 15],
          ];
      const card = p.spec("card", c);
      return (
        <g key={j}>
          {!p.sketchy && <polygon points={fp.map((q) => q.join(",")).join(" ")} fill={p.t.bg} />}
          {p.poly(fp, card)}
          <Text fit={f} x={x} y={fy + 15} valign="middle" color={card.on} />
        </g>
      );
    });
    return (
      <g key={i} data-item={i}>
        {p.line(x, by + 6, x, wave(x) - 4, ink, 5, undefined, `pole${i}`)}
        <Text fit={s.text} x={x} y={textY} color={p.t.muted} />
        {p.poly(board, sp)}
        {p.icon(it.icon, x - bw / 2 + 26, by + s.boardH / 2, 22, sp.icon, i)}
        <Text fit={s.label} x={x - bw / 2 + 48} y={by + s.boardH / 2} valign="middle" anchor="start" color={sp.on} weight={p.labelWeight} />
        {forks}
      </g>
    );
  });

  return {
    height: roadY + 60,
    body: (
      <g>
        {p.sketchy ? (
          <>
            {p.curve(d.replace(/,([\d.]+)/g, (_, y) => `,${+y - 22}`), ink, 2.5, "edge1")}
            {p.curve(d.replace(/,([\d.]+)/g, (_, y) => `,${+y + 22}`), ink, 2.5, "edge2")}
          </>
        ) : (
          <path d={d} fill="none" stroke={asphalt} strokeWidth={46} strokeLinecap="round" strokeLinejoin="round" />
        )}
        <path d={d} fill="none" stroke={p.sketchy ? ink : p.t.bg} strokeWidth={3} strokeDasharray="16 14" />
        {signs}
      </g>
    ),
  };
};

// ───────────────────────── Ключ и замок ─────────────────────────
const lock: Renderer = (v, p, top) => {
  const prob = v.items[0];
  const sol = v.items[1];
  const lx = 260;
  const kx = W - 260;
  const cardW = 400;
  const bodyW = 160;
  const bodyH = 130;
  const by = top + 96;
  const keyY = by + bodyH / 2;
  const ink = p.sketchy ? p.lineColor : tint(p.t.text, 0.55);
  const lc = p.color(0);
  const kc = p.color(1);
  const lsp = p.spec("accent", lc);
  const ksp = p.spec("accent", kc);

  const block = (it: Item | undefined, tag: string) => {
    if (!it) return null;
    const t = p.fit(it.label.trim().toLowerCase() === tag.toLowerCase() ? "" : tag, cardW - 48, 12, 1, 800, 10);
    const label = p.fit(it.label, cardW - 48, 21, 2, p.labelWeight, 15);
    const text = p.fit(valueText(it), cardW - 48, 15, 4, 400, 12);
    const kids = it.children.slice(0, 4).map((ch) => p.fit("• " + ch, cardW - 48, 14, 2, 400, 12));
    const h = 22 + textHeight(t) + 6 + textHeight(label) + 6 + textHeight(text) + kids.reduce((s, k) => s + textHeight(k) + 3, 0) + 24;
    return { t, label, text, kids, h };
  };
  const blocks = [block(prob, "ПРОБЛЕМА"), block(sol, "РЕШЕНИЕ")];
  const cardH = max(blocks.map((b) => b?.h ?? 0));
  const cardY = by + bodyH + 44;
  const card = (k: 0 | 1) => {
    const b = blocks[k];
    if (!b) return null;
    const c = k === 0 ? lc : kc;
    const sp = p.spec("card", c);
    const x = (k === 0 ? lx : kx) - cardW / 2;
    let y = cardY + 22;
    const node = (
      <>
        {p.rect(x, cardY, cardW, cardH, 18, sp)}
        <Text fit={b.t} x={x + 24} y={y} anchor="start" color={accentText(p, c)} weight={800} />
        <Text fit={b.label} x={x + 24} y={(y += b.t.lines.length ? textHeight(b.t) + 6 : 0)} anchor="start" color={sp.on} weight={p.labelWeight} />
        <Text fit={b.text} x={x + 24} y={(y += textHeight(b.label) + 6)} anchor="start" color={sp.onMuted} />
        {b.kids.map((f, j) => {
          if (j === 0) y += textHeight(b.text) + 4;
          const at = y;
          y += textHeight(f) + 3;
          return <Text key={j} fit={f} x={x + 24} y={at} anchor="start" color={sp.on} />;
        })}
      </>
    );
    return node;
  };
  const shackle = `M${lx - 50},${by + 6} V${top + 58} A50,50 0 0 1 ${lx + 50},${top + 58} V${by + 6}`;
  const extra = extraCards(p, v.items.slice(2), 2, cardY + cardH + 30);

  return {
    height: cardY + cardH + 30 + extra.h + 10,
    body: (
      <g>
        <g data-item={0}>
          {p.curve(shackle, ink, 16, "shackle")}
          {p.rect(lx - bodyW / 2, by, bodyW, bodyH, 18, lsp)}
          {p.circle(lx, by + 52, 14, { fill: p.t.bg, stroke: "none", sw: 0, on: "", onMuted: "", icon: "" })}
          {p.poly(
            [
              [lx - 8, by + 58],
              [lx + 8, by + 58],
              [lx + 12, by + 92],
              [lx - 12, by + 92],
            ],
            { fill: p.t.bg, stroke: "none", sw: 0, on: "", onMuted: "", icon: "" },
          )}
          {halo(p, lx + bodyW / 2, by, 24)}
          {p.circle(lx + bodyW / 2, by, 20, p.spec("chip", lc))}
          {p.icon(prob.icon, lx + bodyW / 2, by, 20, p.spec("chip", lc).icon, 0)}
          {card(0)}
        </g>
        {p.line(kx - 150, keyY, lx + bodyW / 2 + 44, keyY, tint(p.t.text, 0.35), 2.5, "8 8", "go")}
        {arrowHead(p, lx + bodyW / 2 + 32, keyY, Math.PI, tint(p.t.text, 0.45), 13, "goHead")}
        {sol && (
          <g data-item={1}>
            {p.rect(kx - 128, keyY - 10, 190, 20, 4, ksp)}
            {p.rect(kx - 128, keyY + 8, 18, 30, 3, ksp)}
            {p.rect(kx - 94, keyY + 8, 14, 20, 3, ksp)}
            {p.circle(kx + 100, keyY, 50, ksp)}
            {p.circle(kx + 100, keyY, 26, { fill: p.t.bg, stroke: "none", sw: 0, on: "", onMuted: "", icon: "" })}
            {p.icon(sol.icon, kx + 100, keyY, 26, accentText(p, kc), 1)}
            {card(1)}
          </g>
        )}
        {extra.node}
      </g>
    ),
  };
};

// ───────────────────────── Лампочка ─────────────────────────
const bulb: Renderer = (v, p, top) => {
  const n = v.items.length;
  const cx = W / 2;
  const R = 118;
  const nodeDx = 215;
  const lw = cx - nodeDx - 34 - PAD;
  const left = v.items.map((_, i) => i).filter((i) => i < Math.ceil(n / 2));
  const right = v.items.map((_, i) => i).filter((i) => i >= Math.ceil(n / 2));
  const blocks = v.items.map((it) => {
    const b = labelBlock(p, it, lw, 17, 3);
    return { ...b, h: Math.max(b.h, 40) };
  });
  const gap = 22;
  const colH = Math.max(stackH(left.map((i) => blocks[i]), gap), stackH(right.map((i) => blocks[i]), gap));
  const cy = top + Math.max(R + 60, colH / 2 - 30);
  const glow = p.style.fixedTheme ? p.t.palette[2] : "#FFC83D";
  const ink = p.sketchy ? p.lineColor : p.t.title;
  const neckTop = cy + R * 0.78;
  const neckBottom = cy + R + 50;
  const glass = `M${cx - 62},${neckTop + 4} A${R},${R} 0 1 1 ${cx + 62},${neckTop + 4} L${cx + 46},${neckBottom} L${cx - 46},${neckBottom} Z`;
  const glassSp: Spec = p.sketchy
    ? p.spec("card", glow)
    : p.premium
      ? {
          fill: p.gradient("glass", [
            [0, tint(lighten(glow, 0.6), 0.85)],
            [1, tint(glow, 0.35)],
          ]),
          stroke: tint(glow, 0.9),
          sw: 2,
          on: "",
          onMuted: "",
          icon: "",
        }
      : { fill: tint(glow, 0.28), stroke: glow, sw: 3, on: "", onMuted: "", icon: "" };
  const rays = [-150, -120, -90, -60, -30].map((a) => (a * Math.PI) / 180);

  const side = (ids: number[], s: -1 | 1) => {
    const ys = stack(
      ids.map((i) => blocks[i]),
      cy + 30 - stackH(ids.map((i) => blocks[i]), gap) / 2,
      gap,
    );
    return ids.map((i, k) => {
      const b = blocks[i];
      const mid = ys[k] + Math.min(b.h, 26) / 2 + 2;
      const nx = cx + s * nodeDx;
      const c = p.color(i);
      const sp = p.spec("chip", c);
      // точка на стекле, куда тянется связь
      const a = Math.atan2(mid - cy, s * nodeDx);
      const gx = cx + Math.cos(a) * (R + 10);
      const gy = Math.min(neckBottom, cy + Math.sin(a) * (R + 10));
      return (
        <g key={i} data-item={i}>
          {p.line(gx, gy, nx - s * 26, mid, p.sketchy ? p.lineColor : tint(p.t.text, 0.3), 1.5, "3 5", `c${i}`)}
          {p.circle(nx, mid, 24, sp)}
          {p.icon(v.items[i].icon, nx, mid, 22, sp.icon, i)}
          {drawLabel(p, b, nx + s * 36, ys[k], s < 0 ? "end" : "start")}
        </g>
      );
    });
  };

  const baseY = neckBottom;
  const bottom = Math.max(baseY + 76, cy + 30 + colH / 2) + 30;
  return {
    height: bottom,
    body: (
      <g>
        {rays.map((a, j) => (
          <g key={`r${j}`}>{p.line(cx + Math.cos(a) * (R + 22), cy + Math.sin(a) * (R + 22), cx + Math.cos(a) * (R + 48), cy + Math.sin(a) * (R + 48), glow, 5, undefined, `ray${j}`)}</g>
        ))}
        {p.premium && <circle cx={cx} cy={cy} r={R + 70} fill={tint(glow, p.premium === "dark" ? 0.1 : 0.12)} />}
        {p.premium && <circle cx={cx} cy={cy} r={R + 34} fill={tint(glow, p.premium === "dark" ? 0.12 : 0.14)} />}
        {p.path(glass, glassSp, "glass", [cx, cy, 3])}
        {p.curve(`M${cx - 30},${neckTop} L${cx - 22},${cy - 6} Q${cx - 11},${cy - 30} ${cx},${cy - 6} Q${cx + 11},${cy - 30} ${cx + 22},${cy - 6} L${cx + 30},${neckTop}`, p.sketchy ? p.lineColor : glow, 4, "filament")}
        {[0, 1, 2].map((j) => (
          <g key={`base${j}`}>{p.rect(cx - 50 + j * 3, baseY + 4 + j * 18, 100 - j * 6, 14, 7, solid(ink, p))}</g>
        ))}
        {p.poly(
          [
            [cx - 22, baseY + 58],
            [cx + 22, baseY + 58],
            [cx + 10, baseY + 72],
            [cx - 10, baseY + 72],
          ],
          solid(ink, p),
        )}
        {side(left, -1)}
        {side(right, 1)}
      </g>
    ),
  };
};

export const OBJECTS: Record<"tree" | "rocket" | "puzzle" | "road" | "lock" | "bulb", Renderer> = { tree, rocket, puzzle, road, lock, bulb };
