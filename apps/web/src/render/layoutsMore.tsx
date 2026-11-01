import type { ReactNode } from "react";
import type { Item, Layout } from "@napkin/shared";
import { Text } from "./primitives";
import { textHeight, type Fitted } from "./text";
import { tint } from "./themes";
import type { Paint, Spec } from "./paint";
import { INNER, PAD, W, Small, accentText, cellX, grid, max, valueText, type Renderer } from "./layouts";

/** Заливка центрального узла: как у иерархии и карты мыслей. */
export function rootSpec(p: Paint): Spec {
  if (p.premium) return p.spec("accent", p.color(0));
  const base = p.spec("accent", p.sketchy ? p.color(3) : p.style.accent === "soft" ? p.color(0) : p.base.title);
  return !p.sketchy && p.style.accent === "solid" ? { ...base, on: p.base.bg } : base;
}

/** Подложка цвета фона вокруг кружка на линии — линия уходит «под» узел. */
export const halo = (p: Paint, x: number, y: number, r: number) => <circle cx={x} cy={y} r={r} fill={p.t.bg} />;

// ───────────────────────── Центр и лучи ─────────────────────────
const hub: Renderer = (v, p, top) => {
  const n = v.items.length;
  const cardW = 230;
  const blocks = v.items.map((it) => {
    const label = p.fit(it.label, cardW - 70, 17, 2, p.labelWeight, 13);
    const text = p.fit([it.value, it.text].filter(Boolean).join(" · "), cardW - 24, 13, 3, 400, 11);
    const headH = Math.max(50, textHeight(label) + 18);
    return { label, text, headH, h: headH + (text.lines.length ? textHeight(text) + 12 : 0) };
  });
  const cardH = max(blocks.map((b) => b.h));
  const cx = W / 2;
  const Rx = 340;
  const R0 = 92;
  const ang = (i: number) => -Math.PI / 2 + (i * 2 * Math.PI) / n;
  // вертикальный радиус подбираем, пока карточки не перестанут пересекаться
  const boxes = (ry: number) => v.items.map((_, i) => ({ x: cx + Rx * Math.cos(ang(i)) - cardW / 2, y: ry * Math.sin(ang(i)) - cardH / 2 }));
  const overlap = (bs: { x: number; y: number }[]) =>
    bs.some((a, i) => bs.some((b, j) => j > i && a.x < b.x + cardW + 12 && b.x < a.x + cardW + 12 && a.y < b.y + cardH + 12 && b.y < a.y + cardH + 12));
  let Ry = Math.max(150, R0 + cardH / 2 + 28);
  while (Ry < 460 && overlap(boxes(Ry))) Ry += 10;
  const cy = top + Ry + cardH / 2;
  const rs = rootSpec(p);
  const titleFit = p.fit(v.title, 2 * R0 - 34, 22, 4, p.titleWeight, 13);

  const spokes: ReactNode[] = [];
  const cards: ReactNode[] = [];
  v.items.forEach((it, i) => {
    const c = p.color(i);
    const bx = cx + Rx * Math.cos(ang(i));
    const by = cy + Ry * Math.sin(ang(i));
    spokes.push(p.line(cx, cy, bx, by, p.sketchy ? c : tint(c, 0.55), p.sketchy ? 2 : 3, undefined, `s${i}`));
    const b = blocks[i];
    const x = bx - cardW / 2;
    const y = by - cardH / 2;
    const card = p.spec("card", c);
    const chip = p.spec("chip", c);
    cards.push(
      <g key={i} data-item={i}>
        {/* сплошная подложка: заливка карточки полупрозрачная (или её нет, как у «Доски») — без неё сквозь текст видны лучи */}
        <rect x={x} y={y} width={cardW} height={cardH} rx={p.r(14)} fill={p.t.bg} />
        {p.rect(x, y, cardW, cardH, 14, card)}
        {p.circle(x + 28, y + b.headH / 2, 18, chip)}
        {p.icon(it.icon, x + 28, y + b.headH / 2, 20, chip.icon, i)}
        <Text fit={b.label} x={x + 54} y={y + b.headH / 2} valign="middle" anchor="start" color={card.on} weight={p.labelWeight} />
        <Text fit={b.text} x={x + 14} y={y + b.headH} anchor="start" color={card.onMuted} />
      </g>,
    );
  });

  return {
    height: cy + Ry + cardH / 2 + 30,
    body: (
      <g>
        {spokes}
        <g data-title="1">
          {p.circle(cx, cy, R0, rs)}
          <Text fit={titleFit} x={cx} y={cy} valign="middle" color={rs.on} weight={p.titleWeight} />
        </g>
        {cards}
      </g>
    ),
  };
};

