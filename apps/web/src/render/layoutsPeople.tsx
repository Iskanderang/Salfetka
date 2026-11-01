import type { ReactNode } from "react";
import type { Item } from "@napkin/shared";
import { Text } from "./primitives";
import { textHeight, type Fitted } from "./text";
import { tint } from "./themes";
import type { Paint } from "./paint";
import { INNER, PAD, W, Small, accentText, cardBlock, drawCard, max, type Renderer } from "./layouts";
import { halo } from "./layoutsMore";
import { valueText } from "./layoutsMetaphors";

/** Инициалы, если подпись похожа на имя человека («Анна Петрова»), иначе пусто — тогда рисуем иконку. */
function initials(label: string) {
  const words = label.trim().split(/\s+/);
  if (words.length < 2 || words.length > 3) return "";
  if (!words.every((w) => /^[A-ZА-ЯЁ][a-zа-яё]+\.?$/.test(w))) return "";
  return (words[0][0] + words[1][0]).toUpperCase();
}

/** Аватар: кружок с инициалами или иконкой пункта. */
function avatar(p: Paint, it: Item, i: number, x: number, y: number, r: number) {
  const c = p.color(i);
  const sp = p.spec("accent", c);
  const ini = initials(it.label);
  return (
    <>
      {halo(p, x, y, r + 5)}
      {p.circle(x, y, r, sp)}
      {ini ? (
        <text x={x} y={y + r * 0.3} fontSize={r * 0.8 * p.textScale} fontWeight={800} fill={sp.on} textAnchor="middle">
          {ini}
        </text>
      ) : (
        p.icon(it.icon, x, y, r * 0.95, sp.icon, i)
      )}
    </>
  );
}

/** Строки текста одна под другой; возвращает узлы и итоговую высоту. */
function lines(fits: Fitted[], x: number, y: number, color: string, anchor: "start" | "middle" = "start", gap = 3) {
  let yy = y;
  const nodes = fits.map((f, j) => {
    const at = yy;
    yy += textHeight(f) + gap;
    return <Text key={j} fit={f} x={x} y={at} anchor={anchor} color={color} />;
  });
  return { nodes, h: yy - y };
}

// ───────────────────────── Цитата ─────────────────────────
const quote: Renderer = (v, p, top) => {
  const main = v.items[0];
  const phrase = main.text || main.label;
  // модель иногда выносит автора в отдельный пункт «Автор», а у цитаты пишет «Цитата»
  const byIdx = v.items.findIndex((it, i) => i > 0 && /^(автор|источник|кто сказал)/i.test(it.label.trim()));
  const generic = /^(цитата|мысль|главная мысль|идея|фраза)$/i.test(main.label.trim());
  const author = byIdx > 0 ? v.items[byIdx].text : main.text && !generic ? main.label : "";
  const c = p.color(0);
  const sp = p.spec("card", c);
  const big = p.fit(`${phrase}`, INNER - 180, 34, 6, p.labelWeight, 22);
  const who = p.fit(author, 420, 18, 1, p.labelWeight, 14);
  const role = p.fit(byIdx > 0 ? "" : main.value, 420, 14, 1, 400, 12);
  const whoH = author ? textHeight(who) + (role.lines.length ? textHeight(role) + 4 : 0) : 0;
  const cardH = 70 + textHeight(big) + (whoH ? 34 + whoH : 0) + 50;
  const mark = 150 * p.textScale;
  const extraIdx = v.items.map((_, i) => i).filter((i) => i > 0 && i !== byIdx);
  const extra = extraIdx.map((i) => v.items[i]);
  const cols = Math.min(3, extra.length);
  const gap = 20;
  const cw = cols ? (INNER - gap * (cols - 1)) / cols : 0;
  const blocks = extra.map((it) => cardBlock(p, it, cw));
  const ch = max(blocks.map((b) => b.h));
  const rows = cols ? Math.ceil(extra.length / cols) : 0;
  const ey = top + cardH + 28;
  const textY = top + 70;
  const whoY = textY + textHeight(big) + 34;
  return {
    height: ey + rows * (ch + gap) + 16,
    body: (
      <g>
        <g data-item={0}>
          {p.rect(PAD, top, INNER, cardH, 26, sp)}
          <text x={PAD + 34} y={top + mark * 0.62} fontSize={mark} fontWeight={800} fill={tint(accentText(p, c), 0.35)} fontFamily="Georgia, serif">
            “
          </text>
          <text x={W - PAD - 34} y={top + cardH + mark * 0.12} fontSize={mark} fontWeight={800} fill={tint(accentText(p, c), 0.35)} fontFamily="Georgia, serif" textAnchor="end">
            ”
          </text>
          <Text fit={big} x={W / 2} y={textY} color={sp.on} weight={p.labelWeight} />
          {author && (
            <>
              {p.line(W / 2 - 30, whoY - 16, W / 2 + 30, whoY - 16, accentText(p, c), 3, undefined, "dash")}
              <Text fit={who} x={W / 2} y={whoY} color={accentText(p, c)} weight={p.labelWeight} />
              <Text fit={role} x={W / 2} y={whoY + textHeight(who) + 4} color={sp.onMuted} />
            </>
          )}
        </g>
        {extra.map((it, j) => {
          const inRow = Math.min(cols, extra.length - Math.floor(j / cols) * cols);
          const x = (W - (inRow * cw + (inRow - 1) * gap)) / 2 + (j % cols) * (cw + gap);
          return drawCard(p, it, extraIdx[j], x, ey + Math.floor(j / cols) * (ch + gap), cw, ch, blocks[j]);
        })}
      </g>
    ),
  };
};

