import type { ReactNode } from "react";
import type { Item, Layout, Visual } from "@napkin/shared";
import { Text } from "./primitives";
import { textHeight } from "./text";
import { tint } from "./themes";
import type { Paint, Spec } from "./paint";

export const W = 1000;
const PAD = 40;
const INNER = W - PAD * 2;

export type Rendered = { height: number; body: ReactNode };
type Renderer = (v: Visual, p: Paint, top: number) => Rendered;

const max = (xs: number[]) => Math.max(0, ...xs);

function grid(n: number, cols: number, gap: number) {
  const rows = Math.ceil(n / cols);
  const cellW = (INNER - gap * (cols - 1)) / cols;
  return { rows, cellW };
}

/** x-координата ячейки с центрированием неполного последнего ряда. */
function cellX(i: number, n: number, cols: number, cellW: number, gap: number) {
  const row = Math.floor(i / cols);
  const inRow = Math.min(cols, n - row * cols);
  const rowW = inRow * cellW + (inRow - 1) * gap;
  return (W - rowW) / 2 + (i % cols) * (cellW + gap);
}

/** Цвет чисел и акцентного текста вне фигур. */
const accentText = (p: Paint, c: string) => (p.style.accent === "soft" ? p.spec("card", c).icon : c);

const NOLINE: Omit<Spec, "fill" | "stroke" | "sw"> = { on: "", onMuted: "", icon: "" };

/** Небольшой текст (номера, VS) — шрифт наследуется от стиля. */
function Small(props: { x: number; y: number; size: number; color: string; anchor?: "start" | "middle" | "end"; children: ReactNode; p: Paint }) {
  return (
    <text x={props.x} y={props.y} fontSize={props.size * props.p.style.textScale} fontWeight={700} fill={props.color} textAnchor={props.anchor ?? "start"}>
      {props.children}
    </text>
  );
}

// ───────────────────────── Шаги ─────────────────────────
const steps: Renderer = (v, p, top) => {
  const n = v.items.length;
  const gap = 22;
  const colW = (INNER - gap * (n - 1)) / n;
  const bandH = 96;
  const ad = 18;
  const tw = colW - 12;

  const blocks = v.items.map((it) => {
    const value = p.fit(it.value, tw, 15, 1, 700);
    const label = p.fit(it.label, tw, 20, 2, p.labelWeight, 15);
    const text = p.fit(it.text, tw, 15, 4, 400, 12);
    return { value, label, text, h: textHeight(value) + textHeight(label) + 8 + textHeight(text) };
  });
  const textTop = top + bandH + 22;

  const body = v.items.map((it, i) => {
    const x0 = PAD + i * (colW + gap);
    const cx = x0 + colW / 2;
    const c = p.color(i);
    const sp = p.spec("accent", c);
    const pts: [number, number][] = [
      [x0, top],
      [x0 + colW, top],
      ...(i < n - 1 ? ([[x0 + colW + ad, top + bandH / 2]] as [number, number][]) : []),
      [x0 + colW, top + bandH],
      [x0, top + bandH],
      ...(i > 0 ? ([[x0 + ad, top + bandH / 2]] as [number, number][]) : []),
    ];
    const b = blocks[i];
    let y = textTop;
    const valueY = y;
    y += textHeight(b.value);
    const labelY = y;
    y += textHeight(b.label) + 8;
    return (
      <g key={i} data-item={i}>
        {p.poly(pts, sp)}
        <Small p={p} x={x0 + (i > 0 ? ad : 0) + 14} y={top + 26} size={15} color={sp.onMuted}>
          {String(i + 1).padStart(2, "0")}
        </Small>
        {p.icon(it.icon, cx + (i > 0 ? ad / 2 : 0), top + bandH / 2 + 4, 38, sp.icon, i)}
        <Text fit={b.value} x={cx} y={valueY} color={accentText(p, c)} weight={700} />
        <Text fit={b.label} x={cx} y={labelY} color={p.t.text} weight={p.labelWeight} />
        <Text fit={b.text} x={cx} y={y} color={p.t.muted} />
      </g>
    );
  });
  return { height: textTop + max(blocks.map((b) => b.h)) + 40, body };
};

