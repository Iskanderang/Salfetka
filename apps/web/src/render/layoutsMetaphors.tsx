import type { ReactNode } from "react";
import type { Item } from "@napkin/shared";
import { Text } from "./primitives";
import { textHeight, type Fitted } from "./text";
import { tint } from "./themes";
import type { Paint } from "./paint";
import { INNER, PAD, W, Small, accentText, max, valueText, type Renderer } from "./layouts";
export { valueText };
import { halo, rootSpec } from "./layoutsMore";

/** Блок «подпись + пояснение» заданной ширины. */
export function labelBlock(p: Paint, it: Item, w: number, size = 17, lines = 3) {
  const label = p.fit(it.label, w, size, 2, p.labelWeight, 12);
  const text = p.fit(valueText(it), w, 13, lines, 400, 11);
  return { label, text, h: textHeight(label) + (text.lines.length ? textHeight(text) + 3 : 0) };
}

export function drawLabel(p: Paint, b: ReturnType<typeof labelBlock>, x: number, y: number, anchor: "start" | "middle" | "end", color = p.t.text, muted = p.t.muted) {
  return (
    <>
      <Text fit={b.label} x={x} y={y} anchor={anchor} color={color} weight={p.labelWeight} />
      <Text fit={b.text} x={x} y={y + textHeight(b.label) + 3} anchor={anchor} color={muted} />
    </>
  );
}

/** Стрелка-наконечник в точке (x, y), направленная по углу a. */
export function arrowHead(p: Paint, x: number, y: number, a: number, color: string, size = 10, key?: string) {
  const pt = (dx: number, dy: number): [number, number] => [x + dx * Math.cos(a) - dy * Math.sin(a), y + dx * Math.sin(a) + dy * Math.cos(a)];
  return <g key={key}>{p.poly([pt(0, 0), pt(-size, -size * 0.6), pt(-size, size * 0.6)], { fill: color, stroke: p.sketchy ? color : "none", sw: 1, on: "", onMuted: "", icon: "" })}</g>;
}

/** Цвет воды и неба, читаемый и в светлых, и в тёмных стилях. */
const waterColor = (p: Paint) => (p.style.fixedTheme ? p.t.palette[3] : "#3B9BD9");

// ───────────────────────── Айсберг ─────────────────────────
const iceberg: Renderer = (v, p, top) => {
  const n = v.items.length;
  const visible = n <= 3 ? 1 : 2;
  const lx = 600;
  const tw = W - PAD - lx;
  const blocks = v.items.map((it) => labelBlock(p, it, tw, 17, 2));
  const gap = 18;
  const sum = (from: number, to: number) => blocks.slice(from, to).reduce((s, b) => s + b.h, 0) + gap * Math.max(0, to - from - 1);
  const hv = sum(0, visible);
  const hh = sum(visible, n);
  const tipH = Math.max(140, hv + 50);
  const waterY = top + tipH;
  const underH = Math.max(280, hh + 70);
  const cx = 290;
  const ice = p.color(0);
  const wc = waterColor(p);

  const tip: [number, number][] = [
    [cx - 125, waterY],
    [cx - 55, waterY - tipH * 0.72],
    [cx - 15, waterY - tipH + 12],
    [cx + 35, waterY - tipH * 0.6],
    [cx + 125, waterY],
  ];
  const under: [number, number][] = [
    [cx - 125, waterY],
    [cx - 235, waterY + underH * 0.42],
    [cx - 175, waterY + underH * 0.86],
    [cx - 30, waterY + underH - 10],
    [cx + 135, waterY + underH * 0.9],
    [cx + 245, waterY + underH * 0.48],
    [cx + 125, waterY],
  ];
  const tipSpec = p.spec("accent", ice);
  const underSpec = p.spec("card", ice);

  const marks: ReactNode[] = [];
  let lyTop = waterY - 22 - hv;
  let lyBottom = waterY + 40;
  v.items.forEach((it, i) => {
    const above = i < visible;
    const b = blocks[i];
    const y0 = above ? lyTop : lyBottom;
    if (above) lyTop += b.h + gap;
    else lyBottom += b.h + gap;
    const mid = y0 + Math.min(b.h, 24) / 2 + 2;
    // значок на теле айсберга: сверху — на верхушке, снизу — по высоте подводной части
    const k = above ? i : i - visible;
    const cnt = above ? visible : n - visible;
    const ax = above ? cx - 20 + k * 40 : cx - 60 + (k % 2) * 110;
    const ay = above ? waterY - tipH * 0.38 + k * 18 : waterY + 50 + ((underH - 110) * (k + 0.5)) / Math.max(1, cnt);
    const c = p.color(i);
    marks.push(
      <g key={i} data-item={i}>
        {p.line(ax + 16, ay, lx - 14, mid, p.sketchy ? p.lineColor : tint(p.t.text, 0.4), 1.5, "3 4", `l${i}`)}
        <circle cx={ax} cy={ay} r={17} fill={p.t.bg} stroke={c} strokeWidth={2} />
        {p.icon(it.icon, ax, ay, 18, accentText(p, c), i)}
        {drawLabel(p, b, lx, y0, "start")}
      </g>,
    );
  });

  const wave = `M0,${waterY} ` + Array.from({ length: 21 }, (_, i) => `Q${i * 50 + 25},${waterY + (i % 2 ? 6 : -6)} ${(i + 1) * 50},${waterY}`).join(" ");
  const total = waterY + underH + 30;
  return {
    height: total,
    body: (
      <g>
        <rect x={0} y={waterY} width={W} height={total - waterY} fill={tint(wc, 0.13)} />
        {p.curve(wave, tint(wc, 0.8), 2.5, "wave")}
        {p.poly(under, { ...underSpec, fill: p.sketchy ? underSpec.fill : tint(ice, 0.22) })}
        {p.poly(tip, tipSpec)}
        <Small p={p} x={lx} y={waterY - 8 - hv - 22} size={11} color={p.t.muted}>
          НА ПОВЕРХНОСТИ
        </Small>
        <Small p={p} x={lx} y={waterY + 26} size={11} color={tint(wc, 0.9)}>
          ПОД ВОДОЙ
        </Small>
        {marks}
      </g>
    ),
  };
};

