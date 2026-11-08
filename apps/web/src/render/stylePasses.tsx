import type { ReactNode } from "react";
import { COMIC_INK, type Paint } from "./paint";
import { Text } from "./primitives";
import { textHeight, textWidth } from "./text";

/**
 * Общие для схем и процессов приёмы особых стилей: шапки и фоновые фактуры.
 * «Комикс» — плашка и точки, «Чертёж» — размерная линия и миллиметровка,
 * «Конструктивизм» — косая полоса и круг, «Газета» — шапка с линейками и зерно бумаги.
 */

/** Шапка особого стиля; null — у стиля обычная шапка. left — прижать к левому краю (процессы), kicker — надзаголовок газеты. */
export function styledHeader(p: Paint, title: string, width: number, left?: number, kicker = ""): { head: ReactNode; bottom: number } | null {
  const header = p.style.header;
  const font = p.titleFont;
  if (header === "dimension") return dimensionHeader(p, title, width, left);
  if (header === "diagonal") return diagonalHeader(p, title, width);
  if (header === "masthead") return mastheadHeader(p, title, width, kicker);
  if (header !== "caption") return null;
  // жёлтая плашка-подпись с лёгким наклоном и тенью тушью
  const fit = p.fitTitle(title, width - 220, 34, 2, 22);
  const boxW = Math.min(width - 80, textWidth(fit, p.titleWeight, font) + 64);
  const boxH = textHeight(fit) + 30;
  const x = left ?? (width - boxW) / 2;
  const y = 34;
  return {
    bottom: y + boxH + 46,
    head: (
      <g data-title="1" transform={`rotate(-1.5 ${x + boxW / 2} ${y + boxH / 2})`}>
        <rect x={x + 6} y={y + 6} width={boxW} height={boxH} fill={COMIC_INK} />
        <rect x={x} y={y} width={boxW} height={boxH} fill="#FFD93B" stroke={COMIC_INK} strokeWidth={3} />
        <g fontFamily={font}>
          <Text fit={fit} x={x + boxW / 2} y={y + 15} color={COMIC_INK} weight={p.titleWeight} />
        </g>
      </g>
    ),
  };
}

/** Чертёж: заголовок прописными и размерная линия под ним, с засечками и стрелками. */
function dimensionHeader(p: Paint, title: string, width: number, left?: number) {
  const font = p.titleFont;
  const fit = p.fitTitle(title, width - 200, 28, 2, 18);
  const tw = textWidth(fit, p.titleWeight, font);
  const th = textHeight(fit);
  const cx = left !== undefined ? left + tw / 2 + 24 : width / 2;
  const y = 42;
  const ly = y + th + 16;
  const x1 = cx - tw / 2 - 24;
  const x2 = cx + tw / 2 + 24;
  const ink = p.t.line;
  return {
    bottom: ly + 44,
    head: (
      <g data-title="1">
        <g fontFamily={font} letterSpacing={2}>
          <Text fit={fit} x={cx} y={y} color={p.t.title} weight={p.titleWeight} />
        </g>
        <line x1={x1} y1={ly} x2={x2} y2={ly} stroke={ink} strokeWidth={1.2} />
        <line x1={x1} y1={ly - 9} x2={x1} y2={ly + 9} stroke={ink} strokeWidth={1.2} />
        <line x1={x2} y1={ly - 9} x2={x2} y2={ly + 9} stroke={ink} strokeWidth={1.2} />
        <polygon points={`${x1},${ly} ${x1 + 10},${ly - 4} ${x1 + 10},${ly + 4}`} fill={ink} />
        <polygon points={`${x2},${ly} ${x2 - 10},${ly - 4} ${x2 - 10},${ly + 4}`} fill={ink} />
      </g>
    ),
  };
}

