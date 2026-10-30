import OpenAI from "openai";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import { LlmVisualSchema, LAYOUTS, LAYOUT_HINTS, type LlmVisual } from "@napkin/shared";

// Любой OpenAI-совместимый сервер: LM Studio, Ollama, vLLM, Groq, OpenRouter...
export const config = {
  baseUrl: process.env.LLM_BASE_URL ?? "http://localhost:1234/v1",
  apiKey: process.env.LLM_API_KEY ?? "lm-studio",
  model: process.env.LLM_MODEL ?? "google/gemma-4-12b-qat",
  embedModel: process.env.EMBED_MODEL ?? "text-embedding-nomic-embed-text-v1.5",
  // "none" отключает режим рассуждений: ~4 с вместо ~20 с на Gemma 4
  reasoningEffort: process.env.LLM_REASONING_EFFORT ?? "none",
};

export const client = new OpenAI({ baseURL: config.baseUrl, apiKey: config.apiKey });

const jsonSchema = zodToJsonSchema(LlmVisualSchema, { target: "openAi", $refStrategy: "none" });

const SYSTEM = `Ты — дизайнер инфографики. Превращаешь текст пользователя в структуру для визуала.
Главное правило: опирайся только на исходный текст. Не придумывай пунктов, фактов и чисел, которых в тексте нет.
Бери формулировки из текста, сокращая их, а не заменяя своими.
Правила:
- Пиши на языке исходного текста (кроме keywords — они всегда на английском).
- title — суть текста, до 6 слов.
- items — столько пунктов, сколько в тексте (обычно 3–6, максимум 8). label — 1–4 слова, text — до 12 слов, без повторения label.
- value — только если в тексте есть число, процент, дата или срок для этого пункта; иначе "".
- children — подпункты только для сравнения (свойства варианта), иерархии и карты мыслей (ветки); иначе [].
- keywords — 2–3 английских существительных: конкретные предметы-символы, которые нарисовал бы иконист.
  Не абстракции, а образы. Примеры: исследование рынка → ["magnifier","chart"]; MVP → ["rocket","prototype"];
  клиенты → ["users","customer"]; отзывы → ["chat","star"]; масштабирование → ["growth","arrow up"]; деньги → ["coins","wallet"].
- layouts — 2–4 раскладки, лучшая первой. Доступны только эти:
${LAYOUTS.map((l) => `  ${l} — ${LAYOUT_HINTS[l]}`).join("\n")}`;

const EXAMPLE_USER = "Офис против удалёнки. Офис: живое общение, чёткий режим, но дорога. Удалёнка: гибкий график, экономия времени, но сложнее коммуникация.";
const EXAMPLE_ASSISTANT: LlmVisual = {
  layouts: ["compare", "cards"],
  title: "Офис или удалёнка",
  items: [
    { label: "Офис", text: "", value: "", children: ["Живое общение", "Чёткий режим", "Минус: дорога"], keywords: ["office", "building"] },
    { label: "Удалёнка", text: "", value: "", children: ["Гибкий график", "Экономия времени", "Минус: сложнее коммуникация"], keywords: ["home", "laptop"] },
  ],
};

const reasoning = () => ({ reasoning_effort: config.reasoningEffort }) as object;

export async function textToVisual(text: string, variant = false): Promise<LlmVisual> {
  const messages: OpenAI.ChatCompletionMessageParam[] = [
    { role: "system", content: SYSTEM },
    { role: "user", content: EXAMPLE_USER },
    { role: "assistant", content: JSON.stringify(EXAMPLE_ASSISTANT) },
    {
      role: "user",
      content: variant
        ? `${text}\n\n(Дай другой вариант: иначе сгруппируй пункты, предложи другие раскладки первыми, переформулируй заголовок. Факты — только из текста.)`
        : text,
    },
  ];

  let lastError = "";
  for (let attempt = 0; attempt < 3; attempt++) {
    if (lastError) {
      messages.push({ role: "user", content: `Ответ не прошёл проверку: ${lastError}. Исправь и верни JSON заново.` });
    }
    const res = await client.chat.completions.create({
      model: config.model,
      messages,
      temperature: variant ? 0.9 : 0.3,
      seed: variant ? Math.floor(Math.random() * 1e9) : 42,
      max_tokens: 1800,
      response_format: {
        type: "json_schema",
        json_schema: { name: "visual", strict: true, schema: jsonSchema as Record<string, unknown> },
      },
      ...reasoning(),
    });
    const content = res.choices[0]?.message?.content ?? "";
    try {
      const parsed = LlmVisualSchema.safeParse(JSON.parse(content));
      if (parsed.success) return parsed.data;
      lastError = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    } catch {
      lastError = "невалидный JSON";
    }
    messages.push({ role: "assistant", content });
  }
  throw new Error(`Модель не вернула корректную структуру: ${lastError}`);
}

const translateSchema = zodToJsonSchema(z.object({ keywords: z.array(z.string()).min(1).max(4) }), { target: "openAi", $refStrategy: "none" });
const translations = new Map<string, string>();

/** «деньги» → "money, coins, cash" — для поиска иконок embedding-моделью, которая знает только английский. */
export async function translateForIcons(query: string): Promise<string> {
  const key = query.toLowerCase();
  const hit = translations.get(key);
  if (hit) return hit;
  const res = await client.chat.completions.create({
    model: config.model,
    messages: [
      { role: "system", content: "Переведи запрос для поиска иконки в 2–4 коротких английских ключевых слова: сам предмет и близкие по смыслу символы." },
      { role: "user", content: query },
    ],
    temperature: 0,
    max_tokens: 80,
    response_format: { type: "json_schema", json_schema: { name: "kw", strict: true, schema: translateSchema as Record<string, unknown> } },
    ...reasoning(),
  });
  let out = query;
  try {
    out = (JSON.parse(res.choices[0]?.message?.content ?? "{}").keywords as string[]).join(", ");
  } catch {
    /* оставим как есть */
  }
  translations.set(key, out);
  return out;
}

export async function checkModel(): Promise<void> {
  const list = await client.models.list();
  if (!list.data.some((m) => m.id === config.model)) {
    throw new Error(`Модель ${config.model} не найдена в LM Studio. Доступны: ${list.data.map((m) => m.id).join(", ") || "ничего"}`);
  }
}