// ───────────────────────── Цикл ─────────────────────────
const cycle: Renderer = (v, p, top) => {
  const n = v.items.length;
  const R = n <= 4 ? 175 : 205;
  const nodeR = 40;
  const cx = W / 2;
  const angle = (i: number) => -Math.PI / 2 + (i * 2 * Math.PI) / n;

  const place = v.items.map((it, i) => {
    const a = angle(i);
    const cos = Math.cos(a);
    const side = Math.abs(cos) < 0.25 ? "center" : cos > 0 ? "right" : "left";
    const w = side === "center" ? 300 : 250;
    const label = p.fit(it.label, w, 19, 2, p.labelWeight, 15);
    const text = p.fit((it.value ? it.value + " · " : "") + it.text, w, 14, 3, 400, 12);
    return { a, side, label, text, h: textHeight(label) + 4 + textHeight(text) };
  });
  const bottom = place.find((q) => q.side === "center" && Math.sin(q.a) > 0);
  const cy = top + place[0].h + 18 + nodeR + R;
  const c0 = p.color(0);

  const arrows = v.items.map((_, i) => {
    const a = angle(i) + Math.PI / n;
    const x = cx + R * Math.cos(a);
    const y = cy + R * Math.sin(a);
    const dir = a + Math.PI / 2;
    const pt = (dx: number, dy: number): [number, number] => [x + dx * Math.cos(dir) - dy * Math.sin(dir), y + dx * Math.sin(dir) + dy * Math.cos(dir)];
    const c = p.color(i);
    return <g key={`a${i}`}>{p.poly([pt(-9, -8), pt(9, 0), pt(-9, 8)], { ...NOLINE, fill: p.sketchy ? c : tint(c, 0.75), stroke: p.sketchy ? c : "none", sw: 1 })}</g>;
  });

  const nodes = v.items.map((it, i) => {
    const q = place[i];
    const x = cx + R * Math.cos(q.a);
    const y = cy + R * Math.sin(q.a);
    const c = p.color(i);
    const sp = p.spec("accent", c);
    let tx = x;
    let ty: number;
    let anchor: "start" | "middle" | "end" = "middle";
    if (q.side === "center") ty = Math.sin(q.a) < 0 ? y - nodeR - 14 - q.h : y + nodeR + 14;
    else {
      anchor = q.side === "right" ? "start" : "end";
      tx = x + (q.side === "right" ? nodeR + 16 : -nodeR - 16);
      ty = y - q.h / 2;
    }
    return (
      <g key={i} data-item={i}>
        {!p.sketchy && p.style.accent === "solid" && <circle cx={x} cy={y} r={nodeR + 6} fill={tint(c, 0.18)} />}
        {p.circle(x, y, nodeR, sp)}
        {p.icon(it.icon, x, y, 34, sp.icon, i)}
        <Text fit={q.label} x={tx} y={ty} color={p.t.text} weight={p.labelWeight} anchor={anchor} />
        <Text fit={q.text} x={tx} y={ty + textHeight(q.label) + 4} color={p.t.muted} anchor={anchor} />
      </g>
    );
  });

  return {
    height: cy + R + nodeR + 30 + (bottom ? bottom.h + 14 : 0),
    body: (
      <g>
        {p.circle(cx, cy, R, { ...NOLINE, fill: "none", stroke: p.sketchy ? p.lineColor : p.t.line, sw: p.sketchy ? 2 : 10 })}
        {!p.sketchy && <circle cx={cx} cy={cy} r={R - 70} fill={tint(c0, 0.06)} />}
        {p.icon("refresh-cw", cx, cy, 64, tint(c0, 0.35))}
        {arrows}
        {nodes}
      </g>
    ),
  };
};

