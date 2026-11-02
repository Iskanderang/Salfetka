import { useEffect, useState } from "react";
import { LAYOUT_LABELS, type Layout, type ProcessGraph, type Visual } from "@napkin/shared";
import { ProcessSvg } from "./process/ProcessSvg";
import { VisualSvg } from "./render/VisualSvg";
import { THEMES, type Theme } from "./render/themes";
import { STYLES, type StyleDef } from "./render/styles";
import type { Look } from "./render/paint";
import { LookPanel } from "./LookPanel";
import { categoryOf, visibleCategories } from "./catalog";
import { Ico } from "./render/primitives";

export type SideTab = "shape" | "style" | "text";

type Props = {
  tab: SideTab;
  onTab: (t: SideTab) => void;
  visual: Visual;
  layout: Layout;
  recommended: Layout[];
  theme: Theme;
  style: StyleDef;
  look: Look;
  onLayout: (l: Layout) => void;
  onStyle: (id: string) => void;
  onPalette: (id: string) => void;
  onLook: (l: Look) => void;
  lookExtra: { autoColor: string; colorIgnored: boolean; autoBg: string };
  /** Режим «Процессы»: формы не нужны, миниатюры стилей — по процессу */
  process?: ProcessGraph;
  processDir?: "h" | "v";
};

const TABS: { id: SideTab; label: string }[] = [
  { id: "shape", label: "Форма" },
  { id: "style", label: "Стиль" },
  { id: "text", label: "Аа Текст" },
];

/** Правая панель: форма, стиль и оформление. Прокручивается отдельно — схема в центре стоит на месте. */
export function Sidebar(p: Props) {
  const [openCat, setOpenCat] = useState(() => categoryOf(p.layout));

  // при выборе формы из «Советует модель» раскрываем её категорию
  useEffect(() => setOpenCat((c) => (visibleCategories().find((x) => x.id === c)?.layouts.includes(p.layout) ? c : categoryOf(p.layout))), [p.layout]);

  const thumb = (l: Layout, key: string) => (
    <button
      key={key}
      className={`shape-card ${l === p.layout ? "active" : ""}`}
      onClick={() => p.onLayout(l)}
      title={LAYOUT_LABELS[l]}
    >
      <div className="shape-thumb">
        <VisualSvg visual={p.visual} layout={l} theme={p.theme} style={p.style} look={p.look} className="svg-thumb" />
      </div>
      <span>
        {p.recommended.includes(l) && <span className="star" title="Советует модель"><Ico name="star" size={13} /></span>}
        {LAYOUT_LABELS[l]}
      </span>
    </button>
  );

  return (
    <aside className="sidebar">
      <div className="side-tabs">
        {TABS.filter((t) => !(p.process && t.id === "shape")).map((t) => (
          <button key={t.id} className={t.id === p.tab ? "active" : ""} onClick={() => p.onTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      <div className={`palette-strip ${p.style.fixedTheme ? "locked" : ""}`}>
        <span className="palette-label">{p.style.fixedTheme ? `Палитра — у «${p.style.name}» своя` : `Палитра · ${p.theme.name}`}</span>
        <div className="palette-buttons">
          {THEMES.map((t) => (
            <button
              key={t.id}
              className={`palette-btn ${t.id === p.theme.id ? "active" : ""}`}
              disabled={!!p.style.fixedTheme}
              onClick={() => p.onPalette(t.id)}
              title={`${t.name} — сбросит свои цвета пунктов`}
              aria-label={`Палитра ${t.name}`}
              style={{ background: `conic-gradient(${t.palette[0]} 0 25%, ${t.palette[1]} 0 50%, ${t.palette[2]} 0 75%, ${t.palette[3]} 0 100%)` }}
            />
          ))}
        </div>
      </div>

      <div className="side-body">
        {p.tab === "shape" && !p.process && (
          <>
            {p.recommended.length > 0 && (
              <section className="side-section">
                <div className="side-head">
                  <span className="star"><Ico name="sparkles" size={14} /></span> Советует модель
                </div>
                <div className="shape-grid">{p.recommended.map((l) => thumb(l, `rec-${l}`))}</div>
              </section>
            )}
            {visibleCategories().map((c) => {
              const open = c.id === openCat;
              return (
                <section key={c.id} className={`cat ${open ? "open" : ""}`}>
                  <button className="cat-head" onClick={() => setOpenCat(open ? "" : c.id)} aria-expanded={open}>
                    <span className="cat-icon"><Ico name={c.icon} size={18} /></span>
                    <span className="cat-name">{c.name}</span>
                    {c.layouts.includes(p.layout) && <span className="cat-dot" title="Здесь выбранная форма" />}
                    <span className="cat-count">{c.layouts.length}</span>
                    <span className="cat-chevron"><Ico name="chevron-right" size={16} /></span>
                  </button>
                  {open && <div className="shape-grid">{c.layouts.map((l) => thumb(l, `${c.id}-${l}`))}</div>}
                </section>
              );
            })}
          </>
        )}

        {(p.tab === "style" || (p.process && p.tab === "shape")) && (
          <>
            <section className="side-section">
              <div className="side-head">Стиль</div>
              <div className="shape-grid">
                {STYLES.map((s) => (
                  <button
                    key={s.id}
                    className={`shape-card ${s.id === p.style.id ? "active" : ""}`}
                    onClick={() => p.onStyle(s.id)}
                    title={s.hint}
                  >
                    <div className="shape-thumb">
                      {p.process ? (
                        <ProcessSvg process={p.process} dir={p.processDir} theme={p.theme} style={s} look={p.look} className="svg-thumb" />
                      ) : (
                        <VisualSvg visual={p.visual} layout={p.layout} theme={p.theme} style={s} look={p.look} className="svg-thumb" />
                      )}
                    </div>
                    <span>
                      {s.name} <small className="muted">· {s.hint}</small>
                    </span>
                  </button>
                ))}
              </div>
            </section>
          </>
        )}

        {p.tab === "text" && (
          <LookPanel look={p.look} onChange={p.onLook} style={p.style} autoColor={p.lookExtra.autoColor} colorIgnored={p.lookExtra.colorIgnored} autoBg={p.lookExtra.autoBg} />
        )}
      </div>
    </aside>
  );
}