// ───────────────────────── Определения ─────────────────────────
const glossary: Renderer = (v, p, top) => {
  const termW = 300;
  const defX = PAD + termW + 24;
  const defW = W - PAD - 28 - defX;
  let y = top;
  const rows = v.items.map((it, i) => {
    const c = p.color(i);
    const sp = p.spec("card", c);
    const term = p.fit(it.label, termW - 90, 22, 3, p.labelWeight, 15);
    const note = p.fit(it.value, termW - 90, 13, 2, 400, 11);
    const def = p.fit(it.text, defW, 17, 5, 400, 13);
    const ex = it.children.slice(0, 3).map((ch) => p.fit("→ " + ch, defW, 14, 2, 400, 11));
    const leftH = textHeight(term) + (note.lines.length ? textHeight(note) + 4 : 0);
    const rightH = textHeight(def) + ex.reduce((s, f) => s + textHeight(f) + 3, ex.length ? 8 : 0);
    const h = Math.max(44, leftH, rightH) + 40;
    const y0 = y;
    y += h + 16;
    const exLines = lines(ex, defX, y0 + 20 + textHeight(def) + 8, accentText(p, c));
    return (
      <g key={i} data-item={i}>
        {p.rect(PAD, y0, INNER, h, 18, sp)}
        {p.line(PAD + termW, y0 + 18, PAD + termW, y0 + h - 18, tint(c, 0.5), 2, undefined, `sep${i}`)}
        {p.circle(PAD + 42, y0 + 42, 22, p.spec("chip", c))}
        {p.icon(it.icon, PAD + 42, y0 + 42, 22, p.spec("chip", c).icon, i)}
        <Text fit={term} x={PAD + 78} y={y0 + 20} anchor="start" color={accentText(p, c)} weight={p.labelWeight} />
        <Text fit={note} x={PAD + 78} y={y0 + 24 + textHeight(term)} anchor="start" color={sp.onMuted} />
        <Text fit={def} x={defX} y={y0 + 20 + Math.max(0, (Math.max(44, leftH) - rightH) / 2)} anchor="start" color={sp.on} />
        {exLines.nodes}
      </g>
    );
  });
  return { height: y + 14, body: <g>{rows}</g> };
};

// ───────────────────────── Вопросы и ответы ─────────────────────────
const faq: Renderer = (v, p, top) => {
  const n = v.items.length;
  const cols = n >= 4 ? 2 : 1;
  const gap = 22;
  const cw = (INNER - gap * (cols - 1)) / cols;
  const blocks = v.items.map((it) => {
    const q = p.fit(it.label, cw - 92, 18, 3, p.labelWeight, 13);
    const a = p.fit(valueText(it), cw - 92, 15, 5, 400, 12);
    const kids = it.children.slice(0, 3).map((ch) => p.fit("• " + ch, cw - 92, 14, 2, 400, 11));
    const qH = Math.max(58, textHeight(q) + 30);
    const aH = Math.max(44, textHeight(a) + kids.reduce((s, f) => s + textHeight(f) + 3, kids.length ? 6 : 0) + 28);
    return { q, a, kids, qH, aH };
  });
  const rowsN = Math.ceil(n / cols);
  const rowH = (r: number) => max(blocks.filter((_, i) => Math.floor(i / cols) === r).map((b) => b.qH + b.aH));
  const rowY: number[] = [];
  let y = top;
  for (let r = 0; r < rowsN; r++) {
    rowY.push(y);
    y += rowH(r) + gap;
  }
  const cards = v.items.map((it, i) => {
    const b = blocks[i];
    const r = Math.floor(i / cols);
    const x = PAD + (i % cols) * (cw + gap);
    const y0 = rowY[r];
    const h = rowH(r);
    const c = p.color(i);
    const acc = p.spec(p.sketchy ? "card" : "accent", c);
    const card = p.spec("card", c);
    const kids = lines(b.kids, x + 70, y0 + b.qH + 14 + textHeight(b.a) + 6, card.on);
    return (
      <g key={i} data-item={i}>
        {p.rect(x, y0, cw, h, 18, card)}
        {p.topRect(x, y0, cw, b.qH, 18, acc)}
        {p.icon(it.icon, x + 34, y0 + b.qH / 2, 24, acc.icon, i)}
        <Text fit={b.q} x={x + 70} y={y0 + b.qH / 2} valign="middle" anchor="start" color={acc.on} weight={p.labelWeight} />
        <Small p={p} x={x + 34} y={y0 + b.qH + 30} size={18} color={accentText(p, c)} anchor="middle">
          →
        </Small>
        <Text fit={b.a} x={x + 70} y={y0 + b.qH + 14} anchor="start" color={card.on} />
        {kids.nodes}
      </g>
    );
  });
  return { height: y + 8, body: <g>{cards}</g> };
};