// ───────────────────────── Хронология ─────────────────────────
const timeline: Renderer = (v, p, top) => {
  const n = v.items.length;
  const step = INNER / n;
  const cardW = Math.min(280, step * 2 - 24);
  const tw = cardW - 32;
  const cards = v.items.map((it) => {
    const value = p.fit(it.value, tw, 22, 1, 800, 16);
    const label = p.fit(it.label, tw, 18, 2, p.labelWeight, 14);
    const text = p.fit(it.text, tw, 14, 3, 400, 12);
    return { value, label, text, h: 20 + textHeight(value) + textHeight(label) + 4 + textHeight(text) + 18 };
  });
  const cardH = max(cards.map((c) => c.h));
  const gapToLine = 56;
  const lineY = top + cardH + gapToLine;

  const body = v.items.map((it, i) => {
    const x = PAD + (i + 0.5) * step;
    const cardX = Math.max(PAD / 2, Math.min(W - PAD / 2 - cardW, x - cardW / 2));
    const kx = cardX + cardW / 2;
    const up = i % 2 === 0;
    const c = p.color(i);
    const k = cards[i];
    const card = p.spec("card", c);
    const dot = p.spec("accent", c);
    const cy0 = up ? lineY - gapToLine - cardH : lineY + gapToLine;
    let y = cy0 + 20;
    const vy = y;
    y += textHeight(k.value);
    const ly = y;
    y += textHeight(k.label) + 4;
    const barY = up ? cy0 + cardH - 6 : cy0 + 6;
    return (
      <g key={i} data-item={i}>
        {p.line(x, up ? cy0 + cardH : lineY + 26, x, up ? lineY - 26 : cy0, c, 2, "4 4")}
        {p.rect(cardX, cy0, cardW, cardH, 16, card)}
        {p.line(cardX + 16, barY, cardX + cardW - 16, barY, c, 5)}
        <Text fit={k.value} x={kx} y={vy} color={accentText(p, c)} weight={800} />
        <Text fit={k.label} x={kx} y={ly} color={card.on} weight={p.labelWeight} />
        <Text fit={k.text} x={kx} y={y} color={card.onMuted} />
        {!p.sketchy && <circle cx={x} cy={lineY} r={31} fill={p.t.bg} />}
        {p.circle(x, lineY, 26, dot)}
        {p.icon(it.icon, x, lineY, 24, dot.icon, i)}
      </g>
    );
  });

  return {
    height: lineY + gapToLine + cardH + 40,
    body: (
      <g>
        {p.line(PAD, lineY, W - PAD, lineY, p.lineColor, p.sketchy ? 2.5 : 6)}
        {p.poly(
          [
            [W - PAD + 4, lineY - 10],
            [W - PAD + 20, lineY],
            [W - PAD + 4, lineY + 10],
          ],
          { ...NOLINE, fill: p.lineColor, stroke: p.sketchy ? p.lineColor : "none", sw: 1 },
        )}
        {body}
      </g>
    ),
  };
};

// ───────────────────────── Воронка и пирамида ─────────────────────────
function bands(v: Visual, p: Paint, top: number, widthAt: (i: number) => number, iconOnly = false): Rendered {
  const n = v.items.length;
  const bandH = 78;
  const gap = 8;
  const fcx = 320;
  const tx = 640;
  const tw = W - PAD - tx;

  const body = v.items.map((it, i) => {
    const y = top + i * (bandH + gap);
    const wt = widthAt(i);
    const wb = widthAt(i + 1);
    const c = p.color(i);
    const sp = p.spec("accent", c);
    const midY = y + bandH / 2;
    const label = p.fit(it.label, tw, 19, 2, p.labelWeight, 15);
    const text = p.fit(it.text, tw, 14, 2, 400, 12);
    const h = textHeight(label) + 2 + textHeight(text);
    const inner = Math.min(wt, wb);
    const value = p.fit(it.value, inner - 50, 28, 1, 800, 16);
    const pts: [number, number][] =
      wt < 1
        ? [
            [fcx, y],
            [fcx + wb / 2, y + bandH],
            [fcx - wb / 2, y + bandH],
          ]
        : [
            [fcx - wt / 2, y],
            [fcx + wt / 2, y],
            [fcx + wb / 2, y + bandH],
            [fcx - wb / 2, y + bandH],
          ];
    const iconY = wt < 1 ? y + bandH * 0.62 : midY;
    return (
      <g key={i} data-item={i}>
        {p.poly(pts, sp)}
        {it.value && !iconOnly && inner > 120 ? (
          <>
            {p.icon(it.icon, fcx - inner / 2 + 34, midY, 24, sp.icon, i)}
            <Text fit={value} x={fcx + 12} y={midY} valign="middle" color={sp.on} weight={800} />
          </>
        ) : (
          p.icon(it.icon, fcx, iconY, 30, sp.icon, i)
        )}
        {p.line(fcx + (wt + wb) / 4 + 10, midY, tx - 14, midY, tint(c, 0.6), 2, "3 5")}
        {p.circle(tx - 14, midY, 4, { ...sp, fill: c, stroke: "none" })}
        <Text fit={label} x={tx} y={midY - h / 2} color={p.t.text} weight={p.labelWeight} anchor="start" />
        <Text fit={text} x={tx} y={midY - h / 2 + textHeight(label) + 2} color={p.t.muted} anchor="start" />
      </g>
    );
  });
  return { height: top + n * (bandH + gap) + 32, body };
}

