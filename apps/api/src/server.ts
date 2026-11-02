import Fastify from "fastify";
import cors from "@fastify/cors";
import type { HealthResponse, IconSearchRequest, ModelsResponse, ProcessResponse, Visual, VisualizeRequest, VisualizeResponse } from "@napkin/shared";
import { textToVisual, checkModel, listModels, probe } from "./llm.js";
import { repairProcess, textToProcess } from "./process.js";
import { buildIndex, iconStatus, resolveIcons, searchIcons } from "./icons.js";
import { friendlyError, providerList, resolveCtx } from "./providers.js";

const app = Fastify({ logger: { level: "info", redact: ["req.headers['x-ai-key']"] } });
await app.register(cors, { origin: true });

app.get("/api/providers", async () => providerList());

// проверка ключа облачного сервиса не нужна каждые 10 секунд — держим результат минуту
const healthCache = new Map<string, { at: number; error?: string }>();

app.get("/api/health", async (req): Promise<HealthResponse> => {
  const ctx = resolveCtx(req.headers);
  const base = { provider: ctx.def.id, model: ctx.model, baseUrl: ctx.def.baseUrl, icons: iconStatus(ctx) };
  const cacheKey = `${ctx.def.id}|${ctx.model}|${req.headers["x-ai-key"] ?? ""}`;
  const hit = healthCache.get(cacheKey);
  if (ctx.def.cloud && hit && Date.now() - hit.at < 60_000) return { ok: !hit.error, ...base, error: hit.error };
  try {
    await checkModel(ctx);
    healthCache.set(cacheKey, { at: Date.now() });
    buildIndex(ctx); // заранее, чтобы иконки по смыслу были готовы к первой схеме
    return { ok: true, ...base, icons: iconStatus(ctx) };
  } catch (e) {
    const error = (e as Error).message.startsWith("Не указан ключ") || (e as Error).message.startsWith("Модель") ? (e as Error).message : friendlyError(e, ctx);
    healthCache.set(cacheKey, { at: Date.now(), error });
    return { ok: false, ...base, error };
  }
});

app.get("/api/models", async (req): Promise<ModelsResponse> => {
  const ctx = resolveCtx(req.headers);
  try {
    let models = await listModels(ctx);
    // для схем нужны текстовые модели: убираем эмбеддинги, картинки, речь, модерацию
    models = models.filter((m) => !/embed|tts|whisper|audio|image|imagen|veo|moderation|guard|ocr|transcri|realtime|aqa/i.test(m));
    if (ctx.def.id === "openrouter") models = models.filter((m) => m.endsWith(":free"));
    // ключ мог пройти, а сама генерация — нет (другой формат запроса, нет доступа к модели): проверяем по-настоящему
    try {
      return { models: models.sort(), probe: await probe(ctx) };
    } catch (e) {
      req.log.error({ err: (e as Error).message, provider: ctx.def.id, model: ctx.model, step: "probe" });
      return { models: models.sort(), probeError: friendlyError(e, ctx) };
    }
  } catch (e) {
    return { models: [], error: friendlyError(e, ctx) };
  }
});

app.post<{ Body: VisualizeRequest }>("/api/visualize", async (req, reply) => {
  const ctx = resolveCtx(req.headers);
  const text = req.body?.text?.trim();
  if (!text) return reply.code(400).send({ error: "Пустой текст" });
  if (text.length > 4000) return reply.code(400).send({ error: "Текст длиннее 4000 символов — выделите фрагмент" });

  const started = Date.now();
  try {
    const llm = await textToVisual(ctx, text, !!req.body.variant);
    const icons = await resolveIcons(ctx, llm.items.map((it) => it.keywords));
    const visual: Visual = {
      layouts: llm.layouts,
      title: llm.title,
      items: llm.items.map(({ keywords: _k, ...it }, i) => ({ ...it, icon: icons[i].icon, iconOptions: icons[i].options })),
    };
    const res: VisualizeResponse = { visual, ms: Date.now() - started, model: ctx.model };
    return res;
  } catch (e) {
    req.log.error({ err: (e as Error).message, provider: ctx.def.id, model: ctx.model });
    return reply.code(502).send({ error: friendlyError(e, ctx) });
  }
});

app.post<{ Body: VisualizeRequest }>("/api/process", async (req, reply) => {
  const ctx = resolveCtx(req.headers);
  const text = req.body?.text?.trim();
  if (!text) return reply.code(400).send({ error: "Пустой текст" });
  if (text.length > 6000) return reply.code(400).send({ error: "Текст длиннее 6000 символов — разбейте процесс на части" });
  const started = Date.now();
  try {
    const { process, fixes } = repairProcess(await textToProcess(ctx, text));
    if (fixes.length) req.log.info({ fixes }, "процесс исправлен");
    const res: ProcessResponse = { process, fixes, ms: Date.now() - started, model: ctx.model };
    return res;
  } catch (e) {
    req.log.error({ err: (e as Error).message, provider: ctx.def.id, model: ctx.model });
    return reply.code(502).send({ error: friendlyError(e, ctx) });
  }
});

app.post<{ Body: IconSearchRequest }>("/api/icons/search", async (req, reply) => {
  const ctx = resolveCtx(req.headers);
  try {
    return await searchIcons(ctx, req.body?.query ?? "", Math.min(96, req.body?.limit ?? 48));
  } catch (e) {
    return reply.code(502).send({ error: friendlyError(e, ctx) });
  }
});

const port = Number(process.env.PORT ?? 8787);
await app.listen({ port, host: "127.0.0.1" });
// индекс иконок своей видеокарты строим в фоне, чтобы сервер стартовал мгновенно
const local = resolveCtx({});
buildIndex(local).then(() => app.log.info(`Иконки: ${JSON.stringify(iconStatus(local))}`));
