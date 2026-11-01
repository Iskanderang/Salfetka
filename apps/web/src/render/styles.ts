import { FONT } from "./text";
import type { Theme } from "./themes";

export const HAND_FONT = '"Caveat", "Segoe Print", cursive';
export const BIZ_FONT = 'Bahnschrift, "Segoe UI", Arial, sans-serif';

/**
 * Стиль отвечает за форму: шрифт, обводки, заливки, скругления, «от руки».
 * Тема отвечает за палитру. Любой стиль сочетается с любой темой,
 * кроме стилей с собственной палитрой (fixedTheme), например «Доска».
 */
export type StyleDef = {
  id: string;
  name: string;
  hint: string;
  font: string;
  /** Множитель размера текста: рукописный шрифт мельче при том же кегле */
  textScale: number;
  titleWeight: number;
  labelWeight: number;
  /** Как рисовать акцентные фигуры (шаги, узлы, шапки) */
  accent: "solid" | "outline" | "soft";
  /** Как рисовать карточки */
  card: "tint" | "outline" | "soft" | "plain";
  radius: number;
  stroke: number;
  iconStroke: number;
  /** Шапка с заголовком */
  header: "center" | "underline" | "band";
  /** Нарисовано от руки (rough.js) */
  sketch?: { roughness: number; bowing: number; fillStyle: string; hachureGap: number; fillWeight: number; ink?: string };
  /** Переопределение цветов темы (фон бумаги, чернила) */
  override?: Partial<Theme>;
  /** Собственная палитра — темы для этого стиля не применяются */
  fixedTheme?: Theme;
};

const CHALK: Theme = {
  id: "chalk",
  name: "Мел",
  bg: "#24372D",
  card: "#24372D",
  title: "#F4F6F0",
  text: "#EEF2EA",
  muted: "#B9C8BD",
  line: "#9FB3A5",
  onAccent: "#F4F6F0",
  palette: ["#F4F6F0", "#FDE68A", "#F9A8D4", "#93C5FD", "#86EFAC", "#FDBA74", "#C4B5FD", "#FCA5A5"],
};

export const STYLES: StyleDef[] = [
  {
    id: "flat",
    name: "Плоский",
    hint: "Яркие заливки",
    font: FONT,
    textScale: 1,
    titleWeight: 700,
    labelWeight: 700,
    accent: "solid",
    card: "tint",
    radius: 1,
    stroke: 1.5,
    iconStroke: 2,
    header: "center",
  },
  {
    id: "napkin",
    name: "Набросок",
    hint: "От руки, маркер",
    font: HAND_FONT,
    textScale: 1.3,
    titleWeight: 700,
    labelWeight: 700,
    accent: "solid",
    card: "outline",
    radius: 1,
    stroke: 1.6,
    iconStroke: 2,
    header: "underline",
    sketch: { roughness: 1.4, bowing: 1.2, fillStyle: "hachure", hachureGap: 7.5, fillWeight: 1.5, ink: "#2B2B2B" },
    override: { bg: "#FFFDF7", card: "#FFFDF7", title: "#222222", text: "#2B2B2B", muted: "#5A5A5A", line: "#2B2B2B", onAccent: "#2B2B2B" },
  },
  {
    id: "outline",
    name: "Контур",
    hint: "Тонкие линии",
    font: FONT,
    textScale: 1,
    titleWeight: 600,
    labelWeight: 600,
    accent: "outline",
    card: "outline",
    radius: 1,
    stroke: 1.8,
    iconStroke: 1.6,
    header: "center",
  },
  {
    id: "pastel",
    name: "Пастель",
    hint: "Мягко, для соцсетей",
    font: FONT,
    textScale: 1,
    titleWeight: 700,
    labelWeight: 600,
    accent: "soft",
    card: "soft",
    radius: 1.7,
    stroke: 0,
    iconStroke: 2,
    header: "center",
  },
  {
    id: "business",
    name: "Бизнес",
    hint: "Строго, под слайды",
    font: BIZ_FONT,
    textScale: 1,
    titleWeight: 700,
    labelWeight: 700,
    accent: "solid",
    card: "plain",
    radius: 0.2,
    stroke: 1,
    iconStroke: 2.2,
    header: "band",
  },
  {
    id: "chalk",
    name: "Доска",
    hint: "Мел, для обучения",
    font: HAND_FONT,
    textScale: 1.3,
    titleWeight: 700,
    labelWeight: 700,
    accent: "outline",
    card: "outline",
    radius: 1,
    stroke: 1.6,
    iconStroke: 1.8,
    header: "underline",
    sketch: { roughness: 1.6, bowing: 1.5, fillStyle: "hachure", hachureGap: 9, fillWeight: 1 },
    fixedTheme: CHALK,
  },
];

export const styleById = (id: string) => STYLES.find((s) => s.id === id) ?? STYLES[0];