const funnel: Renderer = (v, p, top) => {
  const n = v.items.length;
  return bands(v, p, top, (i) => 540 - ((540 - 170) * i) / n);
};

const pyramid: Renderer = (v, p, top) => {
  const n = v.items.length;
  // первый пункт — вершина
  return bands(v, p, top, (i) => (560 * i) / n, true);
};

// ───────────────────────── Цифры ─────────────────────────
const stats: Renderer = (v, p, top) => {
  const n = v.items.length;
  const cols = n <= 4 ? n : n <= 6 ? 3 : 4;
  const gap = 24;
  const { rows, cellW } = grid(n, cols, gap);
  const tw = cellW - 36;
  const cards = v.items.map((it, i) => {
    const value = p.fit(it.value || String(i + 1).padStart(2, "0"), tw, 52, 1, 800, 28);
    const label = p.fit(it.label, tw, 19, 2, p.labelWeight, 15);
    const text = p.fit(it.text, tw, 14, 3, 400, 12);
    return { value, label, text, h: 96 + textHeight(value) + 6 + textHeight(label) + 6 + textHeight(text) + 26 };
  });
  const cardH = max(cards.map((c) => c.h));

  const body = v.items.map((it, i) => {
    const x = cellX(i, n, cols, cellW, gap);
    const y = top + Math.floor(i / cols) * (cardH + gap);
    const cx = x + cellW / 2;
    const c = p.color(i);
    const card = p.spec("card", c);
    const chip = p.spec("chip", c);
    const k = cards[i];
    let ty = y + 96;
    const vy = ty;
    ty += textHeight(k.value) + 6;
    const ly = ty;
    ty += textHeight(k.label) + 6;
    return (
      <g key={i} data-item={i}>
        {p.rect(x, y, cellW, cardH, 22, card)}
        {p.circle(cx, y + 50, 30, chip)}
        {p.icon(it.icon, cx, y + 50, 30, chip.icon, i)}
        <Text fit={k.value} x={cx} y={vy} color={p.sketchy ? c : card.icon} weight={800} />
        <Text fit={k.label} x={cx} y={ly} color={card.on} weight={p.labelWeight} />
        <Text fit={k.text} x={cx} y={ty} color={card.onMuted} />
      </g>
    );
  });
  return { height: top + rows * (cardH + gap) + 16, body };
};

// ───────────────────────── Колонка с шапкой (сравнение, иерархия) ─────────────────────────
function columnBody(p: Paint, it: Item, w: number) {
  const tw = w - 40;
  const value = p.fit(it.value, tw, 20, 1, 800, 15);
  const text = p.fit(it.text, tw, 14, 3, 400, 12);
  let y = 16;
  const valueY = y;
  y += textHeight(value) + (value.lines.length ? 4 : 0);
  const textY = y;
  y += textHeight(text) + (text.lines.length ? 10 : 0);
  const kids = it.children.map((ch) => {
    const f = p.fit(ch, tw - 26, 15, 2, 400, 12);
    const row = { f, y };
    y += textHeight(f) + 10;
    return row;
  });
  return { value, valueY, text, textY, kids, h: y + 12 };
}