// ───────────────────────── Портрет клиента ─────────────────────────
const persona: Renderer = (v, p, top) => {
  const me = v.items[0];
  const sections = v.items.slice(1);
  const pw = sections.length ? 320 : 460;
  const px = sections.length ? PAD : (W - pw) / 2;
  const c = p.color(0);
  const sp = p.spec("card", c);
  const name = p.fit(me.label, pw - 48, 26, 2, p.titleWeight, 18);
  const role = p.fit(me.value, pw - 48, 15, 2, p.labelWeight, 12);
  const bio = p.fit(me.text, pw - 48, 15, 6, 400, 12);
  const facts = me.children.slice(0, 4).map((ch) => p.fit("• " + ch, pw - 48, 14, 2, 400, 11));
  const ownH = 40 + 120 + 22 + textHeight(name) + 6 + textHeight(role) + 12 + textHeight(bio) + facts.reduce((s, f) => s + textHeight(f) + 3, facts.length ? 10 : 0) + 30;

  const gx = PAD + pw + 22;
  const gw = W - PAD - gx;
  const cols = sections.length === 1 ? 1 : 2;
  const gap = 18;
  const cw = (gw - gap * (cols - 1)) / cols;
  const blocks = sections.map((it) => cardBlock(p, it, cw));
  const ch = max(blocks.map((b) => b.h));
  const rows = Math.ceil(sections.length / cols);
  const gridH = rows * ch + (rows - 1) * gap;
  const h = Math.max(ownH, gridH);
  const ax = px + pw / 2;
  const ay = top + 40 + 60;
  let y = ay + 60 + 22;
  const nameY = y;
  y += textHeight(name) + 6;
  const roleY = y;
  y += textHeight(role) + 12;
  const bioY = y;
  const factLines = lines(facts, px + 24, bioY + textHeight(bio) + 10, sp.on);
  return {
    height: top + h + 30,
    body: (
      <g>
        <g data-item={0}>
          {p.rect(px, top, pw, h, 24, sp)}
          {!p.sketchy && <rect x={px} y={top} width={pw} height={110} rx={p.r(24)} fill={tint(c, 0.16)} />}
          {avatar(p, me, 0, ax, ay, 60)}
          <Text fit={name} x={ax} y={nameY} color={sp.on} weight={p.titleWeight} />
          <Text fit={role} x={ax} y={roleY} color={accentText(p, c)} weight={p.labelWeight} />
          <Text fit={bio} x={px + 24} y={bioY} anchor="start" color={sp.onMuted} />
          {factLines.nodes}
        </g>
        {sections.map((it, j) => drawCard(p, it, j + 1, gx + (j % cols) * (cw + gap), top + Math.floor(j / cols) * (ch + gap), cw, ch, blocks[j]))}
      </g>
    ),
  };
};

