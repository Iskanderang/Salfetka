import type { Layout } from "@napkin/shared";

/**
 * Категории форм для боковой панели. Одна форма может быть в нескольких категориях;
 * пустые категории не показываются — новые формы просто дописываются в нужные списки.
 */
export type Category = { id: string; name: string; icon: string; layouts: Layout[] };

export const CATEGORIES: Category[] = [
  { id: "process", name: "Процесс", icon: "➜", layouts: ["steps", "stairs", "roadmap", "cycle", "funnel"] },
  { id: "timeline", name: "Хронология", icon: "⏱", layouts: ["timeline", "vtimeline", "roadmap", "steps"] },
  { id: "compare", name: "Сравнение", icon: "⚖", layouts: ["compare", "proscons", "venn", "matrix"] },
  { id: "data", name: "Данные", icon: "📊", layouts: ["stats", "funnel"] },
  { id: "hierarchy", name: "Иерархия", icon: "🔺", layouts: ["hierarchy", "pyramid", "target"] },
  { id: "parts", name: "Части целого", icon: "🧩", layouts: ["hub", "cards", "mindmap", "venn"] },
  { id: "ideas", name: "Мозговой штурм", icon: "💡", layouts: ["mindmap", "hub", "cards", "matrix"] },
  { id: "frameworks", name: "Бизнес-фреймворки", icon: "💼", layouts: ["swot", "pestel", "matrix", "pyramid", "funnel", "target"] },
  { id: "metaphors", name: "Визуальные метафоры", icon: "🎭", layouts: ["stairs", "roadmap", "target", "pyramid", "funnel"] },
];

export const visibleCategories = () => CATEGORIES.filter((c) => c.layouts.length > 0);

/** Категория, где форма встречается первой — её раскрываем по умолчанию. */
export const categoryOf = (l: Layout) => visibleCategories().find((c) => c.layouts.includes(l))?.id ?? visibleCategories()[0].id;
