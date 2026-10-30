import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { client, config, translateForIcons } from "./llm.js";

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

let vectors: Float32Array | null = null;
let dims = 0;
let status = "не построен";
let building: Promise<void> | null = null;
let lastFail = 0;

const normalize = (v: number[]) => {
  const n = Math.hypot(...v) || 1;
  return v.map((x) => x / n);
};

async function embed(texts: string[]): Promise<number[][]> {
  // float явно: по умолчанию SDK просит base64, а LM Studio отдаёт массив чисел — получаются нули
  const res = await client.embeddings.create({ model: config.embedModel, input: texts, encoding_format: "float" });
  const out = res.data.map((d) => normalize(d.embedding as number[]));
  if (!out[0]?.some((x) => x !== 0)) throw new Error("embedding-модель вернула пустые векторы");
  return out;
}

const cacheFile = () =>
  new URL(`../.cache/icons-${config.embedModel.replace(/[^\w.-]+/g, "_")}-${ICON_NAMES.length}.bin`, import.meta.url);

/** Строит (или читает из кэша) смысловой индекс иконок. ~20 с при первом запуске. */
export function buildIndex(): Promise<void> {
  if (vectors) return Promise.resolve();
  if (building) return building;
  if (Date.now() - lastFail < 60_000) return Promise.resolve();
  building = (async () => {
    try {
      try {
        const buf = await readFile(cacheFile());
        vectors = new Float32Array(buf.buffer, buf.byteOffset, buf.byteLength / 4);
        dims = vectors.length / ICON_NAMES.length;
        status = "готов (из кэша)";
        return;
      } catch {
        /* кэша нет — строим */
      }
      status = "строится…";
      const docs = ICON_NAMES.map((n) => `search_document: ${n.replace(/-/g, " ")}: ${tags[n].join(", ")}`);
      const all: number[][] = [];
      for (let i = 0; i < docs.length; i += 128) all.push(...(await embed(docs.slice(i, i + 128))));
      dims = all[0].length;
      const flat = new Float32Array(all.length * dims);
      all.forEach((v, i) => flat.set(v, i * dims));
      vectors = flat;
      await mkdir(new URL("../.cache/", import.meta.url), { recursive: true });
      await writeFile(cacheFile(), Buffer.from(flat.buffer));
      status = "готов";
    } catch (e) {
      lastFail = Date.now();
      status = `поиск по словам (нет embedding-модели: ${(e as Error).message.slice(0, 80)})`;
    } finally {
      building = null;
    }
  })();
  return building;
}

export const iconStatus = () => ({ total: ICON_NAMES.length, semantic: !!vectors, status });

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
async function scoreMany(queries: string[]): Promise<Float32Array[]> {
  await buildIndex();
  let qv: number[][] | null = null;
  if (vectors) {
    try {
      qv = await embed(queries.map((q) => `search_query: ${q}`));
    } catch {
      qv = null;
    }
  }
  return queries.map((q, qi) => {
    const w = words(q);
    const out = new Float32Array(ICON_NAMES.length);
    ICON_NAMES.forEach((name, i) => {
      let s = lexical(name, w) * (qv ? 0.06 : 1);
      if (qv && vectors) {
        let dot = 0;
        const off = i * dims;
        const v = qv[qi];
        for (let k = 0; k < dims; k++) dot += vectors[off + k] * v[k];
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

async function rankMany(queries: string[], limit: number): Promise<string[][]> {
  return (await scoreMany(queries)).map((s) => top(s, limit));
}

/** Поиск из интерфейса: русский запрос сначала переводится локальной моделью. */
export async function searchIcons(query: string, limit = 48): Promise<{ icons: string[]; query: string; semantic: boolean }> {
  const q = query.trim();
  if (!q) return { icons: POPULAR.slice(0, limit), query: "", semantic: !!vectors };
  const exact = q.toLowerCase().replace(/\s+/g, "-");
  const english = /[а-яё]/i.test(q) ? await translateForIcons(q) : q;
  const [found] = await rankMany([english], limit);
  const icons = ICON_SET.has(exact) ? [exact, ...found.filter((n) => n !== exact)] : found;
  return { icons, query: english, semantic: !!vectors };
}

/** Подбирает иконку и 8 альтернатив для каждого пункта, стараясь не повторяться.
 *  Смешиваем запрос «все слова сразу» и «главное слово отдельно», чтобы второстепенное слово
 *  не перетягивало результат (иначе «chat, star» превращается в moon-star). */
export async function resolveIcons(keywordSets: string[][]): Promise<{ icon: string; options: string[] }[]> {
  const sets = keywordSets.map((k) => (k.length ? k : ["idea"]));
  const scores = await scoreMany([...sets.map((k) => k.join(", ")), ...sets.map((k) => k[0])]);
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