// ───────────────────────── Лестница ─────────────────────────
const stairs: Renderer = (v, p, top) => {
  const n = v.items.length;
  const gap = 10;
  const colW = (INNER - gap * (n - 1)) / n;
  const stepH = n <= 4 ? 72 : n <= 6 ? 58 : 48;
  const tw = colW - 8;
  const blocks = v.items.map((it) => {
    const value = p.fit(it.value, tw, 16, 1, 800, 12);
    const label = p.fit(it.label, tw, 18, 2, p.labelWeight, 13);
    const text = p.fit(it.text, tw, 13, 3, 400, 11);
    return { value, label, text, h: textHeight(value) + textHeight(label) + 4 + textHeight(text) };
  });
  // общий «пол»: текст над самой высокой ступенью должен влезть сверху
  const base = top + max(blocks.map((b, i) => b.h + 16 + (i + 1) * stepH));

  const body = v.items.map((it, i) => {
    const c = p.color(i);
    const sp = p.spec("accent", c);
    const x = PAD + i * (colW + gap);
    const colTop = base - (i + 1) * stepH;
    const b = blocks[i];
    let ty = colTop - 14 - b.h;
    const vy = ty;
    ty += textHeight(b.value);
    const ly = ty;
    ty += textHeight(b.label) + 4;
    const iconSize = Math.min(30, stepH * 0.5);
    return (
      <g key={i} data-item={i}>
        {p.rect(x, colTop, colW, base - colTop, 10, sp)}
        <Small p={p} x={x + 10} y={colTop + 20} size={13} color={sp.onMuted}>
          {String(i + 1).padStart(2, "0")}
        </Small>
        {p.icon(it.icon, x + colW / 2, colTop + stepH / 2 + 4, iconSize, sp.icon, i)}
        <Text fit={b.value} x={x + colW / 2} y={vy} color={accentText(p, c)} weight={800} />
        <Text fit={b.label} x={x + colW / 2} y={ly} color={p.t.text} weight={p.labelWeight} />
        <Text fit={b.text} x={x + colW / 2} y={ty} color={p.t.muted} />
      </g>
    );
  });
  return {
    height: base + 34,
    body: (
      <g>
        {body}
        {p.line(PAD - 8, base, W - PAD + 8, base, p.lineColor, p.sketchy ? 2 : 3)}
      </g>
    ),
  };
};

