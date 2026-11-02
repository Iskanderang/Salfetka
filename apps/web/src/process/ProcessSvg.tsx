import { forwardRef, useId, useMemo, type ReactNode } from "react";
import type { ProcessGraph, ProcessNode } from "@napkin/shared";
import { Paint, DEFAULT_LOOK, type Look, type Spec } from "../render/paint";
import { Text } from "../render/primitives";
import { textHeight } from "../render/text";
import { lighten, tint, type Theme } from "../render/themes";
import type { StyleDef } from "../render/styles";
import { layoutProcess, type Dir, type PlacedEdge, type PlacedNode } from "./layout";

const PAD = 40;
const TASK_W = 168;

type Props = { process: ProcessGraph; dir?: Dir; theme: Theme; style: StyleDef; look?: Look; transparent?: boolean; className?: string };

/** Размеры фигур по тексту: задача растёт по высоте, развилка — по ширине. */
function sizer(p: Paint) {
  return (n: ProcessNode) => {
    if (n.type === "start" || n.type === "end") return { w: 44, h: 44 };
    if (n.type === "parallel") return { w: 56, h: 56 };
    if (n.type === "decision") {
      const f = p.fit(n.label, 104, 13, 3, p.labelWeight, 11);
      return { w: 150, h: Math.max(96, textHeight(f) * 1.9 + 24) };
    }
    const f = p.fit(n.label, TASK_W - 28, 15, 4, p.labelWeight, 12);
    return { w: TASK_W, h: Math.max(62, textHeight(f) + 30) + (n.type === "document" ? 10 : 0) };
  };
}

/** Схема процесса; готовую раскладку отдаёт наружу для выгрузки в .drawio. */
export function buildProcess(process: ProcessGraph, style: StyleDef, theme: Theme, look: Look, uid: string, dir: Dir = "h") {
  const p = new Paint(style, theme, { layouts: [], title: process.title, items: [] }, look, uid);
  const t = p.t;
  const kicker = p.premium ? "ПРОЦЕСС" : "";
  const titleFit = p.fit(process.title, 900, p.premium ? 38 : 30, 1, p.titleWeight, 22);
  const top = 44 + (kicker ? 22 : 0) + textHeight(titleFit) + 34;
  const L = layoutProcess(process, sizer(p), top, PAD, dir);
  const width = Math.max(L.width + PAD, 760);
  const height = L.height + PAD;
  const ink = p.sketchy ? p.lineColor : p.premium === "dark" ? tint("#FFFFFF", 0.55) : lighten(t.text, 0.25);

  const laneColor = (i: number) => p.color(i);
  const header = (
    <g data-title="1">
      {kicker && (
        <text x={PAD} y={50} fontSize={13} fontWeight={800} letterSpacing={2.6} fill={p.premium === "dark" ? lighten(p.color(0), 0.35) : p.color(0)}>
          {kicker}
        </text>
      )}
      <Text fit={titleFit} x={PAD} y={kicker ? 60 : 40} anchor="start" color={t.title} weight={p.titleWeight} />
      {p.marker(PAD, PAD + Math.min(700, titleFit.lines[0].length * titleFit.size * 0.52), (kicker ? 60 : 40) + textHeight(titleFit) + 4, p.color(3))}
    </g>
  );

  const lanes = process.lanes.length
    ? L.lanes.map((ln) => {
        const c = laneColor(ln.idx);
        const hd = ln.head;
        const head = p.fit(ln.name, hd.w - (dir === "h" ? 30 : 20), 14, dir === "h" ? 4 : 2, p.labelWeight, 11);
        // дорожка тянется до края схемы: в «h» — вправо, в «v» — вниз
        const w = dir === "h" ? width - PAD - ln.x : ln.w;
        const h = dir === "v" ? height - PAD / 2 - ln.y : ln.h;
        return (
          <g key={`lane${ln.idx}`} data-lane={ln.idx}>
            {p.rect(ln.x, ln.y, w, h, 12, { fill: p.sketchy ? "none" : tint(c, p.premium === "dark" ? 0.07 : 0.05), stroke: p.sketchy ? p.lineColor : tint(c, 0.3), sw: 1, on: "", onMuted: "", icon: "" })}
            {p.rect(hd.x, hd.y, hd.w, hd.h, 12, { ...p.spec("chip", c), filter: undefined })}
            <Text fit={head} x={hd.x + hd.w / 2} y={hd.y + hd.h / 2} valign="middle" color={p.spec("chip", c).on} weight={p.labelWeight} />
          </g>
        );
      })
    : null;

  const edges = L.edges.map((e, i) => drawEdge(p, e, i, ink));
  const nodes = L.nodes.map((n) => drawNode(p, n, laneColor(n.laneIdx), ink, dir));

  // фон считаем до <defs>: ночной градиент должен попасть в список определений
  const bgFill = p.premium === "dark" && !look.bg ? p.gradient("night", [[0, "#081225"], [1, "#0F2747"]], "down") : t.bg;
  return {
    layout: L,
    width,
    height,
    paint: p,
    bgFill,
    body: (
      <>
        {header}
        {lanes}
        {edges}
        {nodes}
      </>
    ),
  };
}

