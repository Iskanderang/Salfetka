import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { translateForIcons } from "./llm.js";
import type { AiCtx } from "./providers.js";

// Каталог Lucide: имя → теги. Оставляем только иконки, которые есть в lucide-react на фронте.
const require = createRequire(import.meta.url);
const tags: Record<string, string[]> = require("lucide-static/tags.json");
const reactIcons: Record<string, unknown> = require("lucide-react").icons;
const pascal = (n: string) => n.split("-").map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join("");

export const ICON_NAMES = Object.keys(tags).filter((n) => reactIcons[pascal(n)]);
const ICON_SET = new Set(ICON_NAMES);

/** Популярные иконки — показываются в пустом поиске. */
export const POPULAR = [
  "lightbulb", "rocket", "target", "users", "handshake", "message-circle", "heart", "star", "trophy",
  "chart-line", "trending-up", "piggy-bank", "coins", "wallet", "shopping-cart", "clock", "calendar",
  "circle-check", "shield-check", "lock", "settings", "wrench", "code", "laptop", "database", "cloud",
  "brain", "book-open", "graduation-cap", "search", "globe", "map-pin", "house", "building-2", "truck",
  "leaf", "zap", "flame", "sparkles", "megaphone", "bell", "puzzle", "layers", "flag", "gift", "smile",
].filter((n) => ICON_SET.has(n));

/** Смысловой индекс для одной embedding-модели (у разных моделей разные векторы). */
type Index = { vectors: Float32Array | null; dims: number; status: string; building: Promise<void> | null; lastFail: number };
const indexes = new Map<string, Index>();

const indexFor = (ctx: AiCtx): Index | null => {
  if (!ctx.embedId || !ctx.hasKey) return null;
  let ix = indexes.get(ctx.embedId);
  if (!ix) {
    ix = { vectors: null, dims: 0, status: "не построен", building: null, lastFail: 0 };
    indexes.set(ctx.embedId, ix);
  }
  return ix;
};

const normalize = (v: number[]) => {
  const n = Math.hypot(...v) || 1;
  return v.map((x) => x / n);
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function embed(ctx: AiCtx, texts: string[], kind: "query" | "document"): Promise<number[][]> {
  const input = ctx.def.nomicPrefixes ? texts.map((t) => `search_${kind}: ${t}`) : texts;
  for (let attempt = 0; ; attempt++) {
    try {
      // float явно: по умолчанию SDK просит base64, а LM Studio отдаёт массив чисел — получаются нули
      const res = await ctx.client.embeddings.create({ model: ctx.def.embedModel!, input, encoding_format: "float" });
      const out = res.data.map((d) => normalize(d.embedding as number[]));
      if (!out[0]?.some((x) => x !== 0)) throw new Error("embedding-модель вернула пустые векторы");
      return out;
    } catch (e) {
      // бесплатные тарифы ограничивают частоту — подождём и повторим
      if ((e as { status?: number }).status === 429 && attempt < 4) {
        await sleep(2000 * (attempt + 1));
        continue;
      }
      throw e;
    }
  }
}

const cacheFile = (embedId: string) => new URL(`../.cache/icons-${embedId.replace(/[^\w.-]+/g, "_")}-${ICON_NAMES.length}.bin`, import.meta.url);

/** Строит индекс в фоне (или читает из кэша). Облачным сервисам — пачками с паузами, чтобы не упереться в лимит. */
function startIndex(ctx: AiCtx, ix: Index): Promise<void> {
  if (ix.vectors) return Promise.resolve();
  if (ix.building) return ix.building;
  if (Date.now() - ix.lastFail < 60_000) return Promise.resolve();
  const embedId = ctx.embedId!;
  ix.building = (async () => {
    try {
      try {
        const buf = await readFile(cacheFile(embedId));
        ix.vectors = new Float32Array(buf.buffer, buf.byteOffset, buf.byteLength / 4);
        ix.dims = ix.vectors.length / ICON_NAMES.length;
        ix.status = "готов (из кэша)";
        return;
      } catch {
        /* кэша нет — строим */
      }
      ix.status = "строится…";
      const docs = ICON_NAMES.map((n) => `${n.replace(/-/g, " ")}: ${tags[n].join(", ")}`);
      const batch = ctx.def.cloud ? 96 : 128;
      const all: number[][] = [];
      for (let i = 0; i < docs.length; i += batch) {
        all.push(...(await embed(ctx, docs.slice(i, i + batch), "document")));
        if (ctx.def.cloud) await sleep(1100);
      }
      ix.dims = all[0].length;
      const flat = new Float32Array(all.length * ix.dims);
      all.forEach((v, i) => flat.set(v, i * ix.dims));
      ix.vectors = flat;
      await mkdir(new URL("../.cache/", import.meta.url), { recursive: true });
      await writeFile(cacheFile(embedId), Buffer.from(flat.buffer));
      ix.status = "готов";
    } catch (e) {
      ix.lastFail = Date.now();
      ix.status = `поиск по словам (индекс не построен: ${(e as Error).message.slice(0, 80)})`;
    } finally {
      ix.building = null;
    }
  })();
  return ix.building;
}

/** Локальный индекс ждём (из кэша это мгновенно), облачный строим в фоне — первые запросы идут поиском по словам. */
async function readyIndex(ctx: AiCtx): Promise<Index | null> {
  const ix = indexFor(ctx);
  if (!ix) return null;
  const job = startIndex(ctx, ix);
  if (!ctx.def.cloud) await job;
  return ix.vectors ? ix : null;
}

export function buildIndex(ctx: AiCtx): Promise<void> {
  const ix = indexFor(ctx);
  return ix ? startIndex(ctx, ix) : Promise.resolve();
}

export const iconStatus = (ctx: AiCtx) => {
  const ix = indexFor(ctx);
  if (!ctx.def.embeddings) return { total: ICON_NAMES.length, semantic: false, status: "по словам (у сервиса нет модели для иконок)" };
  return { total: ICON_NAMES.length, semantic: !!ix?.vectors, status: ix?.status ?? "не построен" };
};

/** Простое совпадение по имени и тегам — дополняет смысловой поиск и работает без него. */
function lexical(name: string, words: string[]): number {
  const parts = name.split("-");
  let s = 0;
  for (const w of words) {
    if (w.length < 2) continue;
    if (parts.includes(w)) s += 1;
    else if (name.includes(w)) s += 0.5;
    if (tags[name].some((t) => t === w)) s += 0.6;
    else if (tags[name].some((t) => t.startsWith(w))) s += 0.3;
  }
  return s;
}

const words = (q: string) => q.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);