/** Конструктивизм: заголовок на косой красной полосе, рядом чёрный круг и диагональ — мотив Лисицкого. */
function diagonalHeader(p: Paint, title: string, width: number) {
  const font = p.titleFont;
  const x0 = 40;
  const y0 = 32;
  const r = 34;
  // место под круг справа: полоса с заголовком не заходит на него, длинный заголовок переносится
  const maxBand = width - 40 - r * 2 - 50 - x0;
  const fit = p.fitTitle(title, maxBand - 70, 34, 2, 22);
  const tw = textWidth(fit, p.titleWeight, font);
  const H = textHeight(fit) + 30;
  const lean = H * 0.35;
  const x1 = x0 + Math.min(maxBand - lean, tw + 60);
  const cx = x1 + lean + 30 + r;
  return {
    bottom: y0 + H + 54,
    head: (
      <g data-title="1">
        <line x1={x0} y1={y0 + H + 22} x2={width - 40} y2={y0 + H + 22} stroke="#141414" strokeWidth={4} />
        <line x1={cx - r * 2.2} y1={y0 + H + 18} x2={width - 40} y2={y0 - 14} stroke="#141414" strokeWidth={2} />
        <circle cx={cx} cy={y0 + H / 2} r={r} fill="#141414" />
        <polygon points={`${x0},${y0 + H} ${x0 + lean},${y0} ${x1 + lean},${y0} ${x1},${y0 + H}`} fill="#D42A1D" />
        <g fontFamily={font} letterSpacing={1}>
          <Text fit={fit} x={x0 + lean + 22} y={y0 + H / 2} valign="middle" anchor="start" color="#FFFFFF" weight={p.titleWeight} />
        </g>
      </g>
    ),
  };
}

/** Газета: двойные линейки, надзаголовок разрядкой и крупный серифный заголовок по центру. */
function mastheadHeader(p: Paint, title: string, width: number, kicker: string) {
  const font = p.titleFont;
  const fit = p.fitTitle(title, width - 160, 40, 2, 26);
  const th = textHeight(fit);
  const ink = "#1C1C1C";
  const L = 40;
  const Rr = width - 40;
  const ty = 72;
  const below = ty + th + 12;
  return {
    bottom: below + 46,
    head: (
      <g data-title="1">
        <rect x={L} y={24} width={Rr - L} height={4} fill={ink} />
        <rect x={L} y={31} width={Rr - L} height={1} fill={ink} />
        {kicker && (
          <text x={width / 2} y={52} textAnchor="middle" fontSize={12} fontWeight={700} letterSpacing={4} fill={p.t.muted}>
            {kicker.toUpperCase()}
          </text>
        )}
        <rect x={L} y={60} width={Rr - L} height={1} fill={ink} />
        <g fontFamily={font}>
          <Text fit={fit} x={width / 2} y={ty} color={p.t.title} weight={p.titleWeight} />
        </g>
        <rect x={L} y={below} width={Rr - L} height={1} fill={ink} />
        <rect x={L} y={below + 4} width={Rr - L} height={3} fill={ink} />
      </g>
    ),
  };
}

/** Фоновая фактура стиля: точки комикса, миллиметровка чертежа или зерно газетной бумаги. */
export function paperPattern(kind: "dots" | "grid" | "grain", uid: string): ReactNode {
  const id = `${uid}-paper`;
  if (kind === "grid")
    return (
      <pattern id={id} width="100" height="100" patternUnits="userSpaceOnUse">
        {Array.from({ length: 10 }, (_, i) => (
          <g key={i} stroke="#FFFFFF" strokeWidth={i === 0 ? 1 : 0.6} opacity={i === 0 ? 0.2 : 0.08}>
            <line x1={i * 10} y1={0} x2={i * 10} y2={100} />
            <line x1={0} y1={i * 10} x2={100} y2={i * 10} />
          </g>
        ))}
      </pattern>
    );
  if (kind === "grain")
    return (
      <pattern id={id} width="9" height="9" patternUnits="userSpaceOnUse">
        <circle cx="2" cy="3" r="0.7" fill="#1C1C1C" opacity="0.07" />
        <circle cx="6.5" cy="7" r="0.6" fill="#1C1C1C" opacity="0.06" />
        <circle cx="7" cy="1.5" r="0.5" fill="#1C1C1C" opacity="0.05" />
      </pattern>
    );
  return (
    <pattern id={id} width="14" height="14" patternUnits="userSpaceOnUse">
      <circle cx="3.5" cy="3.5" r="1.5" fill="#E9B949" opacity="0.32" />
      <circle cx="10.5" cy="10.5" r="1.5" fill="#E9B949" opacity="0.32" />
    </pattern>
  );
}

/** Рамка листа чертежа: двойная тонкая линия по краю. */
export function blueprintFrame(width: number, height: number): ReactNode {
  return (
    <g data-bg="1" fill="none" stroke="#D6E6FF">
      <rect x={14} y={14} width={width - 28} height={height - 28} strokeWidth={1.4} opacity={0.55} />
      <rect x={20} y={20} width={width - 40} height={height - 40} strokeWidth={0.8} opacity={0.3} />
    </g>
  );
}
