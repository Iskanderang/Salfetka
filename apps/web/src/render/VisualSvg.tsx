import { forwardRef, useId, useMemo } from "react";
import { LAYOUT_LABELS, type Layout, type Visual } from "@napkin/shared";
import { CATEGORIES } from "../catalog";
import { W } from "./layouts";
import { RENDERERS, NO_HEADER } from "./renderers";
import { Paint, DEFAULT_LOOK, type Look } from "./paint";
import { Text } from "./primitives";
import { textHeight } from "./text";
import { lighten, type Theme } from "./themes";
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
  const uid = "nf" + useId().replace(/[^\w]/g, "");
  const { height, content, bg, font, bodyWeight, defs, backdrop } = useMemo(() => {
    const p = new Paint(style, theme, visual, look, uid);
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
    } else if (header === "hero") {
      // как на лендинге: маленькая надпись капсом и крупный заголовок слева
      const kickerColor = p.premium === "dark" ? lighten(p.color(0), 0.35) : p.color(0);
      const heroFit = p.fit(visual.title, W - 120, 40, 2, p.titleWeight, 26);
      head = (
        <g data-title="1">
          <text x={60} y={62} fontSize={13} fontWeight={800} letterSpacing={2.6} fill={kickerColor}>
            {(CATEGORIES.find((c) => c.layouts.includes(layout))?.name ?? LAYOUT_LABELS[layout]).toUpperCase()}
          </text>
          <g letterSpacing={-0.6}>
            <Text fit={heroFit} x={60} y={76} anchor="start" color={t.title} weight={p.titleWeight} />
          </g>
        </g>
      );
      top = 76 + textHeight(heroFit) + 48;
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
    const height = r.height + (p.premium ? 20 : 0);
    // фон премиум-стиля: мягкое свечение цветов палитры (свой фон пользователя — без украшений)
    let backdrop = null;
    if (p.premium && !look.bg) {
      backdrop =
        p.premium === "dark" ? (
          <>
            <rect data-bg="1" width={W} height={height} fill={p.gradient("night", [[0, "#081225"], [1, "#0F2747"]], "down")} />
            <ellipse data-bg="1" cx={W * 0.22} cy={0} rx={W * 0.55} ry={360} fill={`url(#${uid}-glow0)`} />
            <ellipse data-bg="1" cx={W * 0.95} cy={height} rx={W * 0.5} ry={320} fill={`url(#${uid}-glow1)`} />
          </>
        ) : (
          <>
            <ellipse data-bg="1" cx={W * 0.08} cy={0} rx={W * 0.6} ry={380} fill={`url(#${uid}-glow0)`} />
            <ellipse data-bg="1" cx={W * 0.98} cy={height} rx={W * 0.55} ry={340} fill={`url(#${uid}-glow1)`} />
          </>
        );
    }
    return {
      height,
      backdrop,
      defs: (
        <>
          {p.defsNodes()}
          {p.premium && (
            <>
              <radialGradient id={`${uid}-glow0`}>
                <stop offset="0" stopColor={p.color(0)} stopOpacity={p.premium === "dark" ? 0.26 : 0.16} />
                <stop offset="1" stopColor={p.color(0)} stopOpacity={0} />
              </radialGradient>
              <radialGradient id={`${uid}-glow1`}>
                <stop offset="0" stopColor={p.color(1)} stopOpacity={p.premium === "dark" ? 0.13 : 0.11} />
                <stop offset="1" stopColor={p.color(1)} stopOpacity={0} />
              </radialGradient>
            </>
          )}
        </>
      ),
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
  }, [visual, layout, theme, style, look, uid]);

  return (
    <svg ref={ref} xmlns="http://www.w3.org/2000/svg" viewBox={`0 0 ${W} ${height}`} width={W} height={height} className={className} fontFamily={font} fontWeight={bodyWeight}>
      <defs>
        <filter id="nf-wobble" x="-10%" y="-10%" width="120%" height="120%">
          <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="7" />
          <feDisplacementMap in="SourceGraphic" scale="2.2" />
        </filter>
        {defs}
      </defs>
      {!transparent && <rect data-bg="1" width={W} height={height} fill={bg} />}
      {!transparent && backdrop}
      {content}
    </svg>
  );
});