// ───────────────────────── Алмаз ─────────────────────────
const diamond: Renderer = (v, p, top) => {
  const D = 170;
  const cx = W / 2;
  const items = v.items.slice(0, 4);
  const side = [0, 1, 2, 3].map((i) => (items[i] ? labelBlock(p, items[i], i % 2 === 0 ? 340 : 230, 18, 3) : null));
  const topH = side[0]?.h ?? 0;
  const cy = top + topH + 30 + D;
  // четыре ромба-четверти: верх, право, низ, лево
  const g = 6;
  const quads: [number, number][][] = [
    [
      [cx, cy - D],
      [cx + D / 2 - g / 2, cy - D / 2 - g / 2],
      [cx, cy - g],
      [cx - D / 2 + g / 2, cy - D / 2 - g / 2],
    ],
    [
      [cx + D / 2 + g / 2, cy - D / 2 + g / 2],
      [cx + D, cy],
      [cx + D / 2 + g / 2, cy + D / 2 - g / 2],
      [cx + g, cy],
    ],
    [
      [cx, cy + g],
      [cx + D / 2 - g / 2, cy + D / 2 + g / 2],
      [cx, cy + D],
      [cx - D / 2 + g / 2, cy + D / 2 + g / 2],
    ],
    [
      [cx - D / 2 - g / 2, cy - D / 2 + g / 2],
      [cx - g, cy],
      [cx - D / 2 - g / 2, cy + D / 2 - g / 2],
      [cx - D, cy],
    ],
  ];
  const centers: [number, number][] = [
    [cx, cy - D / 2],
    [cx + D / 2, cy],
    [cx, cy + D / 2],
    [cx - D / 2, cy],
  ];
  const body = quads.map((q, i) => {
    const it = items[i];
    const c = p.color(i);
    const sp = it ? p.spec("accent", c) : { ...p.spec("plain", c) };
    const b = side[i];
    let label: ReactNode = null;
    if (it && b) {
      if (i === 0) label = drawLabel(p, b, cx, cy - D - 18 - b.h, "middle");
      if (i === 2) label = drawLabel(p, b, cx, cy + D + 18, "middle");
      if (i === 1) label = drawLabel(p, b, cx + D + 24, cy - b.h / 2, "start");
      if (i === 3) label = drawLabel(p, b, cx - D - 24, cy - b.h / 2, "end");
    }
    return (
      <g key={i} data-item={it ? i : undefined}>
        {p.poly(q, sp)}
        {it && p.icon(it.icon, centers[i][0], centers[i][1], 34, sp.icon, i)}
        {label}
      </g>
    );
  });
  return { height: cy + D + 18 + (side[2]?.h ?? 0) + 30, body: <g>{body}</g> };
};

// ───────────────────────── Спидометр ─────────────────────────
const gauge: Renderer = (v, p, top) => {
  const n = v.items.length;
  const R = 220;
  const th = 48;
  const cx = W / 2;
  const labelR = R + 26;
  const blocks = v.items.map((it) => labelBlock(p, it, 200, 16, 2));
  const topLabel = max(blocks.map((b, i) => (Math.abs(Math.cos(Math.PI + (Math.PI * (i + 0.5)) / n)) < 0.5 ? b.h : 0)));
  const cy = top + topLabel + labelR + 10;
  // процент для стрелки: первое значение с «%» среди пунктов, иначе середина шкалы
  const pctItem = v.items.findIndex((it) => /\d\s*%/.test(it.value));
  const pct = pctItem >= 0 ? Math.max(0, Math.min(100, parseFloat(v.items[pctItem].value.replace(",", ".").match(/-?\d+(\.\d+)?/)![0]))) : 50;
  const seg = (i: number) => [Math.PI + (Math.PI * i) / n, Math.PI + (Math.PI * (i + 1)) / n] as const;
  const arcPath = (a0: number, a1: number) => {
    const g = 0.012;
    const [s, e] = [a0 + g, a1 - g];
    const P = (r: number, a: number) => `${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`;
    return `M${P(R, s)} A${R},${R} 0 0 1 ${P(R, e)} L${P(R - th, e)} A${R - th},${R - th} 0 0 0 ${P(R - th, s)} Z`;
  };
  const needleA = Math.PI + (Math.PI * pct) / 100;
  const active = Math.min(n - 1, Math.floor((pct / 100) * n));

  const parts = v.items.map((it, i) => {
    const [a0, a1] = seg(i);
    const am = (a0 + a1) / 2;
    const c = p.color(i);
    const sp = p.spec("accent", c);
    const b = blocks[i];
    const lx = cx + labelR * Math.cos(am);
    const ly = cy + labelR * Math.sin(am);
    const cos = Math.cos(am);
    const anchor = Math.abs(cos) < 0.35 ? "middle" : cos > 0 ? "start" : "end";
    const y0 = Math.abs(cos) < 0.35 ? ly - b.h - 4 : ly - b.h / 2 - (Math.sin(am) > -0.3 ? 10 : 0);
    const im = (R - th / 2);
    return (
      <g key={i} data-item={i}>
        {p.path(arcPath(a0, a1), sp, `a${i}`, [i, 31])}
        {p.icon(it.icon, cx + im * Math.cos(am), cy + im * Math.sin(am), 22, sp.icon, i)}
        {drawLabel(p, b, lx, y0, anchor, i === active ? accentText(p, c) : p.t.text)}
      </g>
    );
  });
  const nx = cx + (R - th - 18) * Math.cos(needleA);
  const ny = cy + (R - th - 18) * Math.sin(needleA);
  const ink = p.sketchy ? p.lineColor : p.t.title;
  const big = p.fit(pctItem >= 0 ? v.items[pctItem].value : "", 300, 40, 1, 800, 24);
  const under = p.fit(v.items[active]?.label ?? "", 320, 16, 1, p.labelWeight, 12);
  return {
    height: cy + 30 + textHeight(big) + textHeight(under) + 30,
    body: (
      <g>
        {parts}
        {p.line(cx, cy, nx, ny, ink, 6)}
        {p.circle(cx, cy, 14, { fill: ink, stroke: ink, sw: 1, on: "", onMuted: "", icon: "" })}
        <Text fit={big} x={cx} y={cy + 24} color={accentText(p, p.color(active))} weight={800} />
        <Text fit={under} x={cx} y={cy + 24 + textHeight(big)} color={p.t.muted} weight={p.labelWeight} />
      </g>
    ),
  };
};

