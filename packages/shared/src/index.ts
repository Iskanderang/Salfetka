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
  "hub",
  "stairs",
  "roadmap",
  "vtimeline",
  "proscons",
  "venn",
  "target",
  "swot",
  "pestel",
  "iceberg",
  "diamond",
  "decisions",
  "flowchart",
  "fishbone",
  "podium",
  "scales",
  "mountains",
  "temple",
  "bridge",
  "dialogue",
  "gauge",
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
  hub: "Центр и лучи",
  stairs: "Лестница",
  roadmap: "Дорожная карта",
  vtimeline: "Хронология (вертикальная)",
  proscons: "Плюсы и минусы",
  venn: "Диаграмма Венна",
  target: "Мишень",
  swot: "SWOT",
  pestel: "PESTEL",
  iceberg: "Айсберг",
  diamond: "Алмаз",
  decisions: "Лестница решений",
  flowchart: "Блок-схема",
  fishbone: "Рыбья кость",
  podium: "Пьедестал",
  scales: "Весы",
  mountains: "Горы с флагом",
  temple: "Храм",
  bridge: "Мост",
  dialogue: "Диалог",
  gauge: "Спидометр",
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
  hub: "одно целое и его составные части, факторы вокруг одной темы",
  stairs: "рост по ступеням, уровни развития, путь от простого к сложному",
  roadmap: "план или путь с вехами, этапы проекта, путь клиента",
  vtimeline: "история, хронология с датами, особенно если событий много",
  proscons: "ровно 2 пункта: «Плюсы» и «Минусы» (или «За»/«Против»), их доводы в children",
  venn: "2–3 пересекающихся понятия: общее и различия; 4-й пункт — что их объединяет",
  target: "приоритеты от главного к второстепенному, круги влияния (первый пункт — центр мишени)",
  swot: "ровно 4 пункта в порядке: сильные стороны, слабые стороны, возможности, угрозы; детали в children",
  pestel: "ровно 6 пунктов в порядке: политические, экономические, социальные, технологические, экологические, правовые факторы",
  iceberg: "видимое и скрытое: первые 1–2 пункта — то, что на поверхности, остальные — что скрыто под водой",
  diamond: "ровно 4 пункта: четыре стороны или грани одной темы",
  decisions: "последовательные решения-вопросы на пути к цели; варианты выбора — в children",
  flowchart: "алгоритм или порядок действий с проверками; пункт-вопрос с двумя исходами — children: [«да: …», «нет: …»]",
  fishbone: "причины одной проблемы (проблема — в title), группы причин — пункты, конкретные причины — в children",
  podium: "рейтинг, топ-3 лучших (первый пункт — 1 место, второй — 2, третий — 3)",
  scales: "ровно 2 пункта: что перевешивает — две стороны выбора, их доводы в children",
  mountains: "путь к большой цели через этапы-высоты (последний пункт — вершина, цель)",
  temple: "опоры чего-то: первый пункт — крыша (итог, цель), последний — фундамент, между ними — колонны-опоры",
  bridge: "переход из точки А (первый пункт) в точку Б (последний пункт) через шаги-опоры между ними",
  dialogue: "разговор, интервью, вопросы и ответы: label — кто говорит, text — реплика",
  gauge: "оценка уровня по шкале от низкого к высокому (пункты — зоны шкалы по порядку); текущее значение в % — в value",
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
  provider: ProviderId;
  model: string;
  baseUrl: string;
  error?: string;
  icons: { total: number; semantic: boolean; status: string };
};

// ─── Где работает нейросеть ──────────────────────────────────

export const PROVIDER_IDS = ["local", "openrouter"] as const;
export type ProviderId = (typeof PROVIDER_IDS)[number];

export type ProviderInfo = {
  id: ProviderId;
  name: string;
  cloud: boolean;
  defaultModel: string;
  /** Есть ли у сервиса модель для подбора иконок по смыслу */
  embeddings: boolean;
  /** Где бесплатно получить ключ */
  keyUrl: string;
  /** Коротко: чем хорош и какие ограничения */
  note: string;
  /** Что происходит с текстами */
  privacy: string;
};

/** Выбор пользователя; хранится в его браузере. Ключи уходят только на локальный API-сервер. */
export type AiSettings = {
  provider: ProviderId;
  keys: Partial<Record<ProviderId, string>>;
  models: Partial<Record<ProviderId, string>>;
};

export type ModelsResponse = {
  models: string[];
  error?: string;
  /** Пробная генерация выбранной моделью: какой режим JSON подошёл */
  probe?: string;
  probeError?: string;
};

/** Заголовки, в которых браузер передаёт выбор нейросети API-серверу. */
export const AI_HEADERS = { provider: "x-ai-provider", key: "x-ai-key", model: "x-ai-model" } as const;
