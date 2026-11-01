import type { ReactNode } from "react";
import rough from "roughjs";
import type { Drawable } from "roughjs/bin/core";
import type { Visual } from "@napkin/shared";
import { fitText, type Fitted } from "./text";
import { contrast, lighten, luminance, mix, shade, tint, withBackground, type Theme } from "./themes";
import type { StyleDef } from "./styles";
import { fontById } from "./fonts";
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
  /** Фильтр SVG (мягкая тень премиум-стиля) */
  filter?: string;
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
/** Пользовательские настройки текста и штриховки — поверх стиля. */
export type Look = {
  /** id шрифта из FONTS или undefined — «как в стиле» */
  font?: string;
  /** множитель размера текста, 0.8–1.4 */
  size: number;
  /** -1 тоньше, 0 как в стиле, 1 жирнее */
  weight: -1 | 0 | 1;
  /** свой цвет текста (#RRGGBB) или undefined — из темы */
  color?: string;
  /** интенсивность штриховки «Салфетки» и «Доски», 0.15–1 */
  intensity: number;
  /** свой фон схемы (#RRGGBB) или undefined — фон стиля/палитры */
  bg?: string;
};

export const DEFAULT_LOOK: Look = { size: 1, weight: 0, intensity: 1 };

export class Paint {
  /** Цвета с учётом пользовательского цвета текста */
  readonly t: Theme;
  /** Цвета стиля без пользовательских правок (фон шапки, корневой узел) */
  readonly base: Theme;
  readonly font: string;
  readonly textColorApplied: boolean;
  private readonly scale: number;
  /** Градиенты и фильтры, которые понадобились при рисовании, — VisualSvg кладёт их в <defs> */
  private readonly defs = new Map<string, ReactNode>();
  constructor(
    readonly style: StyleDef,
    theme: Theme,
    readonly visual: Visual,
    readonly look: Look = DEFAULT_LOOK,
    /** Префикс id: на странице несколько схем (миниатюры), их градиенты не должны пересекаться */
    readonly uid = "nf",
  ) {
    const styled = style.fixedTheme ?? { ...theme, ...style.override };
    this.base = look.bg ? withBackground(styled, look.bg) : styled;
    // свой цвет текста применяем, только если он читается на фоне стиля (например, тёмный на «Доске» — нет)
    this.textColorApplied = !!look.color && contrast(look.color, this.base.bg) >= 2.5;
    this.t = this.textColorApplied ? { ...this.base, title: look.color!, text: look.color!, muted: mix(look.color!, this.base.bg, 0.3) } : this.base;
    const f = fontById(look.font);
    this.font = f ? f.stack : style.font;
    this.scale = (f ? f.scale : style.textScale) * look.size;
  }

  get sketchy() {
    return !!this.style.sketch;
  }

  /** Чернила «Салфетки»; на тёмном фоне становятся светлыми. У «Доски» чернил нет — линии цветным мелом. */
  get ink(): string | undefined {
    const ink = this.style.sketch?.ink;
    if (!ink) return undefined;
    return contrast(ink, this.t.bg) < 3 ? "#EEEEEE" : ink;
  }

  /** Цвет пункта: свой (если задан) или из палитры. */
  color(i: number): string {
    const own = this.visual.items[i]?.color;
    const c = own && !this.style.fixedTheme ? own : this.t.palette[i % this.t.palette.length];
    // на ночном фоне слишком тёмные цвета палитры (Минимал, Корпоратив) теряются — высветляем
    return this.premium === "dark" && luminance(c) < 0.12 ? lighten(c, 0.45) : c;
  }

  get premium() {
    return this.style.premium;
  }

  // ─── Градиенты и тени (премиум) ───────────────────────────

  /** Линейный градиент по ключу; stops — [смещение, цвет с необязательной прозрачностью #RRGGBBAA]. */
  gradient(key: string, stops: [number, string][], dir: "diag" | "down" | "right" = "diag"): string {
    const id = `${this.uid}-${key.replace(/[^\w-]/g, "")}`;
    if (!this.defs.has(id)) {
      const [x2, y2] = dir === "diag" ? [1, 1] : dir === "down" ? [0, 1] : [1, 0];
      this.defs.set(
        id,
        <linearGradient key={id} id={id} x1="0" y1="0" x2={x2} y2={y2}>
          {stops.map(([o, c], i) => (
            <stop key={i} offset={o} stopColor={c.slice(0, 7)} stopOpacity={c.length > 7 ? parseInt(c.slice(7, 9), 16) / 255 : 1} />
          ))}
        </linearGradient>,
      );
    }
    return `url(#${id})`;
  }