// ───────────────────────── Пьедестал ─────────────────────────
const podium: Renderer = (v, p, top) => {
  const order = [1, 0, 2].filter((i) => v.items[i]); // 2-е слева, 1-е по центру, 3-е справа
  const bw = 240;
  const gap = 10;
  const heights: Record<number, number> = { 0: 210, 1: 150, 2: 110 };
  const total = order.length * bw + (order.length - 1) * gap;
  const x0 = (W - total) / 2;
  const blocks = v.items.slice(0, 3).map((it) => labelBlock(p, it, bw - 20, 18, 3));
  const above = (i: number) => 78 + blocks[i].h;
  const base = top + max(order.map((i) => above(i) + heights[i]));
  const rest = v.items.slice(3);
  const restBlocks = rest.map((it) => p.fit(`${it.label}${it.text ? " — " + it.text : ""}`, INNER - 80, 15, 1, 400, 12));

  const stands = order.map((i, k) => {
    const it = v.items[i];
    const c = p.color(i);
    const sp = p.spec("accent", c);
    const x = x0 + k * (bw + gap);
    const yTop = base - heights[i];
    const ay = yTop - above(i) + 34;
    return (
      <g key={i} data-item={i}>
        {p.rect(x, yTop, bw, heights[i], 8, sp)}
        <text x={x + bw / 2} y={yTop + 20 + 56 * p.textScale} fontSize={64 * p.textScale} fontWeight={800} fill={sp.onMuted} textAnchor="middle">
          {i + 1}
        </text>
        {p.circle(x + bw / 2, ay, 30, p.spec("chip", c))}
        {p.icon(i === 0 ? "trophy" : it.icon, x + bw / 2, ay, 30, p.spec("chip", c).icon, i)}
        {drawLabel(p, blocks[i], x + bw / 2, ay + 42, "middle")}
      </g>
    );
  });
  let ry = base + 30;
  const list = rest.map((it, j) => {
    const f = restBlocks[j];
    const y = ry;
    ry += textHeight(f) + 10;
    return (
      <g key={j} data-item={j + 3}>
        <Small p={p} x={PAD + 24} y={y + f.size * 0.85} size={15} color={accentText(p, p.color(j + 3))}>
          {j + 4}.
        </Small>
        <Text fit={f} x={PAD + 56} y={y} anchor="start" color={p.t.text} />
      </g>
    );
  });
  return {
    height: (rest.length ? ry : base) + 30,
    body: (
      <g>
        {p.line(x0 - 30, base, x0 + total + 30, base, p.lineColor, p.sketchy ? 2 : 3)}
        {stands}
        {list}
      </g>
    ),
  };
};