// ───────────────────────── Дорожная карта ─────────────────────────
const roadmap: Renderer = (v, p, top) => {
  const n = v.items.length;
  const cols = n <= 4 ? n : 3;
  const rows = Math.ceil(n / cols);
  const blocksFor = (tw: number) =>
    v.items.map((it) => {
      const value = p.fit(it.value, tw, 15, 1, 800, 12);
      const label = p.fit(it.label, tw, 17, 2, p.labelWeight, 13);
      const text = p.fit(it.text, tw, 13, 3, 400, 11);
      return { value, label, text, h: textHeight(value) + textHeight(label) + 4 + textHeight(text) };
    });
  // ширину текста оцениваем по запасу без поворотов, потом уточняем
  let blocks = blocksFor(Math.min(240, INNER / cols - 30));
  const rowH = 56 + max(blocks.map((b) => b.h)) + 40;
  const turnR = rows > 1 ? rowH / 2 : 0;
  const xL = PAD + (rows > 1 ? turnR : 10);
  const xR = W - PAD - (rows > 1 ? turnR : 10);
  const slot = (xR - xL) / cols;
  blocks = blocksFor(Math.min(240, slot - 24));
  const roadY = (r: number) => top + 40 + r * rowH;

  let d = `M${xL - (rows > 1 ? 0 : 10)},${roadY(0)}`;
  for (let r = 0; r < rows; r++) {
    const toRight = r % 2 === 0;
    d += ` H${toRight ? xR : xL}`;
    if (r < rows - 1) d += ` A${turnR},${turnR} 0 0 ${toRight ? 1 : 0} ${toRight ? xR : xL},${roadY(r + 1)}`;
  }
  const lastRight = (rows - 1) % 2 === 0;
  const endX = lastRight ? xR : xL;
  const endY = roadY(rows - 1);
  const road = p.sketchy ? p.lineColor : p.t.line;

  const pins = v.items.map((it, i) => {
    const r = Math.floor(i / cols);
    const k = i % cols;
    const x = r % 2 === 0 ? xL + (k + 0.5) * slot : xR - (k + 0.5) * slot;
    const y = roadY(r);
    const c = p.color(i);
    const sp = p.spec("accent", c);
    const b = blocks[i];
    let ty = y + 38;
    const vy = ty;
    ty += textHeight(b.value);
    const ly = ty;
    ty += textHeight(b.label) + 4;
    return (
      <g key={i} data-item={i}>
        {halo(p, x, y, 30)}
        {p.circle(x, y, 25, sp)}
        {p.icon(it.icon, x, y, 24, sp.icon, i)}
        <Text fit={b.value} x={x} y={vy} color={accentText(p, c)} weight={800} />
        <Text fit={b.label} x={x} y={ly} color={p.t.text} weight={p.labelWeight} />
        <Text fit={b.text} x={x} y={ty} color={p.t.muted} />
      </g>
    );
  });

  return {
    height: roadY(rows - 1) + 38 + max(blocks.slice((rows - 1) * cols).map((b) => b.h)) + 34,
    body: (
      <g>
        {p.curve(d, road, p.sketchy ? 3 : 22, "road")}
        {!p.sketchy && <path d={d} fill="none" stroke={p.t.bg} strokeWidth={2} strokeDasharray="10 12" />}
        {p.icon("flag", endX + (lastRight ? 10 : -10), endY - 34, 30, p.color(n - 1))}
        {pins}
      </g>
    ),
  };
};

// ───────────────────────── Вертикальная хронология ─────────────────────────
const vtimeline: Renderer = (v, p, top) => {
  const lineX = W / 2;
  const cardW = 380;
  const gapX = 52;
  const blocks = v.items.map((it) => {
    const label = p.fit(it.label, cardW - 40, 18, 2, p.labelWeight, 14);
    const text = p.fit(it.text, cardW - 40, 14, 3, 400, 12);
    const value = p.fit(it.value, gapX + 150, 22, 1, 800, 15);
    return { label, text, value, h: 18 + textHeight(label) + 4 + textHeight(text) + 18 };
  });
  let y = top;
  const rows = v.items.map((it, i) => {
    const b = blocks[i];
    const rowY = y;
    y += Math.max(b.h, 64) + 22;
    const left = i % 2 === 0;
    const c = p.color(i);
    const card = p.spec("card", c);
    const dot = p.spec("accent", c);
    const cardX = left ? lineX - gapX - cardW : lineX + gapX;
    const midY = rowY + b.h / 2;
    const barX = left ? cardX + cardW - 5 : cardX + 5;
    return (
      <g key={i} data-item={i}>
        {p.line(left ? cardX + cardW : lineX, midY, left ? lineX : cardX, midY, tint(c, 0.6), 2, "4 4")}
        {p.rect(cardX, rowY, cardW, b.h, 14, card)}
        {p.line(barX, rowY + 14, barX, rowY + b.h - 14, c, 5)}
        <Text fit={b.label} x={cardX + 20} y={rowY + 18} anchor="start" color={card.on} weight={p.labelWeight} />
        <Text fit={b.text} x={cardX + 20} y={rowY + 18 + textHeight(b.label) + 4} anchor="start" color={card.onMuted} />
        {halo(p, lineX, midY, 29)}
        {p.circle(lineX, midY, 23, dot)}
        {p.icon(it.icon, lineX, midY, 22, dot.icon, i)}
        <Text fit={b.value} x={left ? lineX + 36 : lineX - 36} y={midY} valign="middle" anchor={left ? "start" : "end"} color={accentText(p, c)} weight={800} />
      </g>
    );
  });
  return {
    height: y + 20,
    body: (
      <g>
        {p.line(lineX, top - 14, lineX, y - 8, p.lineColor, p.sketchy ? 2.5 : 5)}
        {rows}
      </g>
    ),
  };
};

