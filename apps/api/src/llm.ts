import type OpenAI from "openai";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import { LlmVisualSchema, LAYOUTS, LAYOUT_HINTS, type LlmVisual } from "@napkin/shared";
import type { AiCtx } from "./providers.js";

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

/** Для сервисов без строгой JSON-схемы: схема прямо в инструкции. */
const SCHEMA_HINT = `\n\nОтвечай только JSON-объектом без пояснений и без markdown, строго по этой JSON-схеме:\n${JSON.stringify(jsonSchema)}`;

const EXAMPLE_USER = "Офис против удалёнки. Офис: живое общение, чёткий режим, но дорога. Удалёнка: гибкий график, экономия времени, но сложнее коммуникация.";
const EXAMPLE_ASSISTANT: LlmVisual = {
  layouts: ["compare", "cards"],
  title: "Офис или удалёнка",
  items: [
    { label: "Офис", text: "", value: "", children: ["Живое общение", "Чёткий режим", "Минус: дорога"], keywords: ["office", "building"] },
    { label: "Удалёнка", text: "", value: "", children: ["Гибкий график", "Экономия времени", "Минус: сложнее коммуникация"], keywords: ["home", "laptop"] },
  ],
};

type JsonCall = {
  messages: OpenAI.ChatCompletionMessageParam[];
  schemaName: string;
  schema: object;
  temperature: number;
  maxTokens: number;
  seed?: number;
};

/**
 * Режимы запроса JSON — от самого надёжного к самому совместимому. Сервисы по-разному понимают
 * строгую схему и reasoning_effort, а некоторые на непонятное отвечают «400» без объяснений.
 */
type Mode = { label: string; reasoning: boolean; format: "strict" | "loose" | "object" | "none" };
const MODES: Mode[] = [
  { label: "строгая схема", reasoning: true, format: "strict" },
  { label: "строгая схема без reasoning", reasoning: false, format: "strict" },
  { label: "схема без strict", reasoning: false, format: "loose" },
  { label: "JSON-режим", reasoning: false, format: "object" },
  { label: "схема в инструкции", reasoning: false, format: "none" },
];

/** Какой режим сработал для модели — чтобы не перебирать каждый раз. */
const learnedMode = new Map<string, number>();

/** Схема без того, что ломает нестрогие парсеры: additionalProperties, $schema, ограничения длины. */
function looseSchema(schema: unknown): unknown {
  if (Array.isArray(schema)) return schema.map(looseSchema);
  if (schema && typeof schema === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(schema)) {
      if (["additionalProperties", "$schema", "minItems", "maxItems", "strict"].includes(k)) continue;
      out[k] = looseSchema(v);
    }
    return out;
  }
  return schema;
}

function withHint(messages: OpenAI.ChatCompletionMessageParam[], schema: object) {
  return messages.map((m, i) => (i === 0 && m.role === "system" ? { ...m, content: `${m.content}${SCHEMA_HINT_FOR(schema)}` } : m));
}

/** Запрос с JSON-ответом: при отказе «400» переходим к следующему, более простому режиму. */
export async function jsonCompletion(ctx: AiCtx, call: JsonCall): Promise<string> {
  const { content } = await jsonCompletionWithMode(ctx, call);
  return content;
}

async function jsonCompletionWithMode(ctx: AiCtx, call: JsonCall): Promise<{ content: string; mode: string }> {
  const id = `${ctx.def.id}:${ctx.model}`;
  let lastErr: unknown;
  for (let i = learnedMode.get(id) ?? 0; i < MODES.length; i++) {
    const mode = MODES[i];
    if (mode.reasoning && !ctx.def.reasoning) continue;
    const response_format =
      mode.format === "strict"
        ? { type: "json_schema" as const, json_schema: { name: call.schemaName, strict: true, schema: call.schema as Record<string, unknown> } }
        : mode.format === "loose"
          ? { type: "json_schema" as const, json_schema: { name: call.schemaName, schema: looseSchema(call.schema) as Record<string, unknown> } }
          : mode.format === "object"
            ? { type: "json_object" as const }
            : undefined;
    try {
      const res = await ctx.client.chat.completions.create({
        model: ctx.model,
        messages: mode.format === "strict" || mode.format === "loose" ? call.messages : withHint(call.messages, call.schema),
        temperature: call.temperature,
        max_tokens: call.maxTokens,
        ...(call.seed !== undefined && !ctx.def.cloud ? { seed: call.seed } : {}),
        ...(response_format ? { response_format } : {}),
        ...(mode.reasoning ? ({ reasoning_effort: ctx.def.reasoning } as object) : {}),
      });
      learnedMode.set(id, i);
      return { content: stripFences(res.choices[0]?.message?.content ?? ""), mode: mode.label };
    } catch (e) {
      lastErr = e;
      // 400/422 — сервис не принял форму запроса: пробуем проще. Остальное (ключ, лимит, сеть) — сразу наверх.
      const status = (e as { status?: number }).status;
      if (status !== 400 && status !== 422) throw e;
    }
  }
  throw lastErr;
}