// ───────────────────────── Весы ─────────────────────────
const scales: Renderer = (v, p, top) => {
  const byChildren = v.items.length >= 2 && (v.items[0].children.length > 0 || v.items[1].children.length > 0);
  const half = Math.ceil(v.items.length / 2);
  const sides = byChildren
    ? [0, 1].map((k) => ({ title: v.items[k].label, icon: v.items[k].icon, rows: v.items[k].children, item: k as number | undefined }))
    : [
        { title: v.items[0]?.label ?? "", icon: v.items[0]?.icon ?? "scale", rows: v.items.slice(0, half).map((it) => it.label), item: undefined },
        { title: v.items[half]?.label ?? "", icon: v.items[half]?.icon ?? "scale", rows: v.items.slice(half).map((it) => it.label), item: undefined },
      ];
  // тяжелее та сторона, где больше доводов
  const diff = sides[1].rows.length - sides[0].rows.length;
  const a = (Math.max(-12, Math.min(12, diff * 5)) * Math.PI) / 180;
  const cx = W / 2;
  const beamY = top + 70;
  const L = 280;
  const ends = [
    [cx - L * Math.cos(a), beamY - L * Math.sin(a)],
    [cx + L * Math.cos(a), beamY + L * Math.sin(a)],
  ];
  const panW = 220;
  const cardW = 260;
  const fitted = sides.map((s) => ({
    title: p.fit(s.title, cardW - 30, 18, 2, p.labelWeight, 13),
    rows: s.rows.map((r) => p.fit("• " + r, cardW - 30, 13, 2, 400, 11)),
  }));
  const cardH = max(fitted.map((f) => 20 + textHeight(f.title) + 8 + f.rows.reduce((s, r) => s + textHeight(r) + 3, 0) + 14));
  const ink = p.sketchy ? p.lineColor : p.t.title;
  const bottom = Math.max(...ends.map((e) => e[1])) + 90 + cardH + 20;

  const pans = sides.map((s, k) => {
    const [ex, ey] = ends[k];
    const c = p.color(k);
    const py = ey + 80;
    const bowl = `M${ex - panW / 2},${py} Q${ex},${py + 46} ${ex + panW / 2},${py} Z`;
    const f = fitted[k];
    const cx0 = ex - cardW / 2;
    const cy0 = py + 34;
    const card = p.spec("card", c);
    let ry = cy0 + 20 + textHeight(f.title) + 8;
    return (
      <g key={k} data-item={s.item}>
        {p.line(ex, ey, ex - panW / 2 + 12, py, ink, 1.5, undefined, `r1${k}`)}
        {p.line(ex, ey, ex + panW / 2 - 12, py, ink, 1.5, undefined, `r2${k}`)}
        {p.path(bowl, p.spec("accent", c), `b${k}`, [k, 77])}
        {p.icon(s.icon, ex, py - 22, 30, accentText(p, c), s.item)}
        {!p.sketchy && <rect x={cx0} y={cy0} width={cardW} height={cardH} rx={p.r(14)} fill={p.t.bg} />}
        {p.rect(cx0, cy0, cardW, cardH, 14, card)}
        <Text fit={f.title} x={ex} y={cy0 + 18} color={card.on} weight={p.labelWeight} />
        {f.rows.map((r, j) => {
          const node = <Text key={j} fit={r} x={cx0 + 16} y={ry} anchor="start" color={card.onMuted} />;
          ry += textHeight(r) + 3;
          return node;
        })}
      </g>
    );
  });
  return {
    height: bottom + 20,
    body: (
      <g>
        {p.line(cx, beamY, cx, bottom, ink, 6)}
        {p.poly(
          [
            [cx - 70, bottom],
            [cx + 70, bottom],
            [cx, bottom - 30],
          ],
          { fill: ink, stroke: ink, sw: 1, on: "", onMuted: "", icon: "" },
        )}
        {p.line(ends[0][0], ends[0][1], ends[1][0], ends[1][1], ink, 6)}
        {p.circle(cx, beamY, 12, { fill: ink, stroke: ink, sw: 1, on: "", onMuted: "", icon: "" })}
        {pans}
      </g>
    ),
  };
};

// ───────────────────────── Горы с флагом ─────────────────────────
const mountains: Renderer = (v, p, top) => {
  const n = v.items.length;
  const H = Math.max(380, n * 62);
  const peakX = 560;
  const peakY = top + 60;
  const base = peakY + H;
  const c0 = p.color(0);
  const back: [number, number][] = [
    [30, base],
    [260, peakY + H * 0.38],
    [470, base],
  ];
  const main: [number, number][] = [
    [140, base],
    [peakX, peakY],
    [W - 30, base],
  ];
  const snow: [number, number][] = [
    [peakX, peakY],
    [peakX - 62, peakY + 66],
    [peakX - 26, peakY + 54],
    [peakX, peakY + 74],
    [peakX + 30, peakY + 56],
    [peakX + 70, peakY + 70],
  ];
  // тропа: зигзаг от подножия к вершине
  const pts = v.items.map((_, i) => {
    const t = n === 1 ? 1 : i / (n - 1);
    const y = base - 40 - t * (H - 40);
    const halfW = ((y - peakY) / H) * (W - 30 - 140) * 0.5;
    const centerX = peakX - ((y - peakY) / H) * 70;
    const zig = i === n - 1 ? 0 : (i % 2 === 0 ? -1 : 1) * halfW * 0.45;
    return [centerX + zig, y] as [number, number];
  });
  const trail = pts.map((q, i) => `${i ? "L" : "M"}${q[0]},${q[1]}`).join(" ");
  const labels = v.items.map((it, i) => {
    const [x, y] = pts[i];
    const c = p.color(i);
    const last = i === n - 1;
    const b = labelBlock(p, it, 230, 16, 2);
    // все подписи справа от точки — так они не наезжают друг на друга при зигзаге тропы
    const right = true;
    const lx = last ? x + 50 : x + 34;
    const sp = p.spec("accent", c);
    return (
      <g key={i} data-item={i}>
        {last && p.line(x, y, x, y - 70, p.lineColor, 3, undefined, "pole")}
        {last &&
          p.poly(
            [
              [x, y - 70],
              [x + 44, y - 58],
              [x, y - 46],
            ],
            { ...sp, fill: c, stroke: p.sketchy ? p.lineColor : c },
          )}
        {halo(p, x, y, 24)}
        {p.circle(x, y, 19, sp)}
        {p.icon(it.icon, x, y, 18, sp.icon, i)}
        <rect x={right ? lx - 8 : lx - 238} y={y - b.h / 2 - 6} width={246} height={b.h + 12} rx={8} fill={p.t.bg} opacity={0.85} />
        {drawLabel(p, b, lx, y - b.h / 2, right ? "start" : "end")}
      </g>
    );
  });
  return {
    height: base + 26,
    body: (
      <g>
        {p.poly(back, { ...p.spec("card", p.color(1)), fill: p.sketchy ? p.spec("card", p.color(1)).fill : tint(p.color(1), 0.16) })}
        {p.poly(main, { ...p.spec("card", c0), fill: p.sketchy ? p.spec("card", c0).fill : tint(c0, 0.22) })}
        {p.poly(snow, { fill: p.t.bg, stroke: p.sketchy ? p.lineColor : "none", sw: 1.2, on: "", onMuted: "", icon: "" })}
        {p.curve(trail, p.sketchy ? p.lineColor : tint(p.t.title, 0.55), 2.5, "trail")}
        {!p.sketchy && <path d={trail} fill="none" stroke={p.t.bg} strokeWidth={1} strokeDasharray="2 6" />}
        {labels}
      </g>
    ),
  };
};

