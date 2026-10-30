import { AI_HEADERS, type AiSettings, type HealthResponse, type IconSearchResponse, type ModelsResponse, type ProviderInfo, type VisualizeResponse } from "@napkin/shared";

/** Выбор нейросети уходит с каждым запросом заголовками — сервер собирает клиент под него. */
let aiHeaders: Record<string, string> = {};

export function setAiSettings(s: AiSettings) {
  aiHeaders = { [AI_HEADERS.provider]: s.provider };
  const key = s.keys[s.provider];
  const model = s.models[s.provider];
  if (s.provider !== "local" && key) aiHeaders[AI_HEADERS.key] = key;
  if (model) aiHeaders[AI_HEADERS.model] = model;
}

const json = { "content-type": "application/json" };

export async function visualize(text: string, variant: boolean, signal?: AbortSignal): Promise<VisualizeResponse> {
  const r = await fetch("/api/visualize", {
    method: "POST",
    headers: { ...json, ...aiHeaders },
    body: JSON.stringify({ text, variant }),
    signal,
  });
  const j = await r.json().catch(() => ({ error: `HTTP ${r.status}` }));
  if (!r.ok) throw new Error(j.error ?? `HTTP ${r.status}`);
  return j;
}

export async function health(): Promise<HealthResponse> {
  try {
    const r = await fetch("/api/health", { headers: aiHeaders });
    return await r.json();
  } catch {
    return { ok: false, provider: "local", model: "", baseUrl: "", error: "API-сервер не запущен", icons: { total: 0, semantic: false, status: "" } };
  }
}

export async function searchIcons(query: string, signal?: AbortSignal): Promise<IconSearchResponse> {
  const r = await fetch("/api/icons/search", {
    method: "POST",
    headers: { ...json, ...aiHeaders },
    body: JSON.stringify({ query, limit: 48 }),
    signal,
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

export async function providers(): Promise<ProviderInfo[]> {
  try {
    return await (await fetch("/api/providers")).json();
  } catch {
    return [];
  }
}

/** Проверка ключа: список моделей, доступных с этим ключом. */
export async function models(s: AiSettings): Promise<ModelsResponse> {
  const prev = aiHeaders;
  setAiSettings(s);
  const headers = aiHeaders;
  aiHeaders = prev;
  try {
    return await (await fetch("/api/models", { headers })).json();
  } catch {
    return { models: [], error: "API-сервер не запущен" };
  }
}
