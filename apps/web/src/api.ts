import type { HealthResponse, IconSearchResponse, VisualizeResponse } from "@napkin/shared";

export async function visualize(text: string, variant: boolean, signal?: AbortSignal): Promise<VisualizeResponse> {
  const r = await fetch("/api/visualize", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ text, variant }),
    signal,
  });
  const j = await r.json().catch(() => ({ error: `HTTP ${r.status}` }));
  if (!r.ok) throw new Error(j.error ?? `HTTP ${r.status}`);
  return j;
}

export async function health(): Promise<HealthResponse> {
  try {
    const r = await fetch("/api/health");
    return await r.json();
  } catch {
    return { ok: false, model: "", baseUrl: "", error: "API-сервер не запущен", icons: { total: 0, semantic: false, status: "" } };
  }
}

export async function searchIcons(query: string, signal?: AbortSignal): Promise<IconSearchResponse> {
  const r = await fetch("/api/icons/search", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ query, limit: 48 }),
    signal,
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}