// ───────────────────────── Плюсы и минусы ─────────────────────────
const proscons: Renderer = (v, p, top) => {
  const good = p.style.fixedTheme ? p.t.palette[4] : "#1F9D62";
  const bad = p.style.fixedTheme ? p.t.palette[7] : "#E5484D";
  // обычно модель даёт 2 пункта с доводами в children; иначе делим пункты пополам
  const byChildren = v.items.length >= 2 && (v.items[0].children.length > 0 || v.items[1].children.length > 0);
  const half = Math.ceil(v.items.length / 2);
  type Row = { label: string; text: string; item?: number };
  const cols: { title: string; item?: number; rows: Row[]; c: string; head: string; mark: string }[] = byChildren
    ? [0, 1].map((k) => ({
        title: v.items[k].label,
        item: k,
        rows: v.items[k].children.map((ch) => ({ label: ch, text: "" })),
        c: k === 0 ? good : bad,
        head: k === 0 ? "thumbs-up" : "thumbs-down",
        mark: k === 0 ? "circle-check" : "circle-x",
      }))
    : [
        { title: "Плюсы", rows: v.items.slice(0, half).map((it, j) => ({ label: it.label, text: it.text, item: j })), c: good, head: "thumbs-up", mark: "circle-check" },
        { title: "Минусы", rows: v.items.slice(half).map((it, j) => ({ label: it.label, text: it.text, item: half + j })), c: bad, head: "thumbs-down", mark: "circle-x" },
      ];
  const gap = 40;
  const colW = (INNER - gap) / 2;
  const headH = 64;
  const tw = colW - 70;
  const fitted = cols.map((col) =>
    col.rows.map((r) => {
      const label = p.fit(r.label, tw, 16, 2, r.text ? p.labelWeight : 400, 12);
      const text = p.fit(r.text, tw, 13, 2, 400, 11);
      return { label, text, h: textHeight(label) + (text.lines.length ? textHeight(text) + 2 : 0) + 14 };
    }),
  );
  const bodyH = max(fitted.map((rows) => rows.reduce((s, r) => s + r.h, 0))) + 24;

  const body = cols.map((col, k) => {
    const x = PAD + k * (colW + gap);
    const head = p.spec("accent", col.c);
    const card = p.spec("card", col.c);
    const title = p.fit(col.title, colW - 90, 22, 1, p.labelWeight, 15);
    let ry = top + headH + 16;
    const rows = col.rows.map((r, j) => {
      const f = fitted[k][j];
      const y0 = ry;
      ry += f.h;
      return (
        <g key={j} data-item={r.item}>
          {p.icon(col.mark, x + 34, y0 + f.label.size * 0.62, 20, accentText(p, col.c))}
          <Text fit={f.label} x={x + 56} y={y0} anchor="start" color={card.on} weight={r.text ? p.labelWeight : undefined} />
          <Text fit={f.text} x={x + 56} y={y0 + textHeight(f.label) + 2} anchor="start" color={card.onMuted} />
        </g>
      );
    });
    return (
      <g key={k} data-item={byChildren ? col.item : undefined}>
        {p.rect(x, top, colW, headH + bodyH, 18, card)}
        {p.topRect(x, top, colW, headH, 18, head)}
        {p.icon(col.head, x + 38, top + headH / 2, 28, head.icon)}
        <Text fit={title} x={x + 66} y={top + headH / 2} valign="middle" anchor="start" color={head.on} weight={p.labelWeight} />
        {rows}
      </g>
    );
  });
  return { height: top + headH + bodyH + 30, body: <g>{body}</g> };
};

