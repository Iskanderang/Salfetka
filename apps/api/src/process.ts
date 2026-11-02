import type OpenAI from "openai";
import { zodToJsonSchema } from "zod-to-json-schema";
import { LlmProcessSchema, type LlmProcess, type ProcessGraph, type ProcessNode } from "@napkin/shared";
import type { AiCtx } from "./providers.js";
import { jsonCompletion } from "./llm.js";

const schema = zodToJsonSchema(LlmProcessSchema, { target: "openAi", $refStrategy: "none" });

const SYSTEM = `Ты — аналитик бизнес-процессов. Превращаешь описание процесса в граф для схемы, как в BPMN или Draw.io.
Опирайся только на текст: не добавляй шагов, ролей и условий, которых в тексте нет.
Правила:
- Пиши на языке текста. title — название процесса, до 6 слов.
- lanes — исполнители (люди, роли, отделы, системы), если они названы; иначе [].
- nodes: ровно один start в начале; end — каждое завершение процесса (их может быть несколько: «заявка одобрена», «отказ»).
  task — действие («Проверить заявку»); decision — проверка с вариантами («Сумма больше 100 тыс.?»);
  parallel — если несколько действий идут одновременно; document — документ, который создаётся или передаётся.
  label — 2–6 слов, действие глаголом или вопрос. lane — исполнитель этого шага из lanes.
- edges — переходы по порядку процесса. У decision минимум два выхода с подписями «да»/«нет» или условием.
  Возвраты назад («вернуть на доработку») — тоже переходы. Каждый узел, кроме start, должен иметь вход; кроме end — выход.`;

const EXAMPLE_USER =
  "Клиент оставляет заявку на сайте. Менеджер проверяет заявку. Если данных не хватает, менеджер запрашивает их у клиента, и клиент дополняет заявку. Если всё в порядке, бухгалтерия выставляет счёт, клиент оплачивает.";
const EXAMPLE_ASSISTANT: LlmProcess = {
  title: "Обработка заявки",
  lanes: ["Клиент", "Менеджер", "Бухгалтерия"],
  nodes: [
    { id: "n1", type: "start", label: "Заявка на сайте", lane: "Клиент" },
    { id: "n2", type: "task", label: "Проверить заявку", lane: "Менеджер" },
    { id: "n3", type: "decision", label: "Данных хватает?", lane: "Менеджер" },
    { id: "n4", type: "task", label: "Запросить данные", lane: "Менеджер" },
    { id: "n5", type: "task", label: "Дополнить заявку", lane: "Клиент" },
    { id: "n6", type: "document", label: "Выставить счёт", lane: "Бухгалтерия" },
    { id: "n7", type: "task", label: "Оплатить счёт", lane: "Клиент" },
    { id: "n8", type: "end", label: "Заказ оплачен", lane: "Клиент" },
  ],
  edges: [
    { from: "n1", to: "n2", label: "" },
    { from: "n2", to: "n3", label: "" },
    { from: "n3", to: "n4", label: "нет" },
    { from: "n4", to: "n5", label: "" },
    { from: "n5", to: "n2", label: "" },
    { from: "n3", to: "n6", label: "да" },
    { from: "n6", to: "n7", label: "" },
    { from: "n7", to: "n8", label: "" },
  ],
};

export async function textToProcess(ctx: AiCtx, text: string): Promise<LlmProcess> {
  const messages: OpenAI.ChatCompletionMessageParam[] = [
    { role: "system", content: SYSTEM },
    { role: "user", content: EXAMPLE_USER },
    { role: "assistant", content: JSON.stringify(EXAMPLE_ASSISTANT) },
    { role: "user", content: text },
  ];
  let lastError = "";
  for (let attempt = 0; attempt < 3; attempt++) {
    if (lastError) messages.push({ role: "user", content: `Ответ не прошёл проверку: ${lastError}. Исправь и верни JSON заново.` });
    const content = await jsonCompletion(ctx, { messages, schemaName: "process", schema, temperature: 0.2, seed: 42, maxTokens: 4000 });
    try {
      const parsed = LlmProcessSchema.safeParse(JSON.parse(content));
      if (parsed.success) return parsed.data;
      lastError = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    } catch {
      lastError = "невалидный JSON";
    }
    messages.push({ role: "assistant", content });
  }
  throw new Error(`Модель не вернула корректный процесс: ${lastError}`);
}

/**
 * Небольшие модели иногда теряют связи или путают типы. Чиним граф, чтобы схема всегда была связной:
 * один старт, у каждого шага есть вход и выход, у развилки — минимум два выхода.
 * Возвращает граф и список исправлений (для отладки и подсказки пользователю).
 */
