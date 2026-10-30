import type { ReactNode } from "react";
import rough from "roughjs";
import type { Visual } from "@napkin/shared";
import { fitText, type Fitted } from "./text";
import { lighten, mix, shade, tint, type Theme } from "./themes";
import type { StyleDef } from "./styles";
import { Icon } from "./primitives";

/** Как закрасить фигуру и чем писать поверх неё. */
export type Spec = {
  fill: string;
  stroke: string;
  sw: number;
  /** текст поверх фигуры */
  on: string;
  /** второстепенный текст поверх фигуры */
  onMuted: string;
  /** иконка поверх фигуры */
  icon: string;
  dash?: string;
};

export type Role = "accent" | "card" | "chip" | "plain";

const gen = rough.generator();

const hash = (...xs: number[]) => {
  let h = 2166136261;
  for (const x of xs) h = Math.imul(h ^ Math.round(x * 10), 16777619);
  return Math.abs(h) % 2147483647 || 1;
};

export function roundedRectPath(x: number, y: number, w: number, h: number, r: number) {
  r = Math.max(0, Math.min(r, w / 2, h / 2));
  return `M${x + r},${y} H${x + w - r} A${r},${r} 0 0 1 ${x + w},${y + r} V${y + h - r} A${r},${r} 0 0 1 ${x + w - r},${y + h} H${x + r} A${r},${r} 0 0 1 ${x},${y + h - r} V${y + r} A${r},${r} 0 0 1 ${x + r},${y} Z`;
}

export function topRoundedPath(x: number, y: number, w: number, h: number, r: number) {
  r = Math.max(0, Math.min(r, w / 2, h));
  return `M${x},${y + h} V${y + r} A${r},${r} 0 0 1 ${x + r},${y} H${x + w - r} A${r},${r} 0 0 1 ${x + w},${y + r} V${y + h} Z`;
}

/**
 * «Кисть» для раскладок: знает стиль, тему и цвета пунктов.
 * Раскладки описывают ЧТО нарисовать (прямоугольник-акцент, карточку, линию),
 * а кисть решает КАК: заливкой, контуром, пастелью или «от руки».
 */
export class Paint {
  readonly t: Theme;
  readonly font: string;
  constructor(
    readonly style: StyleDef,
    theme: Theme,
    readonly visual: Visual,
  ) {
    this.t = style.fixedTheme ?? { ...theme, ...style.override };
    this.font = style.font;
  }

  get sketchy() {
    return !!this.style.sketch;
  }

  /** Цвет пункта: свой (если задан) или из палитры. */
  color(i: number): string {
    const own = this.visual.items[i]?.color;
    if (own && !this.style.fixedTheme) return own;
    return this.t.palette[i % this.t.palette.length];
  }

  r(base: number) {
    return base * this.style.radius;
  }

  /** Подгонка текста с учётом шрифта стиля. */
  fit(text: string, width: number, size: number, maxLines: number, weight = 400, minSize = Math.round(size * 0.75)): Fitted {
    const k = this.style.textScale;
    return fitText(text, width, Math.round(size * k), maxLines, weight, Math.round(minSize * k), this.font);
  }

  get labelWeight() {
    return this.style.labelWeight;
  }

  spec(role: Role, c: string): Spec {
    const t = this.t;
    const s = this.style;
    const ink = s.sketch?.ink;
    if (s.sketch) {
      // «от руки»: штриховка цветом, контур чернилами (или мелом)
      const line = ink ?? c;
      if (role === "accent") return { fill: s.fixedTheme ? tint(c, 0.9) : c, stroke: line, sw: s.stroke, on: t.text, onMuted: t.muted, icon: ink ?? t.text };
      if (role === "card") return { fill: s.fixedTheme ? "none" : tint(c, 0.28), stroke: line, sw: s.stroke * 0.8, on: t.text, onMuted: t.muted, icon: ink ?? c };
      if (role === "chip") return { fill: s.fixedTheme ? "none" : c, stroke: line, sw: s.stroke * 0.8, on: t.text, onMuted: t.muted, icon: ink ?? c };
      return { fill: "none", stroke: ink ?? t.line, sw: s.stroke * 0.8, on: t.text, onMuted: t.muted, icon: ink ?? c };
    }
    if (role === "accent") {
      if (s.accent === "solid") return { fill: c, stroke: "none", sw: 0, on: t.onAccent, onMuted: tint(t.onAccent, 0.8), icon: t.onAccent };
      if (s.accent === "outline") return { fill: t.card, stroke: c, sw: s.stroke + 0.7, on: shade(c, 0.25), onMuted: t.muted, icon: c };
      return { fill: lighten(c, 0.72), stroke: "none", sw: 0, on: shade(c, 0.5), onMuted: shade(c, 0.35), icon: shade(c, 0.3) };
    }
    if (role === "card") {
      if (s.card === "tint") return { fill: tint(c, 0.07), stroke: tint(c, 0.28), sw: s.stroke, on: t.text, onMuted: t.muted, icon: c };
      if (s.card === "outline") return { fill: t.card, stroke: tint(c, 0.6), sw: s.stroke, on: t.text, onMuted: t.muted, icon: c };
      if (s.card === "soft") return { fill: lighten(c, 0.88), stroke: "none", sw: 0, on: shade(c, 0.55), onMuted: shade(c, 0.3), icon: shade(c, 0.2) };
      return { fill: t.card, stroke: t.line, sw: s.stroke, on: t.text, onMuted: t.muted, icon: c };
    }
    if (role === "chip") {
      if (s.accent === "outline") return { fill: t.card, stroke: c, sw: s.stroke, on: c, onMuted: t.muted, icon: c };
      if (s.accent === "soft") return { fill: "#FFFFFF", stroke: "none", sw: 0, on: shade(c, 0.4), onMuted: t.muted, icon: shade(c, 0.15) };
      if (s.card === "plain") return { fill: c, stroke: "none", sw: 0, on: t.onAccent, onMuted: t.onAccent, icon: t.onAccent };
      return { fill: tint(c, 0.15), stroke: "none", sw: 0, on: c, onMuted: t.muted, icon: c };
    }
    return { fill: t.card, stroke: t.line, sw: s.stroke, on: t.text, onMuted: t.muted, icon: c };
  }

