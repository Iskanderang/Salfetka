import Fastify from "fastify";
import cors from "@fastify/cors";
import type { HealthResponse, IconSearchRequest, Visual, VisualizeRequest, VisualizeResponse } from "@napkin/shared";
import { config, textToVisual, checkModel } from "./llm.js";
import { buildIndex, iconStatus, resolveIcons, searchIcons } from "./icons.js";

const app = Fastify({ logger: { level: "info" } });
await app.register(cors, { origin: true });

app.get("/api/health", async (): Promise<HealthResponse> => {
  const icons = iconStatus();
  try {
    await checkModel();
    return { ok: true, model: config.model, baseUrl: config.baseUrl, icons };
  } catch (e) {
    return { ok: false, model: config.model, baseUrl: config.baseUrl, error: (e as Error).message, icons };
  }
});

app.post<{ Body: VisualizeRequest }>("/api/visualize", async (req, reply) => {
  const text = req.body?.text?.trim();
  if (!text) return reply.code(400).send({ error: "Пустой текст" });
  if (text.length > 4000) return reply.code(400).send({ error: "Текст длиннее 4000 символов — выделите фрагмент" });

  const started = Date.now();
  try {
    const llm = await textToVisual(text, !!req.body.variant);
    const icons = await resolveIcons(llm.items.map((it) => it.keywords));
    const visual: Visual = {
      layouts: llm.layouts,
      title: llm.title,
      items: llm.items.map(({ keywords: _k, ...it }, i) => ({ ...it, icon: icons[i].icon, iconOptions: icons[i].options })),
    };
    const res: VisualizeResponse = { visual, ms: Date.now() - started, model: config.model };
    return res;
  } catch (e) {
    req.log.error(e);
    return reply.code(502).send({ error: (e as Error).message });
  }
});

app.post<{ Body: IconSearchRequest }>("/api/icons/search", async (req, reply) => {
  try {
    return await searchIcons(req.body?.query ?? "", Math.min(96, req.body?.limit ?? 48));
  } catch (e) {
    return reply.code(502).send({ error: (e as Error).message });
  }
});

const port = Number(process.env.PORT ?? 8787);
await app.listen({ port, host: "127.0.0.1" });
// индекс иконок строим в фоне, чтобы сервер стартовал мгновенно
buildIndex().then(() => app.log.info(`Иконки: ${JSON.stringify(iconStatus())}`));