function arrow(p: Paint, [x, y]: [number, number], [px, py]: [number, number], color: string, key: string) {
  const a = Math.atan2(y - py, x - px);
  const s = 9;
  const pt = (dx: number, dy: number): [number, number] => [x + dx * Math.cos(a) - dy * Math.sin(a), y + dx * Math.sin(a) + dy * Math.cos(a)];
  return <g key={key}>{p.poly([pt(0, 0), pt(-s, -s * 0.55), pt(-s, s * 0.55)], { fill: color, stroke: p.sketchy ? color : "none", sw: 1, on: "", onMuted: "", icon: "" })}</g>;
}

function drawEdge(p: Paint, e: PlacedEdge, i: number, ink: string): ReactNode {
  const pts = e.points;
  const end = pts[pts.length - 1];
  const prev = pts[pts.length - 2];
  // наконечник стоит в конце, поэтому линия заканчивается чуть раньше
  const a = Math.atan2(end[1] - prev[1], end[0] - prev[0]);
  const stop: [number, number] = [end[0] - Math.cos(a) * 7, end[1] - Math.sin(a) * 7];
  const d = [...pts.slice(0, -1), stop].map((q, k) => `${k ? "L" : "M"}${q[0]},${q[1]}`).join(" ");
  const label = e.label.trim();
  const lf = label ? p.fit(label, 120, 12, 2, 600, 10) : null;
  return (
    <g key={`e${i}`} data-edge={e.to} data-back={e.back ? 1 : 0}>
      {p.sketchy ? p.curve(d, ink, 1.8, `l${i}`) : <path d={d} fill="none" stroke={ink} strokeWidth={1.8} strokeLinejoin="round" strokeDasharray={e.back ? "6 5" : undefined} />}
      {arrow(p, end, prev, ink, `a${i}`)}
      {lf && e.labelAt && (
        <g>
          {!p.sketchy && <rect x={e.labelAt[0] - 3} y={e.labelAt[1] - 11} width={Math.min(126, label.length * 6.6 + 8)} height={textHeight(lf) + 4} rx={4} fill={p.t.bg} opacity={0.9} />}
          <Text fit={lf} x={e.labelAt[0]} y={e.labelAt[1] - 10} anchor="start" color={p.t.muted} weight={600} />
        </g>
      )}
    </g>
  );
}