function columnCard(p: Paint, it: Item, i: number, x: number, y: number, w: number, headH: number, bodyH: number, compact = false) {
  const c = p.color(i);
  const head = p.spec("accent", c);
  const card = p.spec("card", c);
  const b = columnBody(p, it, w);
  const by = y + headH;
  const iconX = compact ? x + 26 : x + 38;
  const labelX = compact ? x + 46 : x + 66;
  const label = p.fit(it.label, x + w - 12 - labelX, compact ? 17 : 22, 2, p.labelWeight, 13);
  return (
    <g key={i} data-item={i}>
      {p.rect(x, y, w, headH + bodyH, 18, card)}
      {p.topRect(x, y, w, headH, 18, head)}
      {p.icon(it.icon, iconX, y + headH / 2, compact ? 22 : 30, head.icon, i)}
      <Text fit={label} x={labelX} y={y + headH / 2} valign="middle" anchor="start" color={head.on} weight={p.labelWeight} />
      <Text fit={b.value} x={x + 20} y={by + b.valueY} anchor="start" color={accentText(p, c)} weight={800} />
      <Text fit={b.text} x={x + 20} y={by + b.textY} anchor="start" color={card.onMuted} />
      {b.kids.map((k, j) => (
        <g key={j}>
          {p.icon("circle-check", x + 30, by + k.y + k.f.size * 0.62, 17, accentText(p, c))}
          <Text fit={k.f} x={x + 46} y={by + k.y} anchor="start" color={card.on} />
        </g>
      ))}
    </g>
  );
}

const compare: Renderer = (v, p, top) => {
  const n = v.items.length;
  const cols = n <= 4 ? n : Math.ceil(n / 2);
  const gap = n === 2 ? 56 : 24;
  const { rows, cellW } = grid(n, cols, gap);
  const headH = 76;
  const bodyH = max(v.items.map((it) => columnBody(p, it, cellW).h));
  const rowH = headH + bodyH + gap;
  return {
    height: top + rows * rowH + 16,
    body: (
      <g>
        {v.items.map((it, i) => columnCard(p, it, i, cellX(i, n, cols, cellW, gap), top + Math.floor(i / cols) * rowH, cellW, headH, bodyH))}
        {n === 2 && (
          <g>
            {p.circle(W / 2, top + headH / 2, 26, { ...NOLINE, fill: p.t.bg, stroke: p.lineColor, sw: 2 })}
            <Small p={p} x={W / 2} y={top + headH / 2 + 6} size={17} color={p.t.muted} anchor="middle">
              VS
            </Small>
          </g>
        )}
      </g>
    ),
  };
};

/** Центральный узел-«таблетка» с заголовком (иерархия, карта мыслей). */
function rootPill(p: Paint, title: string, cx: number, y: number, maxW: number) {
  const fit = p.fit(title, maxW - 60, 26, 2, p.style.titleWeight, 18);
  const h = Math.max(76, textHeight(fit) + 32);
  const w = Math.min(maxW, Math.max(260, 70 + max(fit.lines.map((l) => l.length * fit.size * 0.55))));
  // от руки тёмная штриховка «съедает» текст — подсвечиваем узел маркером
  const base = p.spec("accent", p.sketchy ? p.color(3) : p.style.accent === "soft" ? p.color(0) : p.t.title);
  const sp: Spec = !p.sketchy && p.style.accent === "solid" ? { ...base, on: p.t.bg } : base;
  return {
    w,
    h,
    node: (
      <g key="root" data-title="1">
        {p.rect(cx - w / 2, y, w, h, h / 2, sp)}
        <Text fit={fit} x={cx} y={y + h / 2} valign="middle" color={sp.on} weight={p.style.titleWeight} />
      </g>
    ),
  };
}

const hierarchy: Renderer = (v, p, top) => {
  const n = v.items.length;
  const cols = n <= 5 ? n : 4;
  const gap = 20;
  const { rows, cellW } = grid(n, cols, gap);
  const root = rootPill(p, v.title, W / 2, top, 600);
  const headH = 60;
  const bodyH = max(v.items.map((it) => columnBody(p, it, cellW).h));
  const busGap = 34;
  const rowTop = (r: number) => top + root.h + busGap * 2 + r * (headH + bodyH + busGap * 2);
  const lc = p.lineColor;
  const lw = p.sketchy ? 1.8 : 3;

  const lines: ReactNode[] = [p.line(W / 2, top + root.h, W / 2, rowTop(rows - 1) - busGap, lc, lw, undefined, "trunk")];
  for (let r = 0; r < rows; r++) {
    const idx = v.items.map((_, i) => i).filter((i) => Math.floor(i / cols) === r);
    const xs = idx.map((i) => cellX(i, n, cols, cellW, gap) + cellW / 2);
    const busY = rowTop(r) - busGap;
    lines.push(p.line(Math.min(W / 2, ...xs), busY, Math.max(W / 2, ...xs), busY, lc, lw, undefined, `bus${r}`));
    idx.forEach((i, j) => lines.push(p.line(xs[j], busY, xs[j], rowTop(r), lc, lw, undefined, `d${i}`)));
  }

  return {
    height: rowTop(rows - 1) + headH + bodyH + 30,
    body: (
      <g>
        {lines}
        {root.node}
        {v.items.map((it, i) => columnCard(p, it, i, cellX(i, n, cols, cellW, gap), rowTop(Math.floor(i / cols)), cellW, headH, bodyH, true))}
      </g>
    ),
  };
};

