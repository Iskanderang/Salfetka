import { useRef, useState, type MouseEvent as ReactMouseEvent } from "react";
import type { ProcessGraph } from "@napkin/shared";
import { ProcessSvg, buildProcess } from "./ProcessSvg";
import { toDrawio } from "./drawio";
import type { Dir } from "./layout";
import { Popover, TitleEditor } from "../Editor";
import { Ico } from "../render/primitives";
import { copyPng, download, slug, svgToPng, svgToString } from "../render/export";
import type { Look } from "../render/paint";
import type { StyleDef } from "../render/styles";
import type { Theme } from "../render/themes";

/** dir — ориентация: «h» слева направо, «v» сверху вниз */
export type ProcDoc = { id: string; process: ProcessGraph; source: string; at: number; dir?: Dir };

type Props = {
  doc: ProcDoc;
  theme: Theme;
  style: StyleDef;
  look: Look;
  lastMs: number | null;
  onChange: (process: ProcessGraph) => void;
  onDir: (dir: Dir) => void;
  onError: (msg: string) => void;
  onToast: (msg: string) => void;
  onOpenSide: () => void;
};

type Edit = { kind: "title" } | { kind: "node"; id: string };

/** Центр в режиме «Процессы»: панель действий, схема и правка подписей по клику. */
export function ProcessPane({ doc, theme, style, look, lastMs, onChange, onDir, onError, onToast, onOpenSide }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const [menu, setMenu] = useState(false);
  const [edit, setEdit] = useState<(Edit & { x: number; y: number }) | null>(null);
  const g = doc.process;
  const dir = doc.dir ?? "h";

  async function exportAs(kind: "svg" | "png" | "png-clear" | "copy" | "drawio") {
    setMenu(false);
    const svg = svgRef.current;
    if (!svg) return;
    const name = slug(g.title);
    try {
      if (kind === "drawio") {
        const b = buildProcess(g, style, theme, look, "x", dir);
        download(new Blob([toDrawio(g, b.layout, b.paint.t.palette, 40)], { type: "application/xml" }), `${name}.drawio`);
      }
      if (kind === "svg") download(new Blob([await svgToString(svg)], { type: "image/svg+xml" }), `${name}.svg`);
      if (kind === "png") download(await svgToPng(svg), `${name}.png`);
      if (kind === "png-clear") download(await svgToPng(svg, 2, true), `${name}-transparent.png`);
      if (kind === "copy") {
        await copyPng(svg);
        onToast("PNG скопирован в буфер");
      }
    } catch (e) {
      onError((e as Error).message);
    }
  }

  function onClick(e: ReactMouseEvent) {
    const box = boxRef.current?.getBoundingClientRect();
    if (!box) return;
    const t = e.target as Element;
    const node = t.closest("[data-node]");
    const title = t.closest("[data-title]");
    const x = Math.max(8, Math.min(e.clientX - box.left - 210, box.width - 428));
    const y = e.clientY - box.top + 14;
    if (node) setEdit({ kind: "node", id: node.getAttribute("data-node")!, x, y });
    else if (title) setEdit({ kind: "title", x, y });
    else setEdit(null);
  }

  const editing = edit?.kind === "node" ? g.nodes.find((n) => n.id === edit.id) : null;
  const stats = `${g.nodes.filter((n) => n.type !== "start" && n.type !== "end").length} шагов${g.lanes.length ? ` · ${g.lanes.length} исполн.` : ""}`;

  return (
    <>
      <div className="toolbar">
        <button className="side-toggle" onClick={onOpenSide}>
          <Ico name="panel-right" />
          Стиль
        </button>
        <div className="dir-switch" role="radiogroup" aria-label="Ориентация">
          <button role="radio" aria-checked={dir === "h"} className={dir === "h" ? "active" : ""} onClick={() => onDir("h")} title="Слева направо: исполнители — строки">
            <Ico name="arrow-right" size={15} />
            Слева направо
          </button>
          <button role="radio" aria-checked={dir === "v"} className={dir === "v" ? "active" : ""} onClick={() => onDir("v")} title="Сверху вниз: исполнители — колонки">
            <Ico name="arrow-down" size={15} />
            Сверху вниз
          </button>
        </div>
        <span className="muted small proc-stats">{stats}</span>
        <div className="actions">
          {lastMs !== null && <span className="muted small">{(lastMs / 1000).toFixed(1)} с</span>}
          <button onClick={() => exportAs("copy")} title="PNG в буфер обмена">
            <Ico name="copy" />
            Копировать
          </button>
          <div className="menu-wrap">
            <button className="primary sm" onClick={() => setMenu((o) => !o)}>
              <Ico name="download" />
              Скачать
              <Ico name="chevron-down" size={14} />
            </button>
            {menu && (
              <div className="menu" onMouseLeave={() => setMenu(false)}>
                <button onClick={() => exportAs("drawio")}>
                  <b>Draw.io (.drawio)</b>
                  <small>Редактируемая схема: откройте файл на app.diagrams.net или в Draw.io и правьте шаги, стрелки и дорожки.</small>
                </button>
                <button onClick={() => exportAs("png")}>
                  <b>PNG</b>
                  <small>Картинка в двойном разрешении — для документов, регламентов, писем.</small>
                </button>
                <button onClick={() => exportAs("png-clear")}>
                  <b>PNG без фона</b>
                  <small>Для слайдов PowerPoint, Keynote, Canva.</small>
                </button>
                <button onClick={() => exportAs("svg")}>
                  <b>SVG (вектор)</b>
                  <small>Чёткий при любом увеличении — для Figma, сайтов и печати.</small>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="preview proc-preview" ref={boxRef} onClick={onClick}>
        <div className="proc-scroll">
          <ProcessSvg ref={svgRef} process={g} dir={dir} theme={theme} style={style} look={look} className="svg-main proc-svg" />
        </div>
        {edit?.kind === "title" && (
          <Popover x={edit.x} y={edit.y} onClose={() => setEdit(null)} width={420}>
            <TitleEditor title={g.title} onChange={(title) => onChange({ ...g, title })} onClose={() => setEdit(null)} />
          </Popover>
        )}
        {editing && edit && (
          <Popover x={edit.x} y={edit.y} onClose={() => setEdit(null)} width={420}>
            <TitleEditor
              heading="Шаг процесса"
              title={editing.label}
              onChange={(label) => onChange({ ...g, nodes: g.nodes.map((n) => (n.id === editing.id ? { ...n, label } : n)) })}
              onClose={() => setEdit(null)}
            />
          </Popover>
        )}
      </div>
      <div className="hint center">Кликните по шагу или заголовку, чтобы поправить текст. Для перестановки шагов и стрелок скачайте .drawio</div>
    </>
  );
}
