import { z } from "zod";

/**
 * Visual JSON — контракт между LLM и рендером.
 * Все раскладки читают одни и те же данные, поэтому смена раскладки или стиля
 * не требует повторного запроса к модели.
 */

export const LAYOUTS = [
  "steps",
  "cycle",
  "timeline",
  "funnel",
  "stats",
  "compare",
  "hierarchy",
  "cards",
  "pyramid",
  "matrix",
  "mindmap",
] as const;
export type Layout = (typeof LAYOUTS)[number];

export const LAYOUT_LABELS: Record<Layout, string> = {
  steps: "Шаги",
  cycle: "Цикл",
  timeline: "Хронология",
  funnel: "Воронка",
  stats: "Цифры",
  compare: "Сравнение",
  hierarchy: "Иерархия",
  cards: "Карточки",
  pyramid: "Пирамида",
  matrix: "Матрица 2×2",
  mindmap: "Карта мыслей",
};

/** Подсказки модели: когда какая раскладка уместна. */
export const LAYOUT_HINTS: Record<Layout, string> = {
  steps: "последовательность действий",
  cycle: "повторяющийся процесс",
  timeline: "события по датам или этапам времени",
  funnel: "отбор, сужение, конверсия",
  stats: "ключевые числа и метрики",
  compare: "сравнение 2–3 вариантов (каждый вариант = пункт, его свойства в children)",
  hierarchy: "главная идея и её составляющие с подпунктами",
  cards: "набор равнозначных пунктов, советов, фактов",
  pyramid: "уровни от основания к вершине, приоритеты, иерархия потребностей (первый пункт = вершина)",
  matrix: "ровно 4 пункта по двум осям: важно/срочно, риск/выгода, SWOT",
  mindmap: "центральная тема и разбегающиеся от неё идеи",
};

// ─── Что возвращает модель ───────────────────────────────────

export const LlmItemSchema = z.object({
  label: z.string().describe("Короткий заголовок пункта, 1–4 слова, формулировка из текста"),
  text: z.string().describe("Пояснение до 12 слов по исходному тексту, можно пустую строку"),
  value: z.string().describe("Число/метрика/дата из текста, например '75%', '2024', иначе пустая строка"),
  children: z.array(z.string()).describe("Подпункты (для сравнения и иерархии), до 4 коротких фраз, иначе пустой массив"),
  keywords: z.array(z.string()).describe("2–3 английских слова для поиска иконки по смыслу, например ['money','savings']"),
});

export const LlmVisualSchema = z.object({
  layouts: z.array(z.enum(LAYOUTS)).min(1).max(4).describe("2–4 подходящие раскладки, лучшая первой"),
  title: z.string().describe("Заголовок визуала, до 6 слов"),
  items: z.array(LlmItemSchema).min(2).max(8),
});
export type LlmVisual = z.infer<typeof LlmVisualSchema>;

// ─── Что получает рендер ─────────────────────────────────────

export type Item = {
  label: string;
  text: string;
  value: string;
  children: string[];
  /** Имя иконки Lucide в kebab-case */
  icon: string;
  /** Подобранные по смыслу альтернативы для быстрой замены */
  iconOptions: string[];
  /** Свой цвет пункта (#RRGGBB), иначе цвет из палитры */
  color?: string;
};

export type Visual = {
  layouts: Layout[];
  title: string;
  items: Item[];
};

export type VisualizeRequest = { text: string; variant?: boolean };
export type VisualizeResponse = { visual: Visual; ms: number; model: string };
export type IconSearchRequest = { query: string; limit?: number };
export type IconSearchResponse = { icons: string[]; query: string; semantic: boolean };
export type HealthResponse = {
  ok: boolean;
  model: string;
  baseUrl: string;
  error?: string;
  icons: { total: number; semantic: boolean; status: string };
};
