import OpenAI from "openai";
import { AI_HEADERS, PROVIDER_IDS, type ProviderId, type ProviderInfo } from "@napkin/shared";

/**
 * Где работает нейросеть. Все сервисы OpenAI-совместимые, поэтому отличаются только
 * адресом, ключом, моделями и мелкими особенностями.
 */
type ProviderDef = ProviderInfo & {
  baseUrl: string;
  embedModel?: string;
  /** Значение reasoning_effort: ускоряет ответ у «думающих» моделей; undefined — не отправлять */
  reasoning?: string;
  /** Добавлять префиксы search_query/search_document (нужно моделям nomic) */
  nomicPrefixes?: boolean;
};

const env = process.env;

export const PROVIDERS: Record<ProviderId, ProviderDef> = {
  local: {
    id: "local",
    name: "Своя видеокарта (LM Studio)",
    cloud: false,
    baseUrl: env.LLM_BASE_URL ?? "http://localhost:1234/v1",
    defaultModel: env.LLM_MODEL ?? "google/gemma-4-12b-qat",
    embedModel: env.EMBED_MODEL ?? "text-embedding-nomic-embed-text-v1.5",
    embeddings: true,
    reasoning: env.LLM_REASONING_EFFORT ?? "none",
    nomicPrefixes: true,
    keyUrl: "",
    note: "Бесплатно и без лимитов. Нужна видеокарта от 8 ГБ и LM Studio.",
    privacy: "Тексты никуда не уходят — всё считается на вашем компьютере.",
  },
  openrouter: {
    id: "openrouter",
    name: "OpenRouter",
    cloud: true,
    baseUrl: "https://openrouter.ai/api/v1",
    defaultModel: "openai/gpt-oss-20b:free",
    embeddings: false,
    keyUrl: "https://openrouter.ai/keys",
    note: "Один ключ — много моделей; бесплатные помечены «:free». У бесплатных моделей дневной лимит запросов. Иконки подбираются по словам.",
    privacy: "Тексты уходят в OpenRouter и к выбранному поставщику модели.",
  },
};

export const providerList = (): ProviderInfo[] =>
  PROVIDER_IDS.map((id) => {
    const { baseUrl: _b, embedModel: _e, reasoning: _r, nomicPrefixes: _n, ...info } = PROVIDERS[id];
    return info;
  });

/** Всё, что нужно для одного запроса к нейросети. */
export type AiCtx = {
  def: ProviderDef;
  client: OpenAI;
  model: string;
  /** Ключ кэша индекса иконок: у каждой embedding-модели свои векторы */
  embedId?: string;
  hasKey: boolean;
  /** Ключ пользователя — только для служебных проверок, в логи не пишется */
  key?: string;
};

const clients = new Map<string, OpenAI>();

function clientFor(baseURL: string, apiKey: string) {
  const k = `${baseURL}|${apiKey}`;
  let c = clients.get(k);
  if (!c) {
    if (clients.size > 50) clients.clear();
    c = new OpenAI({ baseURL, apiKey, maxRetries: 1, timeout: 90_000 });
    clients.set(k, c);
  }
  return c;
}

/** Контекст по заголовкам запроса: какой сервис, ключ и модель выбрал пользователь. */
export function resolveCtx(headers: Record<string, string | string[] | undefined>): AiCtx {
  const h = (name: string) => {
    const v = headers[name];
    return (Array.isArray(v) ? v[0] : v)?.trim() || undefined;
  };
  const id = (PROVIDER_IDS as readonly string[]).includes(h(AI_HEADERS.provider) ?? "") ? (h(AI_HEADERS.provider) as ProviderId) : "local";
  const def = PROVIDERS[id];
  const key = def.cloud ? h(AI_HEADERS.key) : (env.LLM_API_KEY ?? "lm-studio");
  return {
    def,
    client: clientFor(def.baseUrl, key ?? "no-key"),
    model: h(AI_HEADERS.model) ?? def.defaultModel,
    // у своей видеокарты имя кэша прежнее, чтобы не перестраивать готовый индекс
    embedId: def.embedModel ? (id === "local" ? def.embedModel : `${id}-${def.embedModel}`) : undefined,
    hasKey: !!key,
    key,
  };
}

/** Понятные сообщения вместо технических ошибок сервисов. */
export function friendlyError(e: unknown, ctx: AiCtx): string {
  const err = e as { status?: number; message?: string; code?: string };
  const name = ctx.def.name;
  if (!ctx.hasKey) return `Не указан ключ для ${name} — откройте «⚙ Нейросеть».`;
  if (err.status === 401 || err.status === 403 || (err.status === 400 && /api.?key/i.test(err.message ?? ""))) return `${name}: ключ не подошёл или нет доступа к модели «${ctx.model}».`;
  if (err.status === 429) return `${name}: исчерпан лимит бесплатного тарифа. Подождите минуту или выберите другой сервис.`;
  if (err.status === 404) return `${name}: модель «${ctx.model}» недоступна. Нажмите «Проверить ключ» и выберите из списка.`;
  if (err.code === "ECONNREFUSED" || /ECONNREFUSED|fetch failed|Connection error/i.test(err.message ?? ""))
    return ctx.def.cloud ? `${name} не отвечает — проверьте интернет.` : "LM Studio не отвечает — запустите сервер (вкладка Developer → Start Server).";
  return `${name}: ${err.message ?? String(e)}`;
}
