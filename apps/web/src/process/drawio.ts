import type { ProcessGraph } from "@napkin/shared";
import { lighten } from "../render/themes";
import { LANE_HEAD, type ProcessLayout } from "./layout";

/**
 * Файл .drawio (mxGraph XML, без сжатия — Draw.io его открывает как есть).
 * Дорожки — контейнеры-«swimlane»: шаги лежат внутри и двигаются вместе с ними.
 * Стрелки Draw.io прокладывает сам (orthogonalEdgeStyle), поэтому после правок схема не разваливается.
 */
export function toDrawio(g: ProcessGraph, L: ProcessLayout, colors: string[], pad: number): string {
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const cells: string[] = ['<mxCell id="0" />', '<mxCell id="1" parent="0" />'];
  const width = L.width - pad;
  const laneId = (i: number) => `lane${i}`;
  const useLanes = g.lanes.length > 0;
  const H = L.dir === "h";
  if (useLanes) {
    for (const ln of L.lanes) {
      const c = colors[ln.idx % colors.length];
      // «h»: заголовок дорожки слева (horizontal=0), «v»: сверху
      const w = H ? width - pad : ln.w;
      const h = H ? ln.h : L.height - ln.y;
      cells.push(
        `<mxCell id="${laneId(ln.idx)}" value="${esc(ln.name)}" style="swimlane;horizontal=${H ? 0 : 1};startSize=${LANE_HEAD[L.dir]};fillColor=${lighten(c, 0.8)};strokeColor=${c};fontStyle=1;fontSize=14;rounded=1;arcSize=4;swimlaneFillColor=${lighten(c, 0.95)};" vertex="1" parent="1">` +
          `<mxGeometry x="${Math.round(ln.x)}" y="${Math.round(ln.y)}" width="${Math.round(w)}" height="${Math.round(h)}" as="geometry" /></mxCell>`,
      );
    }
  }
  // подпись кружков: под ними слева направо, справа — сверху вниз
  const labelPos = H ? "verticalLabelPosition=bottom;verticalAlign=top;" : "labelPosition=right;align=left;";
  for (const n of L.nodes) {
    const c = colors[n.laneIdx % colors.length];
    const base = `fillColor=${lighten(c, 0.88)};strokeColor=${c};fontSize=13;whiteSpace=wrap;html=1;`;
    const style =
      n.type === "start"
        ? `ellipse;fillColor=${c};strokeColor=${c};fontColor=#333333;${labelPos}fontSize=12;`
        : n.type === "end"
          ? `ellipse;fillColor=#FFFFFF;strokeColor=#333333;strokeWidth=4;${labelPos}fontSize=12;`
          : n.type === "decision"
            ? `rhombus;${base}`
            : n.type === "parallel"
              ? `rhombus;fillColor=${c};strokeColor=${c};fontColor=#FFFFFF;fontSize=22;fontStyle=1;`
              : n.type === "document"
                ? `shape=document;boundedLbl=1;size=0.18;${base}`
                : `rounded=1;arcSize=12;${base}`;
    const lane = useLanes ? L.lanes[n.laneIdx] : null;
    const x = lane ? n.x - lane.x : n.x;
    const y = lane ? n.y - lane.y : n.y;
    cells.push(
      `<mxCell id="${esc(n.id)}" value="${esc(n.type === "parallel" ? "+" : n.label)}" style="${style}" vertex="1" parent="${lane ? laneId(n.laneIdx) : "1"}">` +
        `<mxGeometry x="${Math.round(x)}" y="${Math.round(y)}" width="${Math.round(n.w)}" height="${Math.round(n.h - (n.type === "document" ? 10 : 0))}" as="geometry" /></mxCell>`,
    );
  }
  L.edges.forEach((e, i) => {
    cells.push(
      `<mxCell id="e${i}" value="${esc(e.label)}" style="edgeStyle=orthogonalEdgeStyle;rounded=1;html=1;endArrow=block;endFill=1;strokeColor=#555555;fontSize=12;${e.back ? "dashed=1;" : ""}" edge="1" parent="1" source="${esc(e.from)}" target="${esc(e.to)}">` +
        `<mxGeometry relative="1" as="geometry" /></mxCell>`,
    );
  });
  const title = esc(g.title);
  return (
    `<mxfile host="Salfetka" type="device">` +
    `<diagram name="${title}" id="salfetka">` +
    `<mxGraphModel dx="${Math.round(L.width)}" dy="${Math.round(L.height)}" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="0" pageScale="1" math="0" shadow="0">` +
    `<root>${cells.join("")}</root></mxGraphModel></diagram></mxfile>`
  );
}