// ───────────────────────── Карточки ─────────────────────────
function cardBlock(p: Paint, it: Item, w: number) {
  const value = p.fit(it.value, w - 120, 15, 1, 800, 12);
  const label = p.fit(it.label, w - 120, 20, 2, p.labelWeight, 15);
  const text = p.fit(it.text, w - 52, 15, 3, 400, 12);
  const kids = it.children.map((ch) => p.fit("• " + ch, w - 52, 14, 1, 400, 12));
  const headH = Math.max(64, textHeight(value) + textHeight(label) + 20);
  const kidsH = kids.reduce((s, k) => s + textHeight(k) + 2, 0);
  return { value, label, text, kids, headH, h: 22 + headH + 8 + textHeight(text) + (kids.length ? 8 + kidsH : 0) + 26 };
}

function drawCard(p: Paint, it: Item, i: number, x: number, y: number, w: number, h: number, b: ReturnType<typeof cardBlock>) {
  const c = p.color(i);
  const card = p.spec("card", c);
  const chip = p.spec("chip", c);
  const headMid = y + 22 + b.headH / 2;
  let ky = y + 22 + b.headH + 8 + textHeight(b.text) + 8;
  return (
    <g key={i} data-item={i}>
      {p.rect(x, y, w, h, 18, card)}
      {p.line(x + 4, y + 20, x + 4, y + h - 20, c, 6)}
      {p.circle(x + 58, headMid, 28, chip)}
      {p.icon(it.icon, x + 58, headMid, 28, chip.icon, i)}
      <Text fit={b.value} x={x + 100} y={headMid - textHeight(b.label) / 2} valign="middle" anchor="start" color={accentText(p, c)} weight={800} />
      <Text fit={b.label} x={x + 100} y={headMid + textHeight(b.value) / 2} valign="middle" anchor="start" color={card.on} weight={p.labelWeight} />
      <Text fit={b.text} x={x + 30} y={y + 22 + b.headH + 8} anchor="start" color={card.onMuted} />
      {b.kids.map((k, j) => {
        const node = <Text key={j} fit={k} x={x + 30} y={ky} anchor="start" color={card.on} />;
        ky += textHeight(k) + 2;
        return node;
      })}
    </g>
  );
}

const cards: Renderer = (v, p, top) => {
  const n = v.items.length;
  const cols = n <= 3 ? n : n === 4 ? 2 : 3;
  const gap = 24;
  const { rows, cellW } = grid(n, cols, gap);
  const blocks = v.items.map((it) => cardBlock(p, it, cellW));
  const cardH = max(blocks.map((b) => b.h));
  const body = v.items.map((it, i) => drawCard(p, it, i, cellX(i, n, cols, cellW, gap), top + Math.floor(i / cols) * (cardH + gap), cellW, cardH, blocks[i]));
  return { height: top + rows * (cardH + gap) + 16, body };
};

// ───────────────────────── Матрица 2×2 ─────────────────────────
const matrix: Renderer = (v, p, top) => {
  const items = v.items.slice(0, 4);
  const gap = 48;
  const cellW = (INNER - gap) / 2;
  const blocks = items.map((it) => cardBlock(p, it, cellW));
  const cellH = max(blocks.map((b) => b.h));
  const midX = W / 2;
  const midY = top + cellH + gap / 2;
  const lc = p.lineColor;
  const arrow = (pts: [number, number][], key: string) => <g key={key}>{p.poly(pts, { ...NOLINE, fill: lc, stroke: p.sketchy ? lc : "none", sw: 1 })}</g>;
  return {
    height: top + cellH * 2 + gap + 40,
    body: (
      <g>
        {p.line(midX, top - 12, midX, top + cellH * 2 + gap + 12, lc, p.sketchy ? 2 : 3, undefined, "vy")}
        {p.line(PAD - 12, midY, W - PAD + 12, midY, lc, p.sketchy ? 2 : 3, undefined, "vx")}
        {arrow(
          [
            [midX - 8, top - 4],
            [midX, top - 20],
            [midX + 8, top - 4],
          ],
          "ay",
        )}
        {arrow(
          [
            [W - PAD + 8, midY - 8],
            [W - PAD + 24, midY],
            [W - PAD + 8, midY + 8],
          ],
          "ax",
        )}
        {items.map((it, i) => drawCard(p, it, i, PAD + (i % 2) * (cellW + gap), top + Math.floor(i / 2) * (cellH + gap), cellW, cellH, blocks[i]))}
      </g>
    ),
  };
};

