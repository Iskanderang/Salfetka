import { LAYOUTS, type Layout } from "@napkin/shared";

/**
 * Категории форм для боковой панели. Одна форма может быть в нескольких категориях;
 * пустые категории не показываются — новые формы просто дописываются в нужные списки.
 */
/** icon — имя линейной иконки Lucide */
export type Category = { id: string; name: string; icon: string; layouts: Layout[] };

export const CATEGORIES: Category[] = [
  { id: "process", name: "Процесс", icon: "workflow", layouts: ["steps", "stairs", "flowchart", "cycle", "bridge"] },
  { id: "timeline", name: "Хронология", icon: "clock", layouts: ["timeline", "vtimeline", "roadmap"] },
  { id: "compare", name: "Сравнение", icon: "scale", layouts: ["compare", "proscons", "venn", "scales", "diamond"] },
  { id: "data", name: "Данные", icon: "chart-column", layouts: ["stats", "gauge", "funnel"] },
  { id: "hierarchy", name: "Иерархия", icon: "network", layouts: ["hierarchy", "pyramid", "target"] },
  { id: "parts", name: "Части целого", icon: "puzzle", layouts: ["hub", "cards", "iceberg"] },
  { id: "ideas", name: "Идеи и рассказ", icon: "lightbulb", layouts: ["mindmap", "dialogue"] },
  { id: "causes", name: "Причины и решения", icon: "search", layouts: ["fishbone", "decisions"] },
  { id: "frameworks", name: "Бизнес-фреймворки", icon: "briefcase", layouts: ["swot", "pestel", "matrix"] },
  { id: "metaphors", name: "Визуальные метафоры", icon: "mountain-snow", layouts: ["mountains", "temple", "podium", "tree", "rocket", "puzzle", "road", "lock", "bulb"] },
  { id: "people", name: "Тексты и люди", icon: "users", layouts: ["quote", "glossary", "faq", "persona", "orgchart"] },
];

// каждая форма — ровно в одной категории; если нарушено, предупреждаем при разработке
if (import.meta.env.DEV) {
  const seen = new Map<Layout, string>();
  for (const c of CATEGORIES) for (const l of c.layouts) {
    if (seen.has(l)) console.warn(`Форма «${l}» в двух категориях: ${seen.get(l)} и ${c.id}`);
    seen.set(l, c.id);
  }
  const missing = LAYOUTS.filter((l) => !seen.has(l));
  if (missing.length) console.warn(`Формы без категории: ${missing.join(", ")}`);
}

export const visibleCategories = () => CATEGORIES.filter((c) => c.layouts.length > 0);

/** Категория, где форма встречается первой — её раскрываем по умолчанию. */
export const categoryOf = (l: Layout) => visibleCategories().find((c) => c.layouts.includes(l))?.id ?? visibleCategories()[0].id;