// ───────────────────────── Храм ─────────────────────────
const temple: Renderer = (v, p, top) => {
  const n = v.items.length;
  const roof = v.items[0];
  const found = n >= 3 ? v.items[n - 1] : undefined;
  const colIdx = n >= 3 ? v.items.map((_, i) => i).slice(1, -1) : v.items.map((_, i) => i).slice(1);
  const k = Math.max(1, colIdx.length);
  const left = 110;
  const right = W - 110;
  const width = right - left;
  const cgap = 26;
  const cw = Math.min(150, (width - 40 - (k - 1) * cgap) / k);
  const roofH = 130;
  const roofSp = rootSpec(p);
  const roofFit = p.fit(roof?.label ?? v.title, 420, 22, 2, p.titleWeight, 14);
  const roofText = p.fit(roof?.text ?? "", 460, 13, 1, 400, 11);
  const cols = colIdx.map((i) => {
    const it = v.items[i];
    const label = p.fit(it.label, cw - 16, 15, 3, p.labelWeight, 11);
    const text = p.fit(it.text, cw - 16, 12, 5, 400, 10);
    return { i, it, label, text, h: 70 + textHeight(label) + 6 + textHeight(text) + 20 };
  });
  const colH = Math.max(230, max(cols.map((c) => c.h)));
  const entY = top + roofH;
  const colTop = entY + 22;
  const colBottom = colTop + colH;
  const fLabel = p.fit(found ? `${found.label}${found.text ? " — " + found.text : ""}` : "", width - 40, 17, 2, p.labelWeight, 12);
  const fH = Math.max(56, textHeight(fLabel) + 24);
  const ink = p.sketchy ? p.lineColor : p.t.title;

  const totalW = k * cw + (k - 1) * cgap;
  const cx0 = (W - totalW) / 2;
  const pillars = cols.map((c, j) => {
    const x = cx0 + j * (cw + cgap);
    const col = p.color(c.i);
    const sp = p.spec("card", col);
    return (
      <g key={c.i} data-item={c.i}>
        {p.rect(x - 8, colTop, cw + 16, 16, 3, p.spec("accent", col))}
        {p.rect(x, colTop + 16, cw, colH - 32, 4, sp)}
        {p.rect(x - 8, colBottom - 16, cw + 16, 16, 3, p.spec("accent", col))}
        {p.icon(c.it.icon, x + cw / 2, colTop + 48, 26, accentText(p, col), c.i)}
        <Text fit={c.label} x={x + cw / 2} y={colTop + 72} color={sp.on} weight={p.labelWeight} />
        <Text fit={c.text} x={x + cw / 2} y={colTop + 72 + textHeight(c.label) + 6} color={sp.onMuted} />
      </g>
    );
  });
  return {
    height: colBottom + 2 * fH + 30,
    body: (
      <g>
        <g data-item={roof ? 0 : undefined}>
          {p.poly(
            [
              [left - 20, entY],
              [W / 2, top],
              [right + 20, entY],
            ],
            roofSp,
          )}
          <Text fit={roofFit} x={W / 2} y={top + roofH * 0.62 - textHeight(roofFit) / 2} color={roofSp.on} weight={p.titleWeight} />
          <Text fit={roofText} x={W / 2} y={top + roofH * 0.62 + textHeight(roofFit) / 2 + 2} color={roofSp.onMuted} />
        </g>
        {p.rect(left - 10, entY, width + 20, 22, 3, { fill: ink, stroke: ink, sw: 1, on: "", onMuted: "", icon: "" })}
        {pillars}
        <g data-item={found ? n - 1 : undefined}>
          {p.rect(left - 10, colBottom, width + 20, fH, 4, p.spec("accent", p.color(n - 1)))}
          {p.rect(left - 40, colBottom + fH, width + 80, fH, 4, p.spec("card", p.color(n - 1)))}
          <Text fit={fLabel} x={W / 2} y={colBottom + fH / 2} valign="middle" color={p.spec("accent", p.color(n - 1)).on} weight={p.labelWeight} />
        </g>
      </g>
    ),
  };
};