function drawNode(p: Paint, n: PlacedNode, c: string, ink: string, dir: Dir): ReactNode {
  const cx = n.x + n.w / 2;
  const cy = n.y + n.h / 2;
  if (n.type === "start" || n.type === "end") {
    const sp: Spec = n.type === "start" ? p.spec("accent", c) : { ...p.spec("chip", c), stroke: ink, sw: 4 };
    // подпись: в «h» под кружком, в «v» справа — там, где нет стрелок
    const lf = p.fit(n.label, dir === "h" ? 120 : 110, 12, dir === "h" ? 2 : 3, p.labelWeight, 10);
    return (
      <g key={n.id} data-node={n.id} data-rank={n.rank}>
        {p.circle(cx, cy, n.w / 2, sp)}
        {dir === "h" ? (
          <Text fit={lf} x={cx} y={n.y + n.h + 6} color={p.t.text} weight={p.labelWeight} />
        ) : (
          <Text fit={lf} x={n.x + n.w + 10} y={cy} valign="middle" anchor="start" color={p.t.text} weight={p.labelWeight} />
        )}
      </g>
    );
  }
  if (n.type === "decision" || n.type === "parallel") {
    const sp = p.spec(n.type === "parallel" ? "accent" : "chip", c);
    const dia: [number, number][] = [
      [cx, n.y],
      [n.x + n.w, cy],
      [cx, n.y + n.h],
      [n.x, cy],
    ];
    const lf = n.type === "decision" ? p.fit(n.label, 104, 13, 3, p.labelWeight, 11) : null;
    return (
      <g key={n.id} data-node={n.id} data-rank={n.rank}>
        {!p.sketchy && <polygon points={dia.map((q) => q.join(",")).join(" ")} fill={p.t.bg} />}
        {p.poly(dia, sp)}
        {lf ? (
          <Text fit={lf} x={cx} y={cy} valign="middle" color={sp.on} weight={p.labelWeight} />
        ) : (
          <>
            {p.line(cx - 11, cy, cx + 11, cy, sp.on, 3.5, undefined, "h")}
            {p.line(cx, cy - 11, cx, cy + 11, sp.on, 3.5, undefined, "v")}
          </>
        )}
      </g>
    );
  }
  const sp = p.spec("card", c);
  const lf = p.fit(n.label, TASK_W - 28, 15, 4, p.labelWeight, 12);
  const doc = n.type === "document";
  const h = n.h - (doc ? 10 : 0);
  const docPath = `M${n.x},${n.y} H${n.x + n.w} V${n.y + h} C${n.x + n.w * 0.75},${n.y + h - 12} ${n.x + n.w * 0.6},${n.y + h + 16} ${n.x + n.w * 0.35},${n.y + h + 8} C${n.x + n.w * 0.2},${n.y + h + 3} ${n.x + n.w * 0.1},${n.y + h + 6} ${n.x},${n.y + h + 8} Z`;
  return (
    <g key={n.id} data-node={n.id} data-rank={n.rank}>
      {!p.sketchy && !doc && <rect x={n.x} y={n.y} width={n.w} height={n.h} rx={p.r(12)} fill={p.t.bg} />}
      {doc ? p.path(docPath, sp, n.id, [n.x, n.y, 9]) : p.rect(n.x, n.y, n.w, n.h, 12, sp)}
      {!doc && p.rect(n.x, n.y + 10, 4, n.h - 20, 2, { fill: c, stroke: "none", sw: 0, on: "", onMuted: "", icon: "" })}
      <Text fit={lf} x={cx} y={n.y + h / 2} valign="middle" color={sp.on} weight={p.labelWeight} />
    </g>
  );
}

export const ProcessSvg = forwardRef<SVGSVGElement, Props>(
  ({ process, dir = "h", theme, style, look = DEFAULT_LOOK, transparent, className }, ref) => {
    const uid = "pr" + useId().replace(/[^\w]/g, "");
    const r = useMemo(() => buildProcess(process, style, theme, look, uid, dir), [process, style, theme, look, uid, dir]);
    return (
      <svg
        ref={ref}
        xmlns="http://www.w3.org/2000/svg"
        viewBox={`0 0 ${r.width} ${r.height}`}
        width={r.width}
        height={r.height}
        className={className}
        style={{ ["--proc-w" as string]: `${r.width}px` }}
        fontFamily={r.paint.font}
        fontWeight={r.paint.bodyWeight}
      >
        <defs>
          <filter id="nf-wobble" x="-10%" y="-10%" width="120%" height="120%">
            <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="7" />
            <feDisplacementMap in="SourceGraphic" scale="2.2" />
          </filter>
          {r.paint.defsNodes()}
        </defs>
        {!transparent && (
          <rect
            data-bg="1"
            width={r.width}
            height={r.height}
            fill={r.bgFill}
          />
        )}
        {r.body}
      </svg>
    );
  },
);
