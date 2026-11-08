import { FONT } from "./text";
import type { Theme } from "./themes";

export const HAND_FONT = '"Caveat", "Segoe Print", cursive';
export const PREMIUM_FONT = '"Manrope", "Segoe UI", Arial, sans-serif';
export const BIZ_FONT = 'Bahnschrift, "Segoe UI", Arial, sans-serif';
export const COMIC_FONT = '"Balsamiq Sans", "Comic Sans MS", cursive';
export const COMIC_TITLE = '"Unbounded", "Arial Black", sans-serif';
export const MONO_FONT = '"JetBrains Mono", Consolas, monospace';
export const POSTER_FONT = '"Oswald", "Arial Narrow", sans-serif';
export const POSTER_TITLE = '"Russo One", "Arial Black", sans-serif';
export const NEWS_FONT = '"PT Serif", Georgia, serif';
export const NEWS_TITLE = '"Playfair Display", Georgia, serif';

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
  /** Шапка с заголовком; caption — плашка комикса, dimension — размерная линия чертежа,
   *  diagonal — косая полоса плаката, masthead — газетная шапка с линейками */
  header: "center" | "underline" | "band" | "hero" | "caption" | "dimension" | "diagonal" | "masthead";
  /** Заголовок прописными (чертёж, плакат) */
  titleUpper?: boolean;
  /** Особая «кисть» стиля */
  special?: "blueprint" | "constructivism" | "newspaper";
  /** Фон-фактура: точки комикса, миллиметровка чертежа, зерно газетной бумаги */
  paper?: "dots" | "grid" | "grain";
  /** Шрифт заголовка, если он отличается от основного */
  titleFont?: string;
  /** Множитель кегля заголовка (широкие экранные шрифты) */
  titleScale?: number;
  /** Комикс: контур тушью, жёсткая тень, растровые точки */
  comic?: boolean;
  /** «Как лендинг»: градиенты, мягкие тени, крупная типографика; светлый или ночной фон */
  premium?: "light" | "dark";
  /** Нарисовано от руки (rough.js) */
  sketch?: { roughness: number; bowing: number; fillStyle: string; hachureGap: number; fillWeight: number; ink?: string };
  /** Переопределение цветов темы (фон бумаги, чернила) */
  override?: Partial<Theme>;
  /** Собственная палитра — темы для этого стиля не применяются */
  fixedTheme?: Theme;
};

const BLUEPRINT: Theme = {
  id: "blueprint",
  name: "Синька",
  bg: "#1D4E8F",
  card: "#225A9F",
  title: "#FFFFFF",
  text: "#EAF2FF",
  muted: "#AFC8EC",
  line: "#D6E6FF",
  onAccent: "#FFFFFF",
  // разметка на синьке: белый, голубой, жёлтый карандаш, мятный, персик, сирень
  palette: ["#FFFFFF", "#7FD3FF", "#FFE07A", "#9EF0C9", "#FFB894", "#CDB9FF", "#FF9FBF", "#B6F3FF"],
};

const POSTER: Theme = {
  id: "constructivism",
  name: "Плакат",
  bg: "#EFE5CF",
  card: "#F8F1E1",
  title: "#141414",
  text: "#1A1A1A",
  muted: "#5B5147",
  line: "#141414",
  onAccent: "#FFFFFF",
  // красный, чёрный, охра и их оттенки — как у Родченко и Лисицкого
  palette: ["#D42A1D", "#161616", "#C7892C", "#8E1B13", "#5E5A53", "#E2603D", "#3A3733", "#A88B5A"],
};

const NEWSPRINT: Theme = {
  id: "newspaper",
  name: "Газета",
  bg: "#F3EFE6",
  card: "#FAF8F2",
  title: "#111111",
  text: "#1C1C1C",
  muted: "#5A5752",
  line: "#1C1C1C",
  onAccent: "#FFFFFF",
  // только чёрный и серые: пункты различаются тоном
  palette: ["#1C1C1C", "#5A5A5A", "#8C8C8C", "#333333", "#707070", "#454545", "#A0A0A0", "#262626"],
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
  {
    id: "premium",
    name: "Премиум",
    hint: "Как лендинг, светлый",
    font: PREMIUM_FONT,
    textScale: 1,
    titleWeight: 800,
    labelWeight: 700,
    accent: "solid",
    card: "plain",
    radius: 1.4,
    stroke: 1,
    iconStroke: 1.9,
    header: "hero",
    premium: "light",
    override: { bg: "#F7F9FD", card: "#FFFFFF", title: "#0B1220", text: "#1E293B", muted: "#64748B", line: "#DCE4EF", onAccent: "#FFFFFF" },
  },
  {
    id: "premium-night",
    name: "Премиум · ночь",
    hint: "Как лендинг, тёмный",
    font: PREMIUM_FONT,
    textScale: 1,
    titleWeight: 800,
    labelWeight: 700,
    accent: "solid",
    card: "plain",
    radius: 1.4,
    stroke: 1,
    iconStroke: 1.9,
    header: "hero",
    premium: "dark",
    override: { bg: "#0A1428", card: "#13223D", title: "#FFFFFF", text: "#E6EEF8", muted: "#93A7C2", line: "#2A4166", onAccent: "#FFFFFF" },
  },
  {
    id: "comic",
    name: "Комикс",
    hint: "Тушь, точки, тени",
    font: COMIC_FONT,
    titleFont: COMIC_TITLE,
    titleScale: 0.82,
    textScale: 1,
    titleWeight: 900,
    labelWeight: 700,
    accent: "solid",
    card: "outline",
    radius: 0.5,
    stroke: 3,
    iconStroke: 2.4,
    header: "caption",
    comic: true,
    paper: "dots",
    override: { bg: "#FFF8E6", card: "#FFFFFF", title: "#151515", text: "#1C1C1C", muted: "#4A463E", line: "#151515" },
  },
  {
    id: "blueprint",
    name: "Чертёж",
    hint: "Синька, для схем и процессов",
    font: MONO_FONT,
    textScale: 0.92,
    titleWeight: 700,
    labelWeight: 700,
    titleUpper: true,
    accent: "outline",
    card: "outline",
    radius: 0.25,
    stroke: 1.4,
    iconStroke: 1.6,
    header: "dimension",
    special: "blueprint",
    paper: "grid",
    fixedTheme: BLUEPRINT,
  },
  {
    id: "constructivism",
    name: "Конструктивизм",
    hint: "Плакат 1920-х, красный и чёрный",
    font: POSTER_FONT,
    titleFont: POSTER_TITLE,
    textScale: 1.05,
    titleWeight: 400,
    labelWeight: 700,
    titleUpper: true,
    accent: "solid",
    card: "plain",
    radius: 0,
    stroke: 2,
    iconStroke: 2.4,
    header: "diagonal",
    special: "constructivism",
    fixedTheme: POSTER,
  },
  {
    id: "newspaper",
    name: "Газета",
    hint: "Ч/б, серифы, линейки",
    font: NEWS_FONT,
    titleFont: NEWS_TITLE,
    textScale: 1,
    titleWeight: 900,
    labelWeight: 700,
    accent: "solid",
    card: "outline",
    radius: 0,
    stroke: 1,
    iconStroke: 1.8,
    header: "masthead",
    special: "newspaper",
    paper: "grain",
    fixedTheme: NEWSPRINT,
  },
];

export const styleById = (id: string) => STYLES.find((s) => s.id === id) ?? STYLES[0];