// ───────────────────────── Диаграмма Венна ─────────────────────────
const venn: Renderer = (v, p, top) => {
  const k = Math.min(3, Math.max(2, v.items.length));
  const r = k === 2 ? 205 : 178;
  const cx = W / 2;
  const cy = top + r + (k === 2 ? 4 : 60);
  const centers: [number, number][] =
    k === 2
      ? [
          [cx - 135, cy],
          [cx + 135, cy],
        ]
      : [
          [cx - 125, cy - 60],
          [cx + 125, cy - 60],
          [cx, cy + 150],
        ];
  const gx = centers.reduce((s, c) => s + c[0], 0) / k;
  const gy = centers.reduce((s, c) => s + c[1], 0) / k;
  const overlapItem = v.items[k];

  const circles = centers.map(([x, y], i) => {
    const c = p.color(i);
    const sp: Spec = p.sketchy ? p.spec("card", c) : { fill: tint(c, p.style.accent === "soft" ? 0.3 : 0.2), stroke: c, sw: 2.5, on: p.t.text, onMuted: p.t.muted, icon: c };
    return <g key={`c${i}`}>{p.circle(x, y, r, sp, undefined, true)}</g>;
  });

  const labels = centers.map(([x, y], i) => {
    const it = v.items[i];
    const c = p.color(i);
    // подпись выносим от центра всей фигуры к краю своего круга
    const dx = x - gx;
    const dy = y - gy;
    const len = Math.hypot(dx, dy) || 1;
    const lx = x + (dx / len) * r * 0.42;
    const ly = y + (dy / len) * r * 0.42;
    const label = p.fit(it.label, 170, 19, 2, p.labelWeight, 14);
    const text = p.fit([it.value, it.text, it.children.join(", ")].filter(Boolean).join(" · "), 170, 13, 4, 400, 11);
    const h = 34 + textHeight(label) + 4 + textHeight(text);
    const y0 = ly - h / 2;
    return (
      <g key={i} data-item={i}>
        {p.icon(it.icon, lx, y0 + 14, 26, accentText(p, c), i)}
        <Text fit={label} x={lx} y={y0 + 34} color={p.t.text} weight={p.labelWeight} />
        <Text fit={text} x={lx} y={y0 + 34 + textHeight(label) + 4} color={p.t.muted} />
      </g>
    );
  });

  let middle: ReactNode = null;
  if (overlapItem) {
    const label = p.fit(overlapItem.label, k === 2 ? 110 : 100, 15, 3, p.labelWeight, 11);
    middle = (
      <g data-item={k}>
        {p.icon(overlapItem.icon, gx, gy - textHeight(label) / 2 - 16, 22, p.t.text, k)}
        <Text fit={label} x={gx} y={gy} valign="middle" color={p.t.text} weight={p.labelWeight} />
      </g>
    );
  }
  const bottom = Math.max(...centers.map((c) => c[1])) + r;
  return {
    height: bottom + 30,
    body: (
      <g>
        {circles}
        {labels}
        {middle}
      </g>
    ),
  };
};

// ───────────────────────── Мишень ─────────────────────────
/**
 * Кольца слева, список справа — без соединительных линий: пункт и кольцо связаны цветом
 * и порядком (сверху вниз = от центра к краю). Значки стоят в своих кольцах на одной вертикали.
 */
const target: Renderer = (v, p, top) => {
  const n = v.items.length;
  const R = 230;
  const cx = PAD + R + 10;
  const lx = cx + R + 60;
  const tw = W - PAD - lx - 24;
  const blocks = v.items.map((it) => {
    const label = p.fit(it.label, tw, 18, 2, p.labelWeight, 13);
    const text = p.fit(valueText(it), tw, 13, 3, 400, 11);
    return { label, text, h: Math.max(44, textHeight(label) + (text.lines.length ? 3 + textHeight(text) : 0)) };
  });
  const gap = n > 6 ? 12 : 18;
  const total = blocks.reduce((s, b) => s + b.h, 0) + gap * (n - 1);
  const half = Math.max(R, total / 2);
  const cy = top + half + 6;
  const band = R / n;
  const badge = Math.min(18, band * 0.42);

  const rings: ReactNode[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const sp = p.spec("accent", p.color(i));
    // тонкий зазор цветом фона — кольца читаются отдельно
    rings.push(<g key={`r${i}`}>{p.circle(cx, cy, band * (i + 1), p.sketchy ? sp : { ...sp, stroke: p.t.bg, sw: 3 })}</g>);
  }

  let ly = cy - total / 2;
  const marks = v.items.map((it, i) => {
    const c = p.color(i);
    const b = blocks[i];
    const y0 = ly;
    ly += b.h + gap;
    // значок — в середине своего кольца на вертикали над центром
    const ay = cy - (i === 0 ? 0 : band * (i + 0.5));
    const textTop = y0 + (b.h - textHeight(b.label) - (b.text.lines.length ? 3 + textHeight(b.text) : 0)) / 2;
    return (
      <g key={i} data-item={i}>
        <circle cx={cx} cy={ay} r={badge} fill={p.t.bg} stroke={p.sketchy ? p.lineColor : "none"} strokeWidth={1.5} />
        {p.icon(it.icon, cx, ay, badge * 1.1, accentText(p, c), i)}
        {p.rect(lx, y0, 8, b.h, 4, p.spec("accent", c))}
        <Text fit={b.label} x={lx + 24} y={textTop} anchor="start" color={p.t.text} weight={p.labelWeight} />
        <Text fit={b.text} x={lx + 24} y={textTop + textHeight(b.label) + 3} anchor="start" color={p.t.muted} />
      </g>
    );
  });
  return {
    height: cy + half + 30,
    body: (
      <g>
        {rings}
        {marks}
      </g>
    ),
  };
};

