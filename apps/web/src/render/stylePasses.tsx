import type { ReactNode } from "react";
import { COMIC_INK, type Paint } from "./paint";
import { Text } from "./primitives";
import { textHeight, textWidth } from "./text";

/**
 * Общие для схем и процессов приёмы стиля «Комикс»: шапка-плашка и фон в точках.
 */

/** Шапка «Комикса»; null — у стиля обычная шапка. left — прижать к левому краю (процессы). */
export function styledHeader(p: Paint, title: string, width: number, left?: number): { head: ReactNode; bottom: number } | null {
  const header = p.style.header;
  if (header !== "caption") return null;
  const font = p.titleFont;
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

/** Фон «Комикса»: печатные растровые точки по бумаге. */
export function comicPaper(uid: string): ReactNode {
  return (
    <pattern id={`${uid}-paper`} width="14" height="14" patternUnits="userSpaceOnUse">
      <circle cx="3.5" cy="3.5" r="1.5" fill="#E9B949" opacity="0.32" />
      <circle cx="10.5" cy="10.5" r="1.5" fill="#E9B949" opacity="0.32" />
    </pattern>
  );
}