// ───────────────────────── Карта мыслей ─────────────────────────
const mindmap: Renderer = (v, p, top) => {
  const nodeW = 300;
  const vgap = 22;
  const blocks = v.items.map((it) => {
    const label = p.fit(it.label, nodeW - 80, 18, 2, p.labelWeight, 14);
    const text = p.fit(it.text, nodeW - 32, 14, 2, 400, 12);
    const kids = it.children.map((ch) => p.fit("• " + ch, nodeW - 32, 13, 1, 400, 11));
    const headH = Math.max(52, textHeight(label) + 18);
    const bodyH = (text.lines.length ? textHeight(text) + 6 : 0) + kids.reduce((s, k) => s + textHeight(k) + 2, 0);
    return { label, text, kids, headH, h: headH + (bodyH ? bodyH + 14 : 0) };
  });
  const right = v.items.map((_, i) => i).filter((i) => i % 2 === 0);
  const left = v.items.map((_, i) => i).filter((i) => i % 2 === 1);
  const sideH = (idx: number[]) => idx.reduce((s, i) => s + blocks[i].h, 0) + vgap * Math.max(0, idx.length - 1);
  const contentH = Math.max(sideH(right), sideH(left), 160);
  const cy = top + contentH / 2;
  const probe = rootPill(p, v.title, W / 2, 0, 300);
  const root = rootPill(p, v.title, W / 2, cy - probe.h / 2, 300);

  const nodes: ReactNode[] = [];
  const links: ReactNode[] = [];
  for (const [idx, isRight] of [
    [right, true],
    [left, false],
  ] as const) {
    let y = top + (contentH - sideH(idx)) / 2;
    for (const i of idx) {
      const b = blocks[i];
      const it = v.items[i];
      const x = isRight ? W - PAD - nodeW : PAD;
      const c = p.color(i);
      const card = p.spec("card", c);
      const chip = p.spec("chip", c);
      const midY = y + b.headH / 2;
      const sx = W / 2 + (isRight ? root.w / 2 : -root.w / 2);
      const ex = isRight ? x : x + nodeW;
      const dx = ex - sx;
      links.push(p.curve(`M${sx},${cy} C${sx + dx * 0.5},${cy} ${ex - dx * 0.5},${midY} ${ex},${midY}`, c, p.sketchy ? 2.2 : 3, `l${i}`));
      let ky = y + b.headH + (b.text.lines.length ? textHeight(b.text) + 6 : 0);
      nodes.push(
        <g key={i} data-item={i}>
          {p.rect(x, y, nodeW, b.h, 16, card)}
          {p.circle(x + 30, midY, 18, chip)}
          {p.icon(it.icon, x + 30, midY, 20, chip.icon, i)}
          <Text fit={b.label} x={x + 58} y={midY} valign="middle" anchor="start" color={card.on} weight={p.labelWeight} />
          <Text fit={b.text} x={x + 16} y={y + b.headH} anchor="start" color={card.onMuted} />
          {b.kids.map((k, j) => {
            const node = <Text key={j} fit={k} x={x + 16} y={ky} anchor="start" color={card.on} />;
            ky += textHeight(k) + 2;
            return node;
          })}
        </g>,
      );
      y += b.h + vgap;
    }
  }
  return {
    height: top + contentH + 40,
    body: (
      <g>
        {links}
        {nodes}
        {root.node}
      </g>
    ),
  };
};

export const RENDERERS: Record<Layout, Renderer> = { steps, cycle, timeline, funnel, stats, compare, hierarchy, cards, pyramid, matrix, mindmap };

/** Раскладки, где заголовок встроен в саму схему. */
export const NO_HEADER: Layout[] = ["hierarchy", "mindmap"];