// ───────────────────────── Мост ─────────────────────────
const bridge: Renderer = (v, p, top) => {
  const n = v.items.length;
  const bankW = 190;
  const xa = PAD + bankW;
  const xb = W - PAD - bankW;
  const mids = v.items.slice(1, n - 1);
  const midX = mids.map((_, j) => xa + ((xb - xa) * (j + 1)) / (mids.length + 1));
  const bankBlocks = [v.items[0], v.items[n - 1]].map((it) => labelBlock(p, it, bankW - 24, 17, 3));
  const midW = Math.min(220, (xb - xa) / Math.max(1, mids.length) - 16);
  const midBlocks = mids.map((it) => labelBlock(p, it, midW, 15, 3));
  const aboveH = Math.max(max(midBlocks.map((b) => b.h)) + 70, 40);
  const deckY = top + aboveH;
  const bankH = Math.max(150, max(bankBlocks.map((b) => b.h)) + 80);
  const wc = waterColor(p);
  const ink = p.sketchy ? p.lineColor : p.t.title;
  const piers = [xa, ...midX, xb];
  const arches = piers.slice(0, -1).map((x0, j) => {
    const x1 = piers[j + 1];
    return p.curve(`M${x0},${deckY + 110} Q${(x0 + x1) / 2},${deckY - 30} ${x1},${deckY + 110}`, ink, 3, `arch${j}`);
  });
  const bank = (k: 0 | 1) => {
    const i = k === 0 ? 0 : n - 1;
    const it = v.items[i];
    const x = k === 0 ? PAD : W - PAD - bankW;
    const c = p.color(i);
    const sp = p.spec("accent", c);
    const b = bankBlocks[k];
    return (
      <g key={`bank${k}`} data-item={i}>
        {p.rect(x, deckY, bankW, bankH, 10, sp)}
        {p.icon(it.icon, x + bankW / 2, deckY + 36, 30, sp.icon, i)}
        {drawLabel(p, b, x + bankW / 2, deckY + 62, "middle", sp.on, sp.onMuted)}
        <Small p={p} x={x + bankW / 2} y={deckY - 12} size={13} color={accentText(p, c)} anchor="middle">
          {k === 0 ? "ТОЧКА А" : "ТОЧКА Б"}
        </Small>
      </g>
    );
  };
  const supports = mids.map((it, j) => {
    const x = midX[j];
    const i = j + 1;
    const c = p.color(i);
    const sp = p.spec("accent", c);
    const b = midBlocks[j];
    return (
      <g key={i} data-item={i}>
        {p.rect(x - 10, deckY + 8, 20, bankH - 40, 3, { fill: ink, stroke: ink, sw: 1, on: "", onMuted: "", icon: "" })}
        {halo(p, x, deckY - 26, 23)}
        {p.circle(x, deckY - 26, 19, sp)}
        {p.icon(it.icon, x, deckY - 26, 18, sp.icon, i)}
        {drawLabel(p, b, x, deckY - 52 - b.h, "middle")}
      </g>
    );
  });
  const waterTop = deckY + bankH - 50;
  return {
    height: deckY + bankH + 30,
    body: (
      <g>
        <rect x={PAD + bankW} y={waterTop} width={W - 2 * (PAD + bankW)} height={deckY + bankH - waterTop} fill={tint(wc, 0.16)} />
        {arches}
        {p.rect(xa - 6, deckY - 2, xb - xa + 12, 12, 3, { fill: ink, stroke: ink, sw: 1, on: "", onMuted: "", icon: "" })}
        {supports}
        {bank(0)}
        {bank(1)}
        {arrowHead(p, xb - 30, deckY - 70, 0, tint(p.t.text, 0.4), 12, "dir")}
        {p.line(xa + 30, deckY - 70, xb - 34, deckY - 70, tint(p.t.text, 0.3), 2, "6 8", "dirline")}
      </g>
    ),
  };
};

// ───────────────────────── Блок-схема ─────────────────────────
const flowchart: Renderer = (v, p, top) => {
  const cx = W / 2;
  const boxW = 380;
  const dW = 300;
  const dH = 150;
  const sideW = 210;
  const ink = p.sketchy ? p.lineColor : tint(p.t.text, 0.55);
  let y = top;
  const nodes: ReactNode[] = [];
  const links: ReactNode[] = [];
  v.items.forEach((it, i) => {
    const c = p.color(i);
    const decision = it.children.length >= 2;
    if (i > 0) {
      links.push(p.line(cx, y - 34, cx, y - 6, ink, 2, undefined, `in${i}`));
      links.push(arrowHead(p, cx, y - 2, Math.PI / 2, ink, 10, `ah${i}`));
    }
    if (!decision) {
      const label = p.fit(it.label, boxW - 80, 18, 2, p.labelWeight, 13);
      const text = p.fit(it.text, boxW - 80, 13, 2, 400, 11);
      const h = Math.max(64, 22 + textHeight(label) + (text.lines.length ? textHeight(text) + 4 : 0) + 18);
      const sp = p.spec("card", c);
      nodes.push(
        <g key={i} data-item={i}>
          {!p.sketchy && <rect x={cx - boxW / 2} y={y} width={boxW} height={h} rx={p.r(12)} fill={p.t.bg} />}
          {p.rect(cx - boxW / 2, y, boxW, h, 12, sp)}
          {p.circle(cx - boxW / 2 + 32, y + h / 2, 18, p.spec("chip", c))}
          {p.icon(it.icon, cx - boxW / 2 + 32, y + h / 2, 20, p.spec("chip", c).icon, i)}
          <Text fit={label} x={cx - boxW / 2 + 62} y={y + h / 2 - (textHeight(label) + (text.lines.length ? textHeight(text) + 4 : 0)) / 2} anchor="start" color={sp.on} weight={p.labelWeight} />
          <Text fit={text} x={cx - boxW / 2 + 62} y={y + h / 2 - (textHeight(label) + textHeight(text) + 4) / 2 + textHeight(label) + 4} anchor="start" color={sp.onMuted} />
        </g>,
      );
      y += h + 40;
      return;
    }
    // вопрос: ромб и два исхода по бокам
    const sp = p.spec("accent", c);
    const q = p.fit(it.label, dW * 0.55, 15, 3, p.labelWeight, 11);
    // «да: …» / «нет: …» — метка уже стоит на стрелке, в тексте исхода её не повторяем
    const outs = it.children.slice(0, 2).map((ch) => p.fit(ch.replace(/^\s*(да|нет|yes|no)\s*[:—–-]\s*/i, ""), sideW - 24, 13, 4, 400, 11));
    const sideH = max(outs.map((o) => textHeight(o) + 24));
    const rowH = Math.max(dH, sideH);
    const my = y + rowH / 2;
    const dia: [number, number][] = [
      [cx, my - dH / 2],
      [cx + dW / 2, my],
      [cx, my + dH / 2],
      [cx - dW / 2, my],
    ];
    const sideNodes = outs.map((o, k) => {
      const sx = k === 0 ? cx - dW / 2 - 60 - sideW : cx + dW / 2 + 60;
      const tag = (it.children[k].match(/^\s*(да|нет|yes|no)\b/i)?.[1] ?? (k === 0 ? "да" : "нет")).toLowerCase();
      const card = p.spec("card", p.color(i + k + 1));
      return (
        <g key={k}>
          {p.line(k === 0 ? cx - dW / 2 : cx + dW / 2, my, k === 0 ? sx + sideW + 8 : sx - 8, my, ink, 2, undefined, `b${k}`)}
          {arrowHead(p, k === 0 ? sx + sideW + 4 : sx - 4, my, k === 0 ? Math.PI : 0, ink, 10, `bh${k}`)}
          <Small p={p} x={k === 0 ? cx - dW / 2 - 30 : cx + dW / 2 + 30} y={my - 10} size={12} color={p.t.muted} anchor="middle">
            {tag}
          </Small>
          {!p.sketchy && <rect x={sx} y={my - sideH / 2} width={sideW} height={sideH} rx={p.r(10)} fill={p.t.bg} />}
          {p.rect(sx, my - sideH / 2, sideW, sideH, 10, card)}
          <Text fit={o} x={sx + sideW / 2} y={my} valign="middle" color={card.on} />
        </g>
      );
    });
    nodes.push(
      <g key={i} data-item={i}>
        {p.poly(dia, sp)}
        <Text fit={q} x={cx} y={my} valign="middle" color={sp.on} weight={p.labelWeight} />
        {sideNodes}
      </g>,
    );
    y += rowH + 40;
  });
  return {
    height: y,
    body: (
      <g>
        {links}
        {nodes}
      </g>
    ),
  };
};

