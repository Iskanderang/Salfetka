import { useCallback, useEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from "react";
import { LAYOUTS, LAYOUT_LABELS, PROVIDER_IDS, type AiSettings, type HealthResponse, type Item, type Layout, type ProviderInfo, type Visual } from "@napkin/shared";
import { health, providers as fetchProviders, setAiSettings, visualize } from "./api";
import { AiDialog } from "./AiDialog";
import { VisualSvg } from "./render/VisualSvg";
import { THEMES } from "./render/themes";
import { STYLES, styleById } from "./render/styles";
import { Paint, DEFAULT_LOOK, type Look } from "./render/paint";
import { iconExists } from "./render/primitives";
import { copyPng, download, slug, svgToPng, svgToString } from "./render/export";
import { ItemEditor, Popover, TitleEditor } from "./Editor";
import { Sidebar, type SideTab } from "./Sidebar";
import { Logo } from "./Logo";
import { Ico } from "./render/primitives";
import { initialUiTheme } from "./uiTheme";
import { Help, HELP_TABS, type HelpTab } from "./Help";

const SAMPLE = `Как запустить свой продукт с нуля.

Сначала исследуйте рынок: поговорите с 20 потенциальными клиентами и найдите их главную боль. Затем сделайте MVP за 2–4 недели — только ключевая функция, без лишнего. Найдите первых 10 платящих клиентов вручную. Соберите отзывы и улучшите продукт. И только после этого масштабируйтесь через маркетинг.

Из 10 000 посетителей сайта 2 000 регистрируются, 500 начинают пробный период, а 120 покупают подписку.

Офис против удалёнки. В офисе живое общение, чёткий режим и быстрые решения, но дорога съедает время. Удалёнка даёт гибкий график и экономию на дороге, но сложнее с коммуникацией и выгоранием.`;

type Doc = { id: string; visual: Visual; layout: Layout; source: string; at: number };

/** Этапы работы модели для экрана ожидания (реальный ответ приходит одним запросом — этапы идут по таймеру). */
const STAGES = ["Читаю текст", "Выбираю форму", "Подбираю иконки", "Рисую схему"];
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
  const [look, setLook] = useLocal<Look>("nf.look", DEFAULT_LOOK, (l) => ({ ...DEFAULT_LOOK, ...l }));
  const [current, setCurrent] = useState<Doc | null>(history[0] ?? null);
  const [sel, setSel] = useState<[number, number]>([0, 0]);
  const [loading, setLoading] = useState<"" | "new" | "variant">("");
  const [error, setError] = useState("");
  const [lastMs, setLastMs] = useState<number | null>(null);
  const [status, setStatus] = useState<HealthResponse | null>(null);
  const [pop, setPop] = useState<Pop>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [toast, setToast] = useState("");
  const [help, setHelp] = useState<HelpTab | null>(null);
  const [ai, setAi] = useLocal<AiSettings>("nf.ai", { provider: "local", keys: {}, models: {} }, (a) => ({
    provider: PROVIDER_IDS.includes(a.provider) ? a.provider : "local",
    keys: a.keys ?? {},
    models: a.models ?? {},
  }));
  const [aiOpen, setAiOpen] = useState(false);
  const [sideTab, setSideTab] = useLocal<SideTab>("nf.sideTab", "shape");
  const [leftCollapsed, setLeftCollapsed] = useLocal("nf.leftCollapsed", false);
  const [editorSize, setEditorSize] = useLocal("nf.editorSize", 14);
  // на узком экране боковая панель выезжает поверх по кнопке
  const [sideOpen, setSideOpen] = useState(false);
  const [stage, setStage] = useState(0);
  useEffect(() => {
    if (!loading) return setStage(0);
    setStage(0);
    // последний этап держим, пока модель не ответит
    const id = setInterval(() => setStage((st) => Math.min(STAGES.length - 1, st + 1)), 1500);
    return () => clearInterval(id);
  }, [loading]);
  const [uiTheme, setUiTheme] = useLocal<"light" | "dark">("nf.uiTheme", initialUiTheme());
  useEffect(() => {
    document.documentElement.dataset.theme = uiTheme;
  }, [uiTheme]);
  const [providerList, setProviderList] = useState<ProviderInfo[]>([]);
  // заголовки для API выставляем сразу при рендере, чтобы первый же запрос ушёл в выбранный сервис
  setAiSettings(ai);
  const svgRef = useRef<SVGSVGElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);

  const theme = THEMES.find((t) => t.id === themeId) ?? THEMES[0];
  const style = styleById(styleId);
  const selected = text.slice(sel[0], sel[1]).trim();
  const source = selected || text.trim();

  useEffect(() => {
    fetchProviders().then(setProviderList);
  }, []);

  // при смене сервиса/ключа/модели статус перепроверяется сразу
  useEffect(() => {
    setStatus(null);
    const t = setTimeout(() => health().then(setStatus), 400);
    const id = setInterval(() => health().then(setStatus), 10000);
    return () => {
      clearTimeout(t);
      clearInterval(id);
    };
  }, [ai]);


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

  /** Палитра перекрашивает всю схему: свои цвета пунктов сбрасываются, иначе они «прибиты» и не меняются. */
  /**
   * Палитра общая для всех схем, поэтому при её выборе сбрасываем свои цвета пунктов везде —
   * и в открытой схеме, и в «Истории». Иначе, открыв другую схему, снова видишь «прибитый» цвет.
   */
  function applyPalette(id: string) {
    setThemeId(id);
    const strip = (d: Doc): Doc =>
      d.visual.items.some((it) => it.color) ? { ...d, visual: { ...d.visual, items: d.visual.items.map(({ color: _c, ...it }) => it) } } : d;
    const hadOwn = history.some((d) => d.visual.items.some((it) => it.color)) || !!current?.visual.items.some((it) => it.color);
    setCurrent((c) => (c ? strip(c) : c));
    setHistory((h) => h.map(strip));
    if (hadOwn) setToast("Свои цвета пунктов сброшены — схемы в новой палитре");
  }

  /** Окно правки у пункта на схеме (после перерисовки, когда пункт уже на новом месте). */
  function openItemPop(index: number) {
    // таймер, а не requestAnimationFrame: тот не срабатывает в фоновой вкладке
    setTimeout(() => {
      const box = previewRef.current?.getBoundingClientRect();
      const el = previewRef.current?.querySelector(`.svg-main [data-item="${index}"]`)?.getBoundingClientRect();
      if (!box) return;
      const width = 360;
      const cx = el ? el.left + el.width / 2 - box.left : box.width / 2;
      const y = el ? el.top - box.top + Math.min(el.height, 120) : 40;
      setPop({ kind: "item", index, x: Math.max(8, Math.min(cx - width / 2, box.width - width - 8)), y });
    }, 30);
  }

  /** Переставить пункт сразу на нужное место (остальные сдвигаются). */
  function moveItem(from: number, to: number) {
    if (!current || to < 0 || to >= current.visual.items.length || to === from) return;
    updateVisual((v) => {
      const items = [...v.items];
      const [it] = items.splice(from, 1);
      items.splice(to, 0, it);
      return { ...v, items };
    });
    setPop((p) => (p && p.kind === "item" ? { ...p, index: to } : p));
  }

  /** Новый пункт на позицию at (0 — в начало) и сразу окно правки для него. */
  function insertItem(at: number) {
    setAddOpen(false);
    if (!current || current.visual.items.length >= 8) return;
    const fresh: Item = { label: "Новый пункт", text: "", icon: "sparkles", iconOptions: ["sparkles"], value: "", children: [] };
    updateVisual((v) => {
      const items = [...v.items];
      items.splice(at, 0, fresh);
      return { ...v, items };
    });
    openItemPop(at);
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

  async function exportAs(kind: "svg" | "png" | "png-clear" | "copy") {
    const svg = svgRef.current;
    setExportOpen(false);
    if (!svg || !current) return;
    const name = slug(current.visual.title);
    try {
      if (kind === "svg") download(new Blob([await svgToString(svg)], { type: "image/svg+xml" }), `${name}.svg`);
      if (kind === "png") download(await svgToPng(svg), `${name}.png`);
      if (kind === "png-clear") download(await svgToPng(svg, 2, true), `${name}-transparent.png`);
      if (kind === "copy") {
        await copyPng(svg);
        setToast("PNG скопирован в буфер");
      }
    } catch (e) {
      setError((e as Error).message);
    }
  }

  const recommended = current?.visual.layouts ?? [];
  const paint = current ? new Paint(style, theme, current.visual, look) : null;
  const shownLayout = current?.layout ?? "steps";
  const shownStyle = style;

  return (
    <div className="app">
      <header className="top">
        <div className="logo">
          <Logo size={60} />
          <span className="wordmark">Салфетка</span>
        </div>
        <button
          className={`ai-btn ${ai.provider === "local" ? "" : "cloud"}`}
          onClick={() => {
            if (!providerList.length) fetchProviders().then(setProviderList);
            setAiOpen(true);
          }}
          title="Где работает нейросеть"
        >
          <Ico name={ai.provider === "local" ? "cpu" : "cloud"} />
          {ai.provider === "local" ? "Своя видеокарта" : "OpenRouter"}
        </button>
        <nav className="help-nav">
          {HELP_TABS.map((t) => (
            <button key={t.id} className="help-btn" onClick={() => setHelp(t.id)}>
              <Ico name={t.icon} />
              {t.label}
            </button>
          ))}
        </nav>
        <button
          className="icon-btn theme-btn"
          onClick={() => setUiTheme((t) => (t === "dark" ? "light" : "dark"))}
          title={uiTheme === "dark" ? "Светлая тема" : "Тёмная тема"}
          aria-label="Переключить тему"
        >
          <Ico name={uiTheme === "dark" ? "sun" : "moon"} size={18} />
        </button>
        <div className={`status ${status?.ok ? "ok" : "bad"}`} title={status?.error ?? `${status?.baseUrl} · иконки: ${status?.icons.status}`}>
          <span className="dot" />
          {status === null ? "проверка…" : status.ok ? `${status.model} · иконки: ${status.icons.semantic ? "по смыслу" : "по словам"}` : "нет связи с нейросетью"}
        </div>
      </header>

      <main className={`workspace ${leftCollapsed ? "left-collapsed" : ""} ${sideOpen ? "side-open" : ""} ${current ? "" : "no-side"}`}>
        {leftCollapsed ? (
          <section className="pane editor collapsed">
            <button className="icon-btn" onClick={() => setLeftCollapsed(false)} title="Показать текст">
              <Ico name="panel-left-open" size={18} />
            </button>
            <button className="primary run-mini" onClick={() => run()} disabled={!!loading || !source || !status?.ok} title="Визуализировать (Ctrl+Enter)">
              {loading === "new" ? <span className="spinner small" /> : <Ico name="sparkles" size={18} />}
            </button>
            <span className="vertical-label">Текст</span>
          </section>
        ) : (
          <section className="pane editor">
            <div className="editor-head">
              <span>Текст</span>
              <div className="editor-tools">
                <button className="icon-btn" onClick={() => setEditorSize((v) => Math.max(11, v - 1))} disabled={editorSize <= 11} title="Мельче">
                  A−
                </button>
                <span className="muted small">{editorSize}</span>
                <button className="icon-btn" onClick={() => setEditorSize((v) => Math.min(20, v + 1))} disabled={editorSize >= 20} title="Крупнее">
                  A+
                </button>
                <button className="icon-btn" onClick={() => setLeftCollapsed(true)} title="Свернуть панель — больше места для схемы">
                  <Ico name="panel-left-close" size={18} />
                </button>
              </div>
            </div>
            <textarea
              ref={textRef}
              value={text}
              style={{ fontSize: editorSize }}
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
                {loading === "new" ? <span className="spinner small" /> : <Ico name="sparkles" />}
                {loading === "new" ? "Создаю схему…" : selected ? "Визуализировать выделенное" : "Визуализировать всё"}
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
        )}

        <section className="pane canvas">
          {status && !status.ok && (
            <div className="error">
              <Ico name="circle-alert" size={18} />
              <span>
              Нейросеть не отвечает: {status.error}{" "}
              {status.provider === "local" ? (
                <>
                  <button className="link" onClick={() => setHelp("install")}>
                    Как запустить →
                  </button>{" "}
                  или{" "}
                  <button className="link" onClick={() => setAiOpen(true)}>
                    работать через облако →
                  </button>
                </>
              ) : (
                <button className="link" onClick={() => setAiOpen(true)}>
                  Открыть настройки нейросети →
                </button>
              )}
              </span>
            </div>
          )}
          {error && (
            <div className="error">
              <Ico name="circle-alert" size={18} />
              <span>{error}</span>
            </div>
          )}
          {!current && !loading && (
            <div className="empty">
              <Logo size={150} />
              <h2>Превратите текст в схему</h2>
              <p className="muted">Выделите фрагмент слева и нажмите «Визуализировать». Модель подберёт форму и иконки по смыслу, а вы выберете стиль.</p>
            </div>
          )}
          {loading && (
            <div className="loading">
              <div className="spinner" />
              <div className="stages">
                {STAGES.map((st, i) => (
                  <span key={st} className={`stage ${i < stage ? "done" : i === stage ? "now" : ""}`}>
                    {i < stage && <Ico name="check" size={12} />}
                    {st}
                  </span>
                ))}
              </div>
            </div>
          )}
          {current && paint && (
            <>
              <div className="toolbar">
                <button className="side-toggle" onClick={() => setSideOpen(true)}>
                  <Ico name="panel-right" />
                  Форма и стиль
                </button>
                <div className="actions">
                  {lastMs !== null && <span className="muted small">{(lastMs / 1000).toFixed(1)} с</span>}
                  <button onClick={() => run(true)} disabled={!!loading} title="Тот же текст — другая подача">
                    {loading === "variant" ? <span className="spinner small" /> : <Ico name="refresh-cw" />}
                    Ещё вариант
                  </button>
                  <div className="menu-wrap">
                    <button
                      onClick={() => {
                        setPop(null);
                        setAddOpen((o) => !o);
                      }} disabled={current.visual.items.length >= 8} title={current.visual.items.length >= 8 ? "Максимум 8 пунктов" : "Добавить пункт в нужное место"}>
                      <Ico name="plus" />
                      Пункт
                      <Ico name="chevron-down" size={14} />
                    </button>
                    {addOpen && (
                      <div className="menu add-menu" onMouseLeave={() => setAddOpen(false)}>
                        <small className="menu-head">Куда добавить пункт?</small>
                        <button onClick={() => insertItem(0)}>
                          <b>В начало</b>
                        </button>
                        {current.visual.items.map((it, i) => (
                          <button key={i} onClick={() => insertItem(i + 1)}>
                            <span>
                              После <b>{i + 1}. {it.label}</b>
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <button onClick={() => exportAs("copy")} title="PNG в буфер обмена — вставьте Ctrl+V в чат, письмо или слайд">
                    <Ico name="copy" />
                    Копировать
                  </button>
                  <div className="menu-wrap">
                    <button className="primary sm" onClick={() => setExportOpen((o) => !o)}>
                      <Ico name="download" />
                      Скачать
                      <Ico name="chevron-down" size={14} />
                    </button>
                    {exportOpen && (
                      <div className="menu" onMouseLeave={() => setExportOpen(false)}>
                        <button onClick={() => exportAs("png")}>
                          <b>PNG</b>
                          <small>Обычная картинка в двойном разрешении. Для Word, Google Docs, соцсетей, мессенджеров и писем.</small>
                        </button>
                        <button onClick={() => exportAs("png-clear")}>
                          <b>PNG без фона</b>
                          <small>Прозрачный фон: схема ложится на любой цветной слайд. Для PowerPoint, Keynote, Canva, видеомонтажа.</small>
                        </button>
                        <button onClick={() => exportAs("svg")}>
                          <b>SVG (вектор)</b>
                          <small>Не теряет чёткость при любом увеличении, можно править. Для Figma, Illustrator, сайтов, печати; PowerPoint 365 тоже понимает.</small>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="preview" ref={previewRef} onClick={onPreviewClick}>
                <VisualSvg ref={svgRef} visual={current.visual} layout={shownLayout} theme={theme} style={shownStyle} look={look} className="svg-main" />
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
                      onMoveTo={(to) => moveItem(pop.index, to)}
                      onInsert={(at) => insertItem(at)}
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

            </>
          )}
        </section>

        {current && paint && (
          <Sidebar
            tab={sideTab}
            onTab={setSideTab}
            visual={current.visual}
            layout={current.layout}
            recommended={recommended}
            theme={theme}
            style={style}
            look={look}
            onLayout={(l) => {
              update({ layout: l });
              setPop(null);
              setSideOpen(false);
            }}
            onStyle={(id) => setStyleId(id)}
            onPalette={applyPalette}
            onLook={setLook}
            lookExtra={{
              autoColor: paint.base.text,
              colorIgnored: !!look.color && !paint.textColorApplied,
              autoBg: new Paint(style, theme, current.visual, { ...look, bg: undefined }).base.bg,
            }}
          />
        )}
        {sideOpen && <div className="side-backdrop" onClick={() => setSideOpen(false)} />}
      </main>
      {toast && <div className="toast">{toast}</div>}
      {help && <Help tab={help} onTab={setHelp} onClose={() => setHelp(null)} />}
      {aiOpen && (
        <AiDialog
          settings={ai}
          providers={providerList}
          onChange={setAi}
          onClose={() => setAiOpen(false)}
          onInstallHelp={() => {
            setAiOpen(false);
            setHelp("install");
          }}
        />
      )}
    </div>
  );
}
