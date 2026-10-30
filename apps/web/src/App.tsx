import { useCallback, useEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from "react";
import { LAYOUTS, LAYOUT_LABELS, type HealthResponse, type Item, type Layout, type Visual } from "@napkin/shared";
import { health, visualize } from "./api";
import { VisualSvg } from "./render/VisualSvg";
import { THEMES } from "./render/themes";
import { STYLES, styleById } from "./render/styles";
import { Paint } from "./render/paint";
import { iconExists } from "./render/primitives";
import { copyPng, download, slug, svgToPng, svgToStory, svgToString } from "./render/export";
import { ItemEditor, Popover, TitleEditor } from "./Editor";

const SAMPLE = `Как запустить свой продукт с нуля.

Сначала исследуйте рынок: поговорите с 20 потенциальными клиентами и найдите их главную боль. Затем сделайте MVP за 2–4 недели — только ключевая функция, без лишнего. Найдите первых 10 платящих клиентов вручную. Соберите отзывы и улучшите продукт. И только после этого масштабируйтесь через маркетинг.

Из 10 000 посетителей сайта 2 000 регистрируются, 500 начинают пробный период, а 120 покупают подписку.

Офис против удалёнки. В офисе живое общение, чёткий режим и быстрые решения, но дорога съедает время. Удалёнка даёт гибкий график и экономию на дороге, но сложнее с коммуникацией и выгоранием.`;

type Doc = { id: string; visual: Visual; layout: Layout; source: string; at: number };
type Pop = { kind: "item"; index: number; x: number; y: number } | { kind: "title"; x: number; y: number } | null;

function useLocal<T>(key: string, init: T, fix: (v: T) => T = (v) => v) {
  const [v, setV] = useState<T>(() => {
    try {
      const s = localStorage.getItem(key);
      return s ? fix(JSON.parse(s) as T) : init;
    } catch {
      return init;
    }
  });
  useEffect(() => localStorage.setItem(key, JSON.stringify(v)), [key, v]);
  return [v, setV] as const;
}

/** Старые сохранения (до подбора иконок по смыслу) приводим к текущему формату. */
const fixHistory = (docs: Doc[]) =>
  docs
    .filter((d) => d?.visual?.items && LAYOUTS.includes(d.layout))
    .map((d) => ({
      ...d,
      visual: {
        ...d.visual,
        items: d.visual.items.map((it) => {
          const icon = iconExists(it.icon) ? it.icon : "sparkles";
          return { ...it, icon, iconOptions: it.iconOptions ?? [icon] };
        }),
      },
    }));

export function App() {
  const [text, setText] = useLocal("nf.text", SAMPLE);
  const [themeId, setThemeId] = useLocal("nf.theme", THEMES[0].id);
  const [styleId, setStyleId] = useLocal("nf.style", STYLES[0].id);
  const [history, setHistory] = useLocal<Doc[]>("nf.history", [], fixHistory);
  const [current, setCurrent] = useState<Doc | null>(history[0] ?? null);
  const [sel, setSel] = useState<[number, number]>([0, 0]);
  const [loading, setLoading] = useState<"" | "new" | "variant">("");
  const [error, setError] = useState("");
  const [lastMs, setLastMs] = useState<number | null>(null);
  const [status, setStatus] = useState<HealthResponse | null>(null);
  const [pop, setPop] = useState<Pop>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [toast, setToast] = useState("");
  const svgRef = useRef<SVGSVGElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);

  const theme = THEMES.find((t) => t.id === themeId) ?? THEMES[0];
  const style = styleById(styleId);
  const selected = text.slice(sel[0], sel[1]).trim();
  const source = selected || text.trim();

  useEffect(() => {
    health().then(setStatus);
    const id = setInterval(() => health().then(setStatus), 10000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const onSel = () => {
      const ta = textRef.current;
      if (ta && document.activeElement === ta) setSel([ta.selectionStart, ta.selectionEnd]);
    };
    document.addEventListener("selectionchange", onSel);
    return () => document.removeEventListener("selectionchange", onSel);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(""), 2200);
    return () => clearTimeout(id);
  }, [toast]);

  async function run(variant = false) {
    const src = variant ? current?.source : source;
    if (!src || loading) return;
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    setLoading(variant ? "variant" : "new");
    setError("");
    setPop(null);
    try {
      const res = await visualize(src, variant, ac.signal);
      const doc: Doc = { id: crypto.randomUUID(), visual: res.visual, layout: res.visual.layouts[0], source: src, at: Date.now() };
      setCurrent(doc);
      setHistory((h) => [doc, ...h].slice(0, 30));
      setLastMs(res.ms);
    } catch (e) {
      if ((e as Error).name !== "AbortError") setError((e as Error).message);
    } finally {
      setLoading("");
    }
  }

  const update = useCallback(
    (patch: Partial<Doc>) => {
      setCurrent((cur) => {
        if (!cur) return cur;
        const next = { ...cur, ...patch };
        setHistory((h) => h.map((d) => (d.id === next.id ? next : d)));
        return next;
      });
    },
    [setHistory],
  );

  const updateVisual = (fn: (v: Visual) => Visual) => current && update({ visual: fn(current.visual) });
  const setItem = (i: number, patch: Partial<Item>) =>
    updateVisual((v) => ({ ...v, items: v.items.map((it, j) => (j === i ? { ...it, ...patch } : it)) }));

  function moveItem(i: number, dir: -1 | 1) {
    updateVisual((v) => {
      const items = [...v.items];
      const j = i + dir;
      [items[i], items[j]] = [items[j], items[i]];
      return { ...v, items };
    });
    setPop((p) => (p && p.kind === "item" ? { ...p, index: i + dir } : p));
  }

  function addItem() {
    if (!current || current.visual.items.length >= 8) return;
    updateVisual((v) => ({ ...v, items: [...v.items, { label: "Новый пункт", text: "", icon: "sparkles", iconOptions: ["sparkles"], value: "", children: [] }] }));
    const box = previewRef.current?.getBoundingClientRect();
    setPop({ kind: "item", index: current.visual.items.length, x: box ? box.width / 2 - 180 : 20, y: 40 });
  }

  /** Клик по схеме: пункт → редактор пункта, заголовок → редактор заголовка. */
  function onPreviewClick(e: ReactMouseEvent) {
    const box = previewRef.current?.getBoundingClientRect();
    if (!box) return;
    const target = e.target as Element;
    const itemEl = target.closest("[data-item]");
    const titleEl = target.closest("[data-title]");
    const width = 360;
    const x = Math.max(8, Math.min(e.clientX - box.left - width / 2, box.width - width - 8));
    const y = e.clientY - box.top + 14;
    if (itemEl) setPop({ kind: "item", index: Number(itemEl.getAttribute("data-item")), x, y });
    else if (titleEl) setPop({ kind: "title", x, y });
    else setPop(null);
  }

  async function exportAs(kind: "svg" | "png" | "png-clear" | "story" | "copy") {
    const svg = svgRef.current;
    setExportOpen(false);
    if (!svg || !current) return;
    const name = slug(current.visual.title);
    try {
      if (kind === "svg") download(new Blob([await svgToString(svg)], { type: "image/svg+xml" }), `${name}.svg`);
      if (kind === "png") download(await svgToPng(svg), `${name}.png`);
      if (kind === "png-clear") download(await svgToPng(svg, 2, true), `${name}-transparent.png`);
      if (kind === "story") download(await svgToStory(svg, new Paint(style, theme, current.visual).t.bg), `${name}-story.png`);
      if (kind === "copy") {
        await copyPng(svg);
        setToast("PNG скопирован в буфер");
      }
    } catch (e) {
      setError((e as Error).message);
    }
  }

  const recommended = current?.visual.layouts ?? [];
  const ordered: Layout[] = [...recommended, ...LAYOUTS.filter((l) => !recommended.includes(l))];
  const paint = current ? new Paint(style, theme, current.visual) : null;

  return (
    <div className="app">
      <header className="top">
        <div className="logo">
          <span className="logo-mark">⚡</span> Napkin Free
        </div>
        <div className={`status ${status?.ok ? "ok" : "bad"}`} title={status?.error ?? `${status?.baseUrl} · иконки: ${status?.icons.status}`}>
          <span className="dot" />
          {status === null ? "проверка…" : status.ok ? `${status.model} · иконки: ${status.icons.semantic ? "по смыслу" : "по словам"}` : status.error}
        </div>
      </header>

      <main className="split">
        <section className="pane editor">
          <textarea
            ref={textRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) run();
            }}
            placeholder="Вставьте текст, выделите фрагмент и нажмите «Визуализировать»"
            spellCheck={false}
          />
          <div className="editor-bar">
            <span className="hint">{selected ? `Выделено: ${selected.length} симв.` : "Выделите фрагмент или визуализируйте весь текст"} · Ctrl+Enter</span>
            <button className="primary" onClick={() => run()} disabled={!!loading || !source || !status?.ok}>
              {loading === "new" ? "Думаю…" : selected ? "⚡ Визуализировать выделенное" : "⚡ Визуализировать всё"}
            </button>
          </div>
          {history.length > 0 && (
            <div className="history">
              <div className="history-head">
                <span>История</span>
                <button className="link" onClick={() => setHistory([])}>
                  очистить
                </button>
              </div>
              {history.map((d) => (
                <button
                  key={d.id}
                  className={`history-item ${current?.id === d.id ? "active" : ""}`}
                  onClick={() => {
                    setCurrent(d);
                    setPop(null);
                  }}
                >
                  <span>{d.visual.title}</span>
                  <small>{LAYOUT_LABELS[d.layout]}</small>
                </button>
              ))}
            </div>
          )}
        </section>

        <section className="pane canvas">
          {error && <div className="error">⚠ {error}</div>}
          {!current && !loading && (
            <div className="empty">
              <div className="empty-icon">🗒️ → 📊</div>
              <p>Выделите кусок текста слева и нажмите «Визуализировать».</p>
              <p className="muted">Модель подберёт раскладки и иконки по смыслу, а вы выберете стиль.</p>
            </div>
          )}
          {loading && (
            <div className="loading">
              <div className="spinner" /> {loading === "variant" ? "Ищу другой взгляд на тот же текст…" : "Модель раскладывает текст по полочкам…"}
            </div>
          )}
          {current && paint && (
            <>
              <div className="styles-row">
                {STYLES.map((s) => (
                  <button key={s.id} className={`style-card ${s.id === style.id ? "active" : ""}`} onClick={() => setStyleId(s.id)} title={s.hint}>
                    <div className="style-thumb">
                      <VisualSvg visual={current.visual} layout={current.layout} theme={theme} style={s} className="svg-thumb" />
                    </div>
                    <span>{s.name}</span>
                  </button>
                ))}
              </div>

              <div className="toolbar">
                <div className="themes" title={style.fixedTheme ? "У этого стиля своя палитра" : "Палитра"}>
                  {THEMES.map((t) => (
                    <button
                      key={t.id}
                      className={`swatch ${t.id === theme.id ? "active" : ""}`}
                      title={t.name}
                      disabled={!!style.fixedTheme}
                      style={{ background: `linear-gradient(135deg, ${t.palette[0]} 0 50%, ${t.palette[2]} 50% 100%)`, outlineColor: t.palette[0] }}
                      onClick={() => setThemeId(t.id)}
                    />
                  ))}
                </div>
                <div className="actions">
                  {lastMs !== null && <span className="muted small">{(lastMs / 1000).toFixed(1)} с</span>}
                  <button onClick={() => run(true)} disabled={!!loading} title="Тот же текст — другая подача">
                    {loading === "variant" ? "…" : "🔄 Ещё вариант"}
                  </button>
                  <button onClick={addItem} disabled={current.visual.items.length >= 8}>
                    + Пункт
                  </button>
                  <button onClick={() => exportAs("copy")}>Копировать</button>
                  <div className="menu-wrap">
                    <button className="primary-soft" onClick={() => setExportOpen((o) => !o)}>
                      Скачать ▾
                    </button>
                    {exportOpen && (
                      <div className="menu" onMouseLeave={() => setExportOpen(false)}>
                        <button onClick={() => exportAs("png")}>PNG</button>
                        <button onClick={() => exportAs("png-clear")}>PNG без фона</button>
                        <button onClick={() => exportAs("story")}>Сторис 1080×1920</button>
                        <button onClick={() => exportAs("svg")}>SVG (вектор)</button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="preview" ref={previewRef} onClick={onPreviewClick}>
                <VisualSvg ref={svgRef} visual={current.visual} layout={current.layout} theme={theme} style={style} className="svg-main" />
                {pop?.kind === "item" && current.visual.items[pop.index] && (
                  <Popover x={pop.x} y={pop.y} onClose={() => setPop(null)}>
                    <ItemEditor
                      item={current.visual.items[pop.index]}
                      index={pop.index}
                      count={current.visual.items.length}
                      palette={paint.t.palette}
                      autoColor={paint.t.palette[pop.index % paint.t.palette.length]}
                      colorLocked={!!style.fixedTheme}
                      onChange={(patch) => setItem(pop.index, patch)}
                      onMove={(dir) => moveItem(pop.index, dir)}
                      onDelete={() => {
                        updateVisual((v) => ({ ...v, items: v.items.filter((_, j) => j !== pop.index) }));
                        setPop(null);
                      }}
                      onClose={() => setPop(null)}
                    />
                  </Popover>
                )}
                {pop?.kind === "title" && (
                  <Popover x={pop.x} y={pop.y} onClose={() => setPop(null)} width={420}>
                    <TitleEditor title={current.visual.title} onChange={(title) => updateVisual((v) => ({ ...v, title }))} onClose={() => setPop(null)} />
                  </Popover>
                )}
              </div>
              <div className="hint center">Кликните по пункту или заголовку на схеме, чтобы поменять текст, иконку или цвет</div>

              <div className="variants">
                {ordered.map((l) => (
                  <button
                    key={l}
                    className={`variant ${l === current.layout ? "active" : ""}`}
                    onClick={() => {
                      update({ layout: l });
                      setPop(null);
                    }}
                  >
                    <div className="thumb">
                      <VisualSvg visual={current.visual} layout={l} theme={theme} style={style} className="svg-thumb" />
                    </div>
                    <span>
                      {recommended.includes(l) && <b className="star">★ </b>}
                      {LAYOUT_LABELS[l]}
                    </span>
                  </button>
                ))}
              </div>
            </>
          )}
        </section>
      </main>
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