  /** Насыщенный градиент цвета: светлее слева сверху, глубже справа снизу. */
  private grad(c: string) {
    return this.gradient(`a${c}`, [
      [0, lighten(c, 0.2)],
      [1, shade(c, 0.08)],
    ]);
  }

  /** Мягкая тень карточек: короткая и светлая, без «тяжести». */
  get lift(): string | undefined {
    if (this.premium !== "light") return undefined;
    const id = `${this.uid}-lift`;
    if (!this.defs.has(id))
      this.defs.set(
        id,
        <filter key={id} id={id} x="-20%" y="-20%" width="140%" height="160%">
          <feDropShadow dx="0" dy="10" stdDeviation="12" floodColor="#1E3A8A" floodOpacity="0.09" />
        </filter>,
      );
    return `url(#${id})`;
  }

  defsNodes(): ReactNode[] {
    return [...this.defs.values()];
  }

  r(base: number) {
    return base * this.style.radius;
  }

  /** Подгонка текста с учётом шрифта, размера и жирности. Вес 400 = основной текст. */
  fit(text: string, width: number, size: number, maxLines: number, weight = 400, minSize = Math.round(size * 0.75)): Fitted {
    const k = this.scale;
    const w = weight === 400 ? this.bodyWeight : weight;
    return fitText(text, width, Math.round(size * k), maxLines, w, Math.round(minSize * k), this.font);
  }

  get textScale() {
    return this.scale;
  }

  get bodyWeight() {
    return this.look.weight > 0 ? 600 : 400;
  }

  get labelWeight() {
    return this.look.weight > 0 ? 800 : this.look.weight < 0 ? 400 : this.style.labelWeight;
  }

  get titleWeight() {
    return this.look.weight > 0 ? 800 : this.look.weight < 0 ? 500 : this.style.titleWeight;
  }

  spec(role: Role, c: string): Spec {
    const sp = this.rawSpec(role, c);
    // свой цвет текста — для текста на карточках и фоне; на ярких заливках оставляем контрастный
    if (this.textColorApplied && (role === "card" || role === "plain")) return { ...sp, on: this.t.text, onMuted: this.t.muted };
    return sp;
  }

  private premiumSpec(role: Role, c: string): Spec {
    const t = this.t;
    const dark = this.premium === "dark";
    if (role === "accent")
      return { fill: this.grad(c), stroke: dark ? tint("#FFFFFF", 0.14) : "none", sw: dark ? 1 : 0, on: "#FFFFFF", onMuted: "#FFFFFFD9", icon: "#FFFFFF" };
    if (role === "chip")
      return dark
        ? { fill: tint(c, 0.22), stroke: tint(c, 0.45), sw: 1, on: lighten(c, 0.55), onMuted: t.muted, icon: lighten(c, 0.35) }
        : {
            fill: this.gradient(`c${c}`, [
              [0, lighten(c, 0.9)],
              [1, lighten(c, 0.78)],
            ]),
            stroke: "none",
            sw: 0,
            on: shade(c, 0.35),
            onMuted: t.muted,
            icon: shade(c, 0.12),
          };
    // карточка: белая с тенью на светлом фоне, «стекло» на ночном
    const card: Spec = dark
      ? { fill: tint("#FFFFFF", 0.06), stroke: tint("#FFFFFF", 0.14), sw: 1, on: t.text, onMuted: t.muted, icon: lighten(c, 0.25) }
      : { fill: "#FFFFFF", stroke: "#E3E9F2", sw: 1, on: t.text, onMuted: t.muted, icon: c };
    return role === "card" ? { ...card, filter: this.lift } : card;
  }