/** Оценки всех иконок для каждого запроса (смысл + совпадение слов) за один вызов embedding-модели. */
async function scoreMany(ctx: AiCtx, queries: string[]): Promise<Float32Array[]> {
  const ix = await readyIndex(ctx);
  let qv: number[][] | null = null;
  if (ix) {
    try {
      qv = await embed(ctx, queries, "query");
    } catch {
      qv = null;
    }
  }
  return queries.map((q, qi) => {
    const w = words(q);
    const out = new Float32Array(ICON_NAMES.length);
    ICON_NAMES.forEach((name, i) => {
      let s = lexical(name, w) * (qv ? 0.06 : 1);
      if (qv && ix?.vectors) {
        let dot = 0;
        const off = i * ix.dims;
        const v = qv[qi];
        for (let k = 0; k < ix.dims; k++) dot += ix.vectors[off + k] * v[k];
        s += dot;
      }
      out[i] = s;
    });
    return out;
  });
}

function top(scores: Float32Array, limit: number): string[] {
  return Array.from(scores, (s, i) => [s, i] as const)
    .sort((a, b) => b[0] - a[0])
    .slice(0, limit)
    .map(([, i]) => ICON_NAMES[i]);
}

/** Поиск из интерфейса: русский запрос сначала переводится моделью. */
export async function searchIcons(ctx: AiCtx, query: string, limit = 48): Promise<{ icons: string[]; query: string; semantic: boolean }> {
  const q = query.trim();
  if (!q) return { icons: POPULAR.slice(0, limit), query: "", semantic: iconStatus(ctx).semantic };
  const exact = q.toLowerCase().replace(/\s+/g, "-");
  const english = /[а-яё]/i.test(q) ? await translateForIcons(ctx, q) : q;
  const [scores] = await scoreMany(ctx, [english]);
  const found = top(scores, limit);
  const icons = ICON_SET.has(exact) ? [exact, ...found.filter((n) => n !== exact)] : found;
  return { icons, query: english, semantic: iconStatus(ctx).semantic };
}

/** Подбирает иконку и 8 альтернатив для каждого пункта, стараясь не повторяться.
 *  Смешиваем запрос «все слова сразу» и «главное слово отдельно», чтобы второстепенное слово
 *  не перетягивало результат (иначе «chat, star» превращается в moon-star). */
export async function resolveIcons(ctx: AiCtx, keywordSets: string[][]): Promise<{ icon: string; options: string[] }[]> {
  const sets = keywordSets.map((k) => (k.length ? k : ["idea"]));
  const scores = await scoreMany(ctx, [...sets.map((k) => k.join(", ")), ...sets.map((k) => k[0])]);
  const used = new Set<string>();
  return sets.map((_, i) => {
    const all = scores[i];
    const main = scores[i + sets.length];
    const mixed = all.map((s, j) => 0.5 * s + 0.5 * main[j]);
    const options = top(mixed, 12);
    const icon = options.find((o) => !used.has(o)) ?? options[0] ?? "sparkles";
    used.add(icon);
    return { icon, options: [icon, ...options.filter((o) => o !== icon)].slice(0, 8) };
  });
}
