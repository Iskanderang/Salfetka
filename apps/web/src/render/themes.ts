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