// ───────────────────────── Оргструктура ─────────────────────────
const orgchart: Renderer = (v, p, top) => {
  const head = v.items[0];
  const team = v.items.slice(1);
  const m = team.length;
  const cols = m <= 4 ? Math.max(1, m) : Math.ceil(m / 2);
  const gap = 20;
  const cw = (INNER - gap * (cols - 1)) / cols;
  const lc = p.lineColor;
  const lw = p.sketchy ? 1.8 : 2.5;

  const person = (it: Item, w: number, big: boolean) => {
    const name = p.fit(it.label, w - 28, big ? 21 : 17, 2, p.labelWeight, 13);
    const role = p.fit(valueText(it), w - 28, 13, 3, 400, 11);
    const staff = it.children.slice(0, 5).map((ch) => p.fit(ch, w - 64, 13, 1, 400, 11));
    const r = big ? 40 : 30;
    const h = r + 14 + textHeight(name) + 4 + textHeight(role) + (staff.length ? 14 + staff.length * 28 : 0) + 20;
    return { name, role, staff, r, h };
  };
  const drawPerson = (it: Item, i: number, x: number, y: number, w: number, h: number, b: ReturnType<typeof person>): ReactNode => {
    const c = p.color(i);
    const sp = p.spec("card", c);
    let yy = y + b.r + 14;
    const nameY = yy;
    yy += textHeight(b.name) + 4;
    const roleY = yy;
    yy += textHeight(b.role) + 14;
    return (
      <g key={i} data-item={i}>
        {!p.sketchy && <rect x={x} y={y} width={w} height={h} rx={p.r(18)} fill={p.t.bg} />}
        {p.rect(x, y, w, h, 18, sp)}
        {avatar(p, it, i, x + w / 2, y, b.r)}
        <Text fit={b.name} x={x + w / 2} y={nameY} color={sp.on} weight={p.labelWeight} />
        <Text fit={b.role} x={x + w / 2} y={roleY} color={sp.onMuted} />
        {b.staff.map((f, j) => {
          const sy = yy + j * 28;
          const letter = (it.children[j].trim()[0] ?? "•").toUpperCase();
          return (
            <g key={j}>
              {p.circle(x + 26, sy + 11, 11, p.spec("chip", c))}
              <text x={x + 26} y={sy + 15} fontSize={11 * p.textScale} fontWeight={800} fill={p.spec("chip", c).on} textAnchor="middle">
                {letter}
              </text>
              <Text fit={f} x={x + 46} y={sy + 11} valign="middle" anchor="start" color={sp.on} />
            </g>
          );
        })}
      </g>
    );
  };

  const teamNames = new Set(team.map((it) => it.label.trim().toLowerCase()));
  const headOwn = { ...head, children: head.children.filter((ch) => !teamNames.has(ch.trim().toLowerCase())) };
  const hb = person(headOwn, 340, true);
  const headY = top + hb.r + 6;
  const tb = team.map((it) => person(it, cw, false));
  const rows = Math.ceil(m / cols);
  const rowH = (r: number) => max(tb.filter((_, j) => Math.floor(j / cols) === r).map((b) => b.h));
  const busGap = 34;
  const rowTop: number[] = [];
  let y = headY + hb.h + busGap * 2 + 30;
  for (let r = 0; r < rows; r++) {
    rowTop.push(y);
    y += rowH(r) + busGap * 2 + 30;
  }
  const xOf = (j: number) => {
    const r = Math.floor(j / cols);
    const inRow = Math.min(cols, m - r * cols);
    return (W - (inRow * cw + (inRow - 1) * gap)) / 2 + (j % cols) * (cw + gap);
  };
  const links: ReactNode[] = [];
  if (m) {
    links.push(p.line(W / 2, headY + hb.h, W / 2, rowTop[rows - 1] - 30 - busGap, lc, lw, undefined, "trunk"));
    for (let r = 0; r < rows; r++) {
      const idx = team.map((_, j) => j).filter((j) => Math.floor(j / cols) === r);
      const xs = idx.map((j) => xOf(j) + cw / 2);
      const busY = rowTop[r] - 30 - busGap;
      links.push(p.line(Math.min(W / 2, ...xs), busY, Math.max(W / 2, ...xs), busY, lc, lw, undefined, `bus${r}`));
      idx.forEach((j, k) => links.push(p.line(xs[k], busY, xs[k], rowTop[r] - 30, lc, lw, undefined, `d${j}`)));
    }
  }
  return {
    height: (m ? y - busGap * 2 - 30 : headY + hb.h) + 30,
    body: (
      <g>
        {links}
        {drawPerson(headOwn, 0, W / 2 - 170, headY, 340, hb.h, hb)}
        {team.map((it, j) => drawPerson(it, j + 1, xOf(j), rowTop[Math.floor(j / cols)], cw, rowH(Math.floor(j / cols)), tb[j]))}
      </g>
    ),
  };
};

export const PEOPLE: Record<"quote" | "glossary" | "faq" | "persona" | "orgchart", Renderer> = { quote, glossary, faq, persona, orgchart };