const probeSchema = zodToJsonSchema(z.object({ ok: z.boolean(), word: z.string() }), { target: "openAi", $refStrategy: "none" });

/** Пробная генерация для «Проверить ключ»: заодно находит режим, который понимает модель. */
export async function probe(ctx: AiCtx): Promise<string> {
  const { content, mode } = await jsonCompletionWithMode(ctx, {
    messages: [
      { role: "system", content: "Ответь JSON-объектом: ok=true и word — любое русское слово." },
      { role: "user", content: "Проверка связи" },
    ],
    schemaName: "probe",
    schema: probeSchema,
    temperature: 0,
    maxTokens: 400,
  });
  JSON.parse(content);
  return mode;
}

const SCHEMA_HINT_FOR = (schema: object) => (schema === jsonSchema ? SCHEMA_HINT : `\n\nОтвечай только JSON по схеме: ${JSON.stringify(schema)}`);

/** Некоторые модели в json_object-режиме всё равно оборачивают ответ в ```json ... ``` */
const stripFences = (s: string) => s.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");

export async function textToVisual(ctx: AiCtx, text: string, variant = false): Promise<LlmVisual> {
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
    const content = await jsonCompletion(ctx, {
      messages,
      schemaName: "visual",
      schema: jsonSchema,
      temperature: variant ? 0.9 : 0.3,
      seed: variant ? Math.floor(Math.random() * 1e9) : 42,
      maxTokens: 2500,
    });
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
export async function translateForIcons(ctx: AiCtx, query: string): Promise<string> {
  const key = query.toLowerCase();
  const hit = translations.get(key);
  if (hit) return hit;
  let out = query;
  try {
    const content = await jsonCompletion(ctx, {
      messages: [
        { role: "system", content: "Переведи запрос для поиска иконки в 2–4 коротких английских ключевых слова: сам предмет и близкие по смыслу символы. Ответ — JSON." },
        { role: "user", content: query },
      ],
      schemaName: "kw",
      schema: translateSchema,
      temperature: 0,
      maxTokens: 300,
    });
    out = (JSON.parse(content).keywords as string[]).join(", ");
    translations.set(key, out);
  } catch {
    /* без перевода поищем как есть */
  }
  return out;
}

/** Список моделей сервиса (для проверки ключа и выбора модели). */
export async function listModels(ctx: AiCtx): Promise<string[]> {
  const list = await ctx.client.models.list();
  return list.data.map((m) => m.id.replace(/^models\//, ""));
}

export async function checkModel(ctx: AiCtx): Promise<void> {
  if (ctx.def.cloud && !ctx.hasKey) throw new Error(`Не указан ключ для ${ctx.def.name} — откройте «⚙ Нейросеть».`);
  if (ctx.def.id === "openrouter") {
    // список моделей OpenRouter открыт всем — ключ проверяем отдельно
    const r = await fetch(`${ctx.def.baseUrl}/key`, { headers: { Authorization: `Bearer ${ctx.key}` } });
    if (!r.ok) throw Object.assign(new Error(`HTTP ${r.status}`), { status: r.status });
    return;
  }
  const ids = await listModels(ctx);
  if (!ctx.def.cloud && !ids.includes(ctx.model)) {
    throw new Error(`Модель ${ctx.model} не найдена в LM Studio. Доступны: ${ids.join(", ") || "ничего"}`);
  }
}