// ───────────────────────── Рыбья кость ─────────────────────────
const fishbone: Renderer = (v, p, top) => {
  const n = v.items.length;
  const headW = 210;
  const headX = W - PAD - headW;
  const tops = v.items.map((_, i) => i).filter((i) => i % 2 === 0);
  const bots = v.items.map((_, i) => i).filter((i) => i % 2 === 1);
  const k = Math.max(tops.length, bots.length);
  const x1 = PAD + 170;
  const x2 = headX - 50;
  const step = k > 1 ? (x2 - x1) / (k - 1) : 0;
  const bw = Math.min(210, Math.max(150, step - 12));
  const boneLen = 130;
  const slant = 80;
  const blockOf = (it: Item) => {
    const label = p.fit(it.label, bw, 16, 2, p.labelWeight, 12);
    const kids: Fitted[] = it.children.slice(0, 4).map((ch) => p.fit("• " + ch, bw, 12, 1, 400, 10));
    const text = it.children.length ? p.fit("", bw, 12, 1) : p.fit(it.text, bw, 12, 2, 400, 10);
    return { label, kids, text, h: textHeight(label) + 4 + kids.reduce((s, f) => s + textHeight(f) + 1, 0) + textHeight(text) };
  };
  const blocks = v.items.map(blockOf);
  const topH = max(tops.map((i) => blocks[i].h));
  const botH = max(bots.map((i) => blocks[i].h));
  const spineY = top + topH + 18 + boneLen;
  const ink = p.sketchy ? p.lineColor : p.t.title;
  const headFit = p.fit(v.title, headW - 30, 20, 4, p.titleWeight, 13);
  const headH = Math.max(90, textHeight(headFit) + 30);
  const rs = rootSpec(p);

  const bones = v.items.map((it, i) => {
    const up = i % 2 === 0;
    const slot = Math.floor(i / 2);
    const ax = x1 + slot * step + (up ? 0 : step / 2) * (k > 1 ? 1 : 0);
    const ex = ax - slant;
    const ey = up ? spineY - boneLen : spineY + boneLen;
    const c = p.color(i);
    const b = blocks[i];
    const by = up ? ey - 10 - b.h : ey + 10;
    let ky = by + textHeight(b.label) + 4;
    return (
      <g key={i} data-item={i}>
        {p.line(ax, spineY, ex, ey, c, 3, undefined, `bone${i}`)}
        {halo(p, ex, ey, 19)}
        {p.circle(ex, ey, 15, p.spec("accent", c))}
        {p.icon(it.icon, ex, ey, 15, p.spec("accent", c).icon, i)}
        <Text fit={b.label} x={ex} y={by} color={p.t.text} weight={p.labelWeight} />
        {b.kids.map((f, j) => {
          const node = <Text key={j} fit={f} x={ex} y={ky} color={p.t.muted} />;
          ky += textHeight(f) + 1;
          return node;
        })}
        <Text fit={b.text} x={ex} y={ky} color={p.t.muted} />
      </g>
    );
  });
  return {
    height: spineY + boneLen + 14 + botH + 30,
    body: (
      <g>
        {p.line(PAD, spineY, headX - 4, spineY, ink, 5, undefined, "spine")}
        {arrowHead(p, headX, spineY, 0, ink, 16, "spineHead")}
        {bones}
        <g data-title="1">
          {p.rect(headX + 6, spineY - headH / 2, headW - 6, headH, 16, rs)}
          <Text fit={headFit} x={headX + 6 + (headW - 6) / 2} y={spineY} valign="middle" color={rs.on} weight={p.titleWeight} />
        </g>
      </g>
    ),
  };
};

