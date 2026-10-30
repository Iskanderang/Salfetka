export type Theme = {
  id: string;
  name: string;
  bg: string;
  card: string;
  title: string;
  text: string;
  muted: string;
  line: string;
  onAccent: string;
  palette: string[];
};

export const THEMES: Theme[] = [
  {
    id: "indigo",
    name: "Индиго",
    bg: "#FFFFFF",
    card: "#FFFFFF",
    title: "#1E1B4B",
    text: "#1F2937",
    muted: "#6B7280",
    line: "#E5E7EB",
    onAccent: "#FFFFFF",
    palette: ["#6366F1", "#8B5CF6", "#EC4899", "#F59E0B", "#10B981", "#06B6D4", "#3B82F6", "#EF4444"],
  },
  {
    id: "ocean",
    name: "Океан",
    bg: "#F4F9FC",
    card: "#FFFFFF",
    title: "#0B3954",
    text: "#123047",
    muted: "#5B7083",
    line: "#D3E3EE",
    onAccent: "#FFFFFF",
    palette: ["#0B6E99", "#0F9AA8", "#2BB3A3", "#4C8FD6", "#1D5F8A", "#3AA0C8", "#5DBB8A", "#2E7DAF"],
  },
  {
    id: "sunset",
    name: "Закат",
    bg: "#FFF8F1",
    card: "#FFFFFF",
    title: "#4A1D0F",
    text: "#3B2418",
    muted: "#8A6A5A",
    line: "#F1DFD0",
    onAccent: "#FFFFFF",
    palette: ["#E8590C", "#D9480F", "#F08C00", "#C2255C", "#E64980", "#F59F00", "#A61E4D", "#FA5252"],
  },
  {
    id: "night",
    name: "Ночь",
    bg: "#0F172A",
    card: "#1E293B",
    title: "#F8FAFC",
    text: "#E2E8F0",
    muted: "#94A3B8",
    line: "#334155",
    onAccent: "#0F172A",
    palette: ["#38BDF8", "#A78BFA", "#F472B6", "#FBBF24", "#34D399", "#22D3EE", "#818CF8", "#FB7185"],
  },
  {
    id: "forest",
    name: "Лес",
    bg: "#F7FAF5",
    card: "#FFFFFF",
    title: "#1F3A2B",
    text: "#21352A",
    muted: "#5F7366",
    line: "#D6E3D8",
    onAccent: "#FFFFFF",
    palette: ["#2F855A", "#6B8E23", "#B7791F", "#38A169", "#8B5E34", "#4A7C59", "#C05621", "#2C7A7B"],
  },
  {
    id: "berry",
    name: "Ягоды",
    bg: "#FFF7FB",
    card: "#FFFFFF",
    title: "#4A1035",
    text: "#3B1630",
    muted: "#8A5E78",
    line: "#F3D9E7",
    onAccent: "#FFFFFF",
    palette: ["#BE185D", "#9333EA", "#DB2777", "#7C3AED", "#E11D48", "#A21CAF", "#F43F5E", "#6D28D9"],
  },
  {
    id: "corporate",
    name: "Корпоратив",
    bg: "#FFFFFF",
    card: "#FFFFFF",
    title: "#0F2A4A",
    text: "#1C2B3A",
    muted: "#5E6B78",
    line: "#DDE3EA",
    onAccent: "#FFFFFF",
    palette: ["#0F4C81", "#1F6FB2", "#2E8BC0", "#5C7A99", "#C8102E", "#14385C", "#7A8B9C", "#3D6E9E"],
  },
  {
    id: "terracotta",
    name: "Терракота",
    bg: "#FBF6F0",
    card: "#FFFFFF",
    title: "#4A2A1A",
    text: "#3D2B20",
    muted: "#85695A",
    line: "#EBDDD0",
    onAccent: "#FFFFFF",
    palette: ["#C2603A", "#8C6A3F", "#D08C4F", "#6F7F5A", "#A44A3F", "#B5835A", "#7D5A50", "#D9A066"],
  },
  {
    id: "neon",
    name: "Неон",
    bg: "#111027",
    card: "#1C1A3A",
    title: "#FFFFFF",
    text: "#ECEBFF",
    muted: "#A5A3C9",
    line: "#35335C",
    onAccent: "#111027",
    palette: ["#00E5FF", "#FF2E97", "#B6FF3B", "#FFB800", "#9D7CFF", "#00FFA3", "#FF5C5C", "#4DA3FF"],
  },
  {
    id: "mono",
    name: "Минимал",
    bg: "#FFFFFF",
    card: "#FFFFFF",
    title: "#111111",
    text: "#222222",
    muted: "#6B6B6B",
    line: "#E2E2E2",
    onAccent: "#FFFFFF",
    palette: ["#111111", "#3D3D3D", "#5C5C5C", "#2B2B2B", "#4A4A4A", "#1F1F1F", "#555555", "#333333"],
  },
];

export const color = (t: Theme, i: number) => t.palette[i % t.palette.length];

/** Цвет с прозрачностью: tint("#6366F1", 0.1) → "#6366F11A" */
export const tint = (hex: string, alpha: number) =>
  hex +
  Math.round(Math.max(0, Math.min(1, alpha)) * 255)
    .toString(16)
    .padStart(2, "0");

const rgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const hex = (c: number[]) => "#" + c.map((x) => Math.round(Math.max(0, Math.min(255, x))).toString(16).padStart(2, "0")).join("");

/** Смешивает два цвета: mix(a, b, 0) = a, mix(a, b, 1) = b. */
export const mix = (a: string, b: string, t: number) => {
  const A = rgb(a.slice(0, 7));
  const B = rgb(b.slice(0, 7));
  return hex(A.map((x, i) => x + (B[i] - x) * t));
};
export const shade = (c: string, t: number) => mix(c, "#000000", t);
export const lighten = (c: string, t: number) => mix(c, "#FFFFFF", t);

export const luminance = (c: string) => {
  const [r, g, b] = rgb(c.slice(0, 7)).map((v) => {
    const x = v / 255;
    return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

/** Контраст по WCAG: 1 — нечитаемо, 21 — чёрное на белом. */
export const contrast = (a: string, b: string) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

/** Подстраивает тему под свой фон: если текст темы на нём не читается — берём светлый или тёмный набор. */
export function withBackground(t: Theme, bg: string): Theme {
  const dark = luminance(bg) < 0.25;
  const next: Theme = { ...t, bg, card: t.card === t.bg ? bg : t.card };
  if (contrast(t.text, bg) >= 3.5) return next;
  return dark
    ? { ...next, title: "#F8FAFC", text: "#E5E7EB", muted: "#A3AEC0", line: mix(bg, "#FFFFFF", 0.25), card: mix(bg, "#FFFFFF", 0.06) }
    : { ...next, title: "#111827", text: "#1F2937", muted: "#6B7280", line: mix(bg, "#000000", 0.12), card: "#FFFFFF" };
}
