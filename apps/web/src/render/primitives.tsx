import { icons, type LucideIcon } from "lucide-react";
import { LINE, type Fitted } from "./text";

const toPascal = (name: string) =>
  name
    .split("-")
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join("");

export const iconExists = (name: string) => !!(icons as Record<string, LucideIcon>)[toPascal(name)];

export function Icon(props: { name: string; cx: number; cy: number; size: number; color: string; strokeWidth?: number }) {
  const Cmp: LucideIcon = (icons as Record<string, LucideIcon>)[toPascal(props.name)] ?? icons.Sparkles;
  const { cx, cy, size } = props;
  return <Cmp x={cx - size / 2} y={cy - size / 2} size={size} color={props.color} strokeWidth={props.strokeWidth ?? 2} />;
}

type TextProps = {
  fit: Fitted;
  x: number;
  y: number;
  color: string;
  weight?: number;
  anchor?: "start" | "middle" | "end";
  /** y — верх блока, середина или низ */
  valign?: "top" | "middle" | "bottom";
};

/** Многострочный текст, уже подогнанный через fitText. */
/** Без weight жирность наследуется от корня SVG — это вес основного текста из настроек. */
export function Text({ fit, x, y, color, weight, anchor = "middle", valign = "top" }: TextProps) {
  if (!fit.lines.length) return null;
  const lh = fit.size * LINE;
  const total = fit.lines.length * lh;
  const top = valign === "top" ? y : valign === "middle" ? y - total / 2 : y - total;
  // базовая линия первой строки
  const first = top + (lh - fit.size) / 2 + fit.size * 0.8;
  return (
    <text x={x} y={first} fontSize={fit.size} fontWeight={weight} fill={color} textAnchor={anchor}>
      {fit.lines.map((l, i) => (
        <tspan key={i} x={x} dy={i === 0 ? 0 : lh}>
          {l}
        </tspan>
      ))}
    </text>
  );
}

/** Иконка Lucide по имени для обычного HTML (кнопки, палитры). */
export function LucideByName({ name, size = 20, color, strokeWidth = 2 }: { name: string; size?: number; color?: string; strokeWidth?: number }) {
  const Cmp: LucideIcon = (icons as Record<string, LucideIcon>)[toPascal(name)] ?? icons.Sparkles;
  return <Cmp size={size} color={color} strokeWidth={strokeWidth} />;
}

/** Иконка интерфейса: линейная Lucide, толщина 1.75 по дизайн-системе. */
export function Ico({ name, size = 16, className }: { name: string; size?: number; className?: string }) {
  const Cmp: LucideIcon = (icons as Record<string, LucideIcon>)[toPascal(name)] ?? icons.Circle;
  return <Cmp size={size} strokeWidth={1.75} className={`ui-ico ${className ?? ""}`} aria-hidden="true" />;
}