// ───────────────────────── SWOT и PESTEL ─────────────────────────
const EMPTY: Item = { label: "", text: "", value: "", children: [], icon: "sparkles", iconOptions: [] };

function letterTiles(letters: string[], cols: number): Renderer {
  return (v, p, top) => {
    const n = letters.length;
    const gap = 20;
    const { rows, cellW } = grid(n, cols, gap);
    const items = letters.map((_, i) => v.items[i] ?? EMPTY);
    // рукописная буква крупнее обычной — шапка плитки растёт вместе с ней
    const headH = Math.max(92, 34 + 70 * p.textScale);
    const blocks = items.map((it) => {
      const label = p.fit(it.label, cellW - 70 - 70 * p.textScale - 40, 19, 3, p.labelWeight, 10);
      const text = p.fit(it.text, cellW - 40, 13, 3, 400, 11);
      const kids: Fitted[] = it.children.map((ch) => p.fit("• " + ch, cellW - 40, 13, 2, 400, 11));
      const bodyH = (text.lines.length ? textHeight(text) + 6 : 0) + kids.reduce((s, f) => s + textHeight(f) + 2, 0);
      return { label, text, kids, h: headH + bodyH + 20 };
    });
    const tileH = max(blocks.map((b) => b.h));
    const letterSize = 70 * p.textScale;
    const body = items.map((it, i) => {
      const c = p.color(i);
      const card = p.spec("card", c);
      const x = cellX(i, n, cols, cellW, gap);
      const y = top + Math.floor(i / cols) * (tileH + gap);
      const b = blocks[i];
      let ky = y + headH + (b.text.lines.length ? textHeight(b.text) + 6 : 0);
      const real = i < v.items.length;
      return (
        <g key={i} data-item={real ? i : undefined}>
          {p.rect(x, y, cellW, tileH, 18, card)}
          <text x={x + 22} y={y + 22 + letterSize * 0.78} fontSize={letterSize} fontWeight={800} fill={accentText(p, c)}>
            {letters[i]}
          </text>
          <Text fit={b.label} x={x + 30 + letterSize} y={y + 50} valign="middle" anchor="start" color={card.on} weight={p.labelWeight} />
          {real && p.icon(it.icon, x + cellW - 30, y + 30, 22, accentText(p, c), i)}
          <Text fit={b.text} x={x + 22} y={y + headH} anchor="start" color={card.onMuted} />
          {b.kids.map((f, j) => {
            const node = <Text key={j} fit={f} x={x + 22} y={ky} anchor="start" color={card.on} />;
            ky += textHeight(f) + 2;
            return node;
          })}
        </g>
      );
    });
    return { height: top + rows * (tileH + gap) + 10, body: <g>{body}</g> };
  };
}

const swot = letterTiles(["S", "W", "O", "T"], 2);
const pestel = letterTiles(["P", "E", "S", "T", "E", "L"], 3);

export const MORE: Record<"hub" | "stairs" | "roadmap" | "vtimeline" | "proscons" | "venn" | "target" | "swot" | "pestel", Renderer> = {
  hub,
  stairs,
  roadmap,
  vtimeline,
  proscons,
  venn,
  target,
  swot,
  pestel,
};