  private rawSpec(role: Role, c: string): Spec {
    const t = this.t;
    const s = this.style;
    const ink = this.ink;
    if (s.premium) return this.premiumSpec(role, c);
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

  /** Штриховка и цветной мел приглушаются ползунком «интенсивность»; чернильный контур — нет. */
  private rough(drawable: Drawable, key?: string | number, underlay?: ReactNode): ReactNode {
    const o = drawable.options;
    const k = this.look.intensity;
    const coloredLine = !this.style.sketch?.ink;
    return (
      <g key={key}>
        {underlay}
        {drawable.sets.map((set, i) => {
          const d = gen.opsToPath(set);
          if (set.type === "fillSketch")
            return <path key={i} d={d} stroke={o.fill} strokeWidth={o.fillWeight < 0 ? o.strokeWidth / 2 : o.fillWeight} fill="none" opacity={k} strokeLinecap="round" />;
          if (set.type === "fillPath") return <path key={i} d={d} fill={o.fill} stroke="none" opacity={k} />;
          return (
            <path key={i} d={d} stroke={o.stroke} strokeWidth={o.strokeWidth} fill="none" opacity={coloredLine ? 0.45 + 0.55 * k : 1} strokeLinecap="round" strokeLinejoin="round" />
          );
        })}
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

  /** Штриховка прозрачна: без сплошной подложки сквозь фигуру видны линии и кольца позади неё. */
  private solid(sp: Spec) {
    return sp.fill !== "none" && sp.fill !== "transparent";
  }

  path(d: string, sp: Spec, key?: string | number, seedXY: number[] = [d.length]): ReactNode {
    if (this.sketchy) return this.rough(gen.path(d, this.roughOpts(sp, hash(...seedXY))), key, this.solid(sp) ? <path d={d} fill={this.t.bg} /> : null);
    return <path key={key} d={d} fill={sp.fill} stroke={sp.stroke} strokeWidth={sp.sw} strokeDasharray={sp.dash} filter={sp.filter} />;
  }

  rect(x: number, y: number, w: number, h: number, r: number, sp: Spec, key?: string | number): ReactNode {
    const rr = this.r(r);
    if (this.sketchy) return this.path(roundedRectPath(x, y, w, h, rr), sp, key, [x, y, w, h]);
    return <rect key={key} x={x} y={y} width={w} height={h} rx={rr} fill={sp.fill} stroke={sp.stroke} strokeWidth={sp.sw} strokeDasharray={sp.dash} filter={sp.filter} />;
  }

  topRect(x: number, y: number, w: number, h: number, r: number, sp: Spec, key?: string | number): ReactNode {
    return this.path(topRoundedPath(x, y, w, h, this.r(r)), sp, key, [x, y, w, h, 7]);
  }

  /** see-through: без сплошной подложки — для фигур, которые должны просвечивать (диаграмма Венна). */
  circle(cx: number, cy: number, r: number, sp: Spec, key?: string | number, seeThrough = false): ReactNode {
    if (this.sketchy)
      return this.rough(gen.circle(cx, cy, r * 2, this.roughOpts(sp, hash(cx, cy, r))), key, this.solid(sp) && !seeThrough ? <circle cx={cx} cy={cy} r={r} fill={this.t.bg} /> : null);
    return <circle key={key} cx={cx} cy={cy} r={r} fill={sp.fill} stroke={sp.stroke} strokeWidth={sp.sw} strokeDasharray={sp.dash} filter={sp.filter} />;
  }

  poly(pts: [number, number][], sp: Spec, key?: string | number): ReactNode {
    if (this.sketchy)
      return this.rough(
        gen.polygon(pts, this.roughOpts(sp, hash(...pts.flat()))),
        key,
        this.solid(sp) ? <polygon points={pts.map((q) => q.join(",")).join(" ")} fill={this.t.bg} /> : null,
      );
    return <polygon key={key} points={pts.map((p) => p.join(",")).join(" ")} fill={sp.fill} stroke={sp.stroke} strokeWidth={sp.sw} strokeLinejoin="round" filter={sp.filter} />;
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
    // от руки иконка пункта стоит на «окошке» без штриховки — иначе штрихи её перечёркивают
    const plate = this.sketchy && item !== undefined;
    return (
      <g data-icon={item}>
        {plate && <circle cx={cx} cy={cy} r={size * 0.72} fill={this.t.bg} />}
        <g filter={this.sketchy ? "url(#nf-wobble)" : undefined}>
          <Icon name={name} cx={cx} cy={cy} size={size} color={color} strokeWidth={this.style.iconStroke} />
        </g>
      </g>
    );
  }

  /** Линии-связки и вторичные элементы. */
  get lineColor() {
    return this.sketchy ? (this.ink ?? this.t.line) : this.t.line;
  }

  /** Маркер-подчёркивание для «Салфетки». */
  marker(x1: number, x2: number, y: number, color: string): ReactNode {
    if (!this.sketchy) return null;
    return this.curve(`M${x1},${y} Q${(x1 + x2) / 2},${y - 6} ${x2},${y + 2}`, tint(color, 0.75 * this.look.intensity), 7, "marker");
  }

  /** Мягкий фон-подложка (для пастели). */
  soft(c: string) {
    return mix(c, "#FFFFFF", 0.9);
  }
}
