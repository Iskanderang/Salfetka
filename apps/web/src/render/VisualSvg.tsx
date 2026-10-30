import { forwardRef, useMemo } from "react";
import type { Layout, Visual } from "@napkin/shared";
import { RENDERERS, NO_HEADER, W } from "./layouts";
import { Paint, DEFAULT_LOOK, type Look } from "./paint";
import { Text } from "./primitives";
import { textHeight } from "./text";
import type { Theme } from "./themes";
import type { StyleDef } from "./styles";

type Props = {
  visual: Visual;
  layout: Layout;
  theme: Theme;
  style: StyleDef;
  /** Шрифт, размер, жирность, цвет текста, интенсивность штриховки */
  look?: Look;
  /** Прозрачный фон (для экспорта PNG без подложки) */
  transparent?: boolean;
  className?: string;
};

export const VisualSvg = forwardRef<SVGSVGElement, Props>(({ visual, layout, theme, style, look = DEFAULT_LOOK, transparent, className }, ref) => {
  const { height, content, bg, font, bodyWeight } = useMemo(() => {
    const p = new Paint(style, theme, visual, look);
    const t = p.t;
    const header = NO_HEADER.includes(layout) ? "none" : style.header;
    const titleFit = p.fit(visual.title, header === "band" ? W - 80 : W - 120, 34, 2, p.titleWeight, 24);
    const th = textHeight(titleFit);
    let top = 44;
    let head = null;
    if (header === "center" || header === "underline") {
      const lineW = Math.min(W - 120, Math.max(...titleFit.lines.map((l) => l.length * titleFit.size * 0.5), 120));
      head = (
        <g data-title="1">
          {header === "underline" && p.marker(W / 2 - lineW / 2, W / 2 + lineW / 2, 44 + th + 4, p.color(3))}
          <Text fit={titleFit} x={W / 2} y={44} color={t.title} weight={p.titleWeight} />
        </g>
      );
      top = 44 + th + (header === "underline" ? 52 : 40);
    } else if (header === "band") {
      const bandH = th + 48;
      head = (
        <g data-title="1">
          <rect x={0} y={0} width={W} height={bandH} fill={p.base.title} />
          <rect x={40} y={bandH - 6} width={64} height={6} fill={p.color(0)} />
          <Text fit={titleFit} x={40} y={bandH / 2} valign="middle" anchor="start" color={p.base.bg} weight={p.titleWeight} />
        </g>
      );
      top = bandH + 40;
    }
    const r = RENDERERS[layout](visual, p, top);
    return {
      height: r.height,
      bg: t.bg,
      font: p.font,
      bodyWeight: p.bodyWeight,
      content: (
        <>
          {head}
          {r.body}
        </>
      ),
    };
  }, [visual, layout, theme, style, look]);

  return (
    <svg ref={ref} xmlns="http://www.w3.org/2000/svg" viewBox={`0 0 ${W} ${height}`} width={W} height={height} className={className} fontFamily={font} fontWeight={bodyWeight}>
      <defs>
        <filter id="nf-wobble" x="-10%" y="-10%" width="120%" height="120%">
          <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="7" />
          <feDisplacementMap in="SourceGraphic" scale="2.2" />
        </filter>
      </defs>
      {!transparent && <rect data-bg="1" width={W} height={height} fill={bg} />}
      {content}
    </svg>
  );
});