// ───────────────────────── Лестница решений ─────────────────────────
const decisions: Renderer = (v, p, top) => {
  const n = v.items.length;
  const sw = INNER / n;
  const rh = n <= 4 ? 80 : n <= 6 ? 64 : 52;
  const tw = sw - 14;
  const blocks = v.items.map((it) => {
    const label = p.fit(it.label, tw, 16, 3, p.labelWeight, 12);
    const text = p.fit(it.text, tw, 12, 3, 400, 10);
    const opts: Fitted[] = it.children.slice(0, 3).map((ch) => p.fit("→ " + ch, tw, 12, 2, 400, 10));
    return { label, text, opts, h: textHeight(label) + 3 + textHeight(text) + opts.reduce((s, f) => s + textHeight(f) + 2, 0) };
  });
  const base = top + max(blocks.map((b, i) => b.h + 48 + (i + 1) * rh)) + 10;
  const tread = (i: number) => base - (i + 1) * rh;
  let d = `M${PAD},${base}`;
  for (let i = 0; i < n; i++) d += ` V${tread(i)} H${PAD + (i + 1) * sw}`;
  const c0 = p.color(0);
  const ink = p.sketchy ? p.lineColor : p.t.title;

  const nodes = v.items.map((it, i) => {
    const c = p.color(i);
    const x = PAD + i * sw + sw / 2;
    const y = tread(i);
    const b = blocks[i];
    const sp = p.spec("accent", c);
    const bt = y - 30 - b.h;
    let oy = bt + textHeight(b.label) + 3 + textHeight(b.text);
    const dia: [number, number][] = [
      [x, y - 22],
      [x + 22, y],
      [x, y + 22],
      [x - 22, y],
    ];
    return (
      <g key={i} data-item={i}>
        {p.poly(dia, sp)}
        {p.icon(it.icon, x, y, 18, sp.icon, i)}
        <Text fit={b.label} x={x} y={bt} color={p.t.text} weight={p.labelWeight} />
        <Text fit={b.text} x={x} y={bt + textHeight(b.label) + 3} color={p.t.muted} />
        {b.opts.map((f, j) => {
          const node = <Text key={j} fit={f} x={x} y={oy + 2} color={accentText(p, c)} />;
          oy += textHeight(f) + 2;
          return node;
        })}
      </g>
    );
  });
  const endX = PAD + n * sw;
  const endY = tread(n - 1);
  return {
    height: base + 30,
    body: (
      <g>
        {!p.sketchy && <path d={`${d} V${base} Z`} fill={tint(c0, 0.08)} />}
        {p.curve(d, ink, 4, "stair")}
        {p.icon("flag", endX - 14, endY - 22, 26, p.color(n - 1))}
        {nodes}
      </g>
    ),
  };
};

// ───────────────────────── Диалог ─────────────────────────
const dialogue: Renderer = (v, p, top) => {
  const maxW = 560;
  const avatarR = 26;
  let y = top;
  const rows = v.items.map((it, i) => {
    const left = i % 2 === 0;
    const c = p.color(left ? 0 : 1);
    const speaker = it.text ? it.label : "";
    const phrase = it.text || it.label;
    const name = p.fit(speaker, maxW - 40, 13, 1, 800, 11);
    const body = p.fit(phrase, maxW - 40, 16, 6, 400, 12);
    const bodyW = Math.min(maxW, Math.max(180, 40 + max(body.lines.map((l) => l.length * body.size * 0.55)), 40 + max(name.lines.map((l) => l.length * name.size * 0.6))));
    const h = 18 + (name.lines.length ? textHeight(name) + 4 : 0) + textHeight(body) + 16;
    const ax = left ? PAD + avatarR : W - PAD - avatarR;
    const bx = left ? ax + avatarR + 22 : ax - avatarR - 22 - bodyW;
    const rowY = y;
    y += Math.max(h, avatarR * 2) + 20;
    // в рукописных стилях плотная штриховка «съедает» текст — обе стороны светлыми карточками
    const sp = p.spec(left || p.sketchy ? "card" : "accent", c);
    const tail: [number, number][] = left
      ? [
          [bx + 2, rowY + 20],
          [bx - 14, rowY + 30],
          [bx + 2, rowY + 38],
        ]
      : [
          [bx + bodyW - 2, rowY + 20],
          [bx + bodyW + 14, rowY + 30],
          [bx + bodyW - 2, rowY + 38],
        ];
    return (
      <g key={i} data-item={i}>
        {p.circle(ax, rowY + avatarR, avatarR, p.spec("chip", c))}
        {p.icon(it.icon, ax, rowY + avatarR, 24, p.spec("chip", c).icon, i)}
        {!p.sketchy && <rect x={bx} y={rowY} width={bodyW} height={h} rx={p.r(16)} fill={p.t.bg} />}
        {p.poly(tail, { ...sp, stroke: "none" })}
        {p.rect(bx, rowY, bodyW, h, 16, sp)}
        <Text fit={name} x={bx + 20} y={rowY + 14} anchor="start" color={left ? accentText(p, c) : sp.onMuted} weight={800} />
        <Text fit={body} x={bx + 20} y={rowY + 14 + (name.lines.length ? textHeight(name) + 4 : 0)} anchor="start" color={sp.on} />
      </g>
    );
  });
  return { height: y + 10, body: <g>{rows}</g> };
};

export const METAPHORS: Record<
  "iceberg" | "diamond" | "decisions" | "flowchart" | "fishbone" | "podium" | "scales" | "mountains" | "temple" | "bridge" | "dialogue" | "gauge",
  Renderer
> = { iceberg, diamond, decisions, flowchart, fishbone, podium, scales, mountains, temple, bridge, dialogue, gauge };