  // ─── Фигуры ───────────────────────────────────────────────

  private rough(drawable: ReturnType<typeof gen.path>, key?: string | number): ReactNode {
    return (
      <g key={key}>
        {gen.toPaths(drawable).map((p, i) => (
          <path key={i} d={p.d} stroke={p.stroke} strokeWidth={p.strokeWidth} fill={p.fill ?? "none"} strokeLinecap="round" strokeLinejoin="round" />
        ))}
      </g>
    );
  }

  private roughOpts(sp: Spec, seed: number) {
    const sk = this.style.sketch!;
    const hasFill = sp.fill !== "none" && sp.fill !== "transparent";
    return {
      seed,
      roughness: sk.roughness,
      bowing: sk.bowing,
      stroke: sp.stroke === "none" ? "transparent" : sp.stroke,
      strokeWidth: sp.sw || 1,
      fill: hasFill ? sp.fill : undefined,
      fillStyle: sk.fillStyle,
      hachureGap: sk.hachureGap,
      fillWeight: sk.fillWeight,
      hachureAngle: -41,
      preserveVertices: true,
    };
  }

  path(d: string, sp: Spec, key?: string | number, seedXY: number[] = [d.length]): ReactNode {
    if (this.sketchy) return this.rough(gen.path(d, this.roughOpts(sp, hash(...seedXY))), key);
    return <path key={key} d={d} fill={sp.fill} stroke={sp.stroke} strokeWidth={sp.sw} strokeDasharray={sp.dash} />;
  }

  rect(x: number, y: number, w: number, h: number, r: number, sp: Spec, key?: string | number): ReactNode {
    const rr = this.r(r);
    if (this.sketchy) return this.path(roundedRectPath(x, y, w, h, rr), sp, key, [x, y, w, h]);
    return <rect key={key} x={x} y={y} width={w} height={h} rx={rr} fill={sp.fill} stroke={sp.stroke} strokeWidth={sp.sw} strokeDasharray={sp.dash} />;
  }

  topRect(x: number, y: number, w: number, h: number, r: number, sp: Spec, key?: string | number): ReactNode {
    return this.path(topRoundedPath(x, y, w, h, this.r(r)), sp, key, [x, y, w, h, 7]);
  }

  circle(cx: number, cy: number, r: number, sp: Spec, key?: string | number): ReactNode {
    if (this.sketchy) return this.rough(gen.circle(cx, cy, r * 2, this.roughOpts(sp, hash(cx, cy, r))), key);
    return <circle key={key} cx={cx} cy={cy} r={r} fill={sp.fill} stroke={sp.stroke} strokeWidth={sp.sw} strokeDasharray={sp.dash} />;
  }

  poly(pts: [number, number][], sp: Spec, key?: string | number): ReactNode {
    if (this.sketchy) return this.rough(gen.polygon(pts, this.roughOpts(sp, hash(...pts.flat()))), key);
    return <polygon key={key} points={pts.map((p) => p.join(",")).join(" ")} fill={sp.fill} stroke={sp.stroke} strokeWidth={sp.sw} strokeLinejoin="round" />;
  }

  line(x1: number, y1: number, x2: number, y2: number, color: string, width = 2, dash?: string, key?: string | number): ReactNode {
    if (this.sketchy) {
      const sp: Spec = { fill: "none", stroke: color, sw: width * 0.8, on: "", onMuted: "", icon: "" };
      return this.rough(gen.line(x1, y1, x2, y2, this.roughOpts(sp, hash(x1, y1, x2, y2))), key);
    }
    return <line key={key} x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth={width} strokeDasharray={dash} strokeLinecap="round" />;
  }

  curve(d: string, color: string, width = 2, key?: string | number): ReactNode {
    if (this.sketchy) {
      const sp: Spec = { fill: "none", stroke: color, sw: width * 0.8, on: "", onMuted: "", icon: "" };
      return this.rough(gen.path(d, this.roughOpts(sp, hash(d.length, width))), key);
    }
    return <path key={key} d={d} fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" />;
  }

  /** Иконка пункта; data-icon нужен для клика «заменить иконку». */
  icon(name: string, cx: number, cy: number, size: number, color: string, item?: number): ReactNode {
    return (
      <g data-icon={item} filter={this.sketchy ? "url(#nf-wobble)" : undefined}>
        <Icon name={name} cx={cx} cy={cy} size={size} color={color} strokeWidth={this.style.iconStroke} />
      </g>
    );
  }

  /** Линии-связки и вторичные элементы. */
  get lineColor() {
    return this.sketchy ? (this.style.sketch!.ink ?? this.t.line) : this.t.line;
  }

  /** Маркер-подчёркивание для «Салфетки». */
  marker(x1: number, x2: number, y: number, color: string): ReactNode {
    if (!this.sketchy) return null;
    return this.curve(`M${x1},${y} Q${(x1 + x2) / 2},${y - 6} ${x2},${y + 2}`, tint(color, 0.75), 7, "marker");
  }

  /** Мягкий фон-подложка (для пастели). */
  soft(c: string) {
    return mix(c, "#FFFFFF", 0.9);
  }
}