export function repairProcess(raw: LlmProcess): { process: ProcessGraph; fixes: string[] } {
  const fixes: string[] = [];
  // уникальные id
  const seen = new Set<string>();
  const nodes: ProcessNode[] = raw.nodes.map((n, i) => {
    let id = n.id.trim() || `n${i + 1}`;
    while (seen.has(id)) id += "_";
    seen.add(id);
    return { ...n, id, label: n.label.trim() || "Шаг" };
  });
  // дорожки: только названные; шаг без своей дорожки — в дорожку предыдущего шага
  const lanes = [...new Set(raw.lanes.map((l) => l.trim()).filter(Boolean))];
  let prevLane = lanes[0] ?? "";
  for (const n of nodes) {
    if (!lanes.length) n.lane = "";
    else if (!lanes.includes(n.lane)) {
      const match = lanes.find((l) => l.toLowerCase() === n.lane.trim().toLowerCase());
      n.lane = match ?? prevLane;
    }
    prevLane = n.lane;
  }
  const ids = new Set(nodes.map((n) => n.id));
  const key = (a: string, b: string) => `${a}→${b}`;
  const edgeKeys = new Set<string>();
  const edges = raw.edges.filter((e) => {
    const ok = ids.has(e.from) && ids.has(e.to) && e.from !== e.to && !edgeKeys.has(key(e.from, e.to));
    if (ok) edgeKeys.add(key(e.from, e.to));
    else fixes.push(`убрана связь ${e.from}→${e.to}`);
    return ok;
  });
  const add = (from: string, to: string, label = "") => {
    if (edgeKeys.has(key(from, to))) return;
    edgeKeys.add(key(from, to));
    edges.push({ from, to, label });
  };
  const inDeg = (id: string) => edges.filter((e) => e.to === id).length;
  const outDeg = (id: string) => edges.filter((e) => e.from === id).length;

  // «завершение», из которого процесс идёт дальше («Заказ получен» → «Оставить отзыв»), — на самом деле шаг
  for (const n of nodes) {
    if (n.type === "end" && outDeg(n.id) > 0) {
      n.type = "task";
      fixes.push(`«${n.label}»: процесс продолжается — стало шагом`);
    }
  }
  // ровно один старт
  let starts = nodes.filter((n) => n.type === "start");
  if (!starts.length) {
    const first = nodes.find((n) => inDeg(n.id) === 0) ?? nodes[0];
    const start: ProcessNode = { id: "start", type: "start", label: "Начало", lane: first.lane };
    nodes.unshift(start);
    add(start.id, first.id);
    fixes.push("добавлено начало");
    starts = [start];
  }
  for (const s of starts.slice(1)) {
    s.type = "task";
    fixes.push(`лишнее начало «${s.label}» стало шагом`);
  }
  // шаги без входа — продолжение предыдущего по тексту шага
  nodes.forEach((n, i) => {
    if (i === 0 || n.type === "start" || inDeg(n.id) > 0) return;
    const prev = nodes.slice(0, i).reverse().find((p) => p.type !== "end") ?? nodes[0];
    add(prev.id, n.id);
    fixes.push(`«${n.label}» связан с «${prev.label}»`);
  });
  // из развилки два выхода с одной подписью («да» и «да») — это одновременные действия: вставляем «параллельно»
  for (const n of nodes.filter((x) => x.type === "decision")) {
    const out = edges.filter((e) => e.from === n.id);
    const groups = new Map<string, typeof out>();
    for (const e of out) groups.set(e.label.trim().toLowerCase(), [...(groups.get(e.label.trim().toLowerCase()) ?? []), e]);
    for (const [label, same] of groups) {
      if (same.length < 2) continue;
      const par: ProcessNode = { id: `${n.id}_par`, type: "parallel", label: "Одновременно", lane: n.lane };
      nodes.splice(nodes.indexOf(n) + 1, 0, par);
      for (const e of same) {
        edges.splice(edges.indexOf(e), 1);
        edgeKeys.delete(key(e.from, e.to));
        add(par.id, e.to);
      }
      add(n.id, par.id, same[0].label);
      fixes.push(`«${n.label}» → «${label}»: одновременные шаги через «параллельно»`);
    }
  }
  // развилка с одним выходом — это обычный шаг
  for (const n of nodes) {
    if ((n.type === "decision" || n.type === "parallel") && outDeg(n.id) < 2) {
      n.type = "task";
      fixes.push(`«${n.label}»: у развилки один выход — стала шагом`);
    }
  }
  // тупики — ведут к завершению
  const dead = nodes.filter((n) => n.type !== "end" && outDeg(n.id) === 0);
  if (dead.length) {
    let end = nodes.find((n) => n.type === "end");
    if (!end) {
      end = { id: "end", type: "end", label: "Конец", lane: dead[dead.length - 1].lane };
      nodes.push(end);
      fixes.push("добавлено завершение");
    }
    for (const d of dead) if (d.id !== end.id) add(d.id, end.id);
  }
  return { process: { title: raw.title.trim() || "Процесс", lanes, nodes, edges }, fixes };
}
