import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { flushSync } from "react-dom";
import { LAYOUT_LABELS, type Layout, type ProcessGraph, type Visual } from "@napkin/shared";
import { VisualSvg } from "../render/VisualSvg";
import { ProcessSvg } from "../process/ProcessSvg";
import { THEMES } from "../render/themes";
import { styleById } from "../render/styles";
import { TelegramIcon } from "../ChannelTip";
import { CATEGORIES } from "../catalog";
import data from "./data.json";

/**
 * Рекламный ролик «Салфетки» — около 40 секунд, 1920×1080.
 * Время задаётся снаружи (window.__setTime): каждый кадр рисуется детерминированно,
 * поэтому запись покадрово даёт ровное видео. ?play — проигрывание в реальном времени, ?t=12 — стоп-кадр.
 */

export const DURATION = 39.5;
/** На сколько сдвинуты сцены после «сетки форм» (её вставили после смены форм) */
export const GRID_SHIFT = 4.2;
export const visual = data.visual as Visual;
const process = data.process as ProcessGraph;
export const theme = THEMES[0];
export const FONT = '"Manrope", "Segoe UI", sans-serif';
export const BLUE = "#258DE8";

// ─── Время и плавность ───────────────────────────────────────
export const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const prog = (t: number, a: number, b: number) => clamp((t - a) / (b - a));
export const eOut = (x: number) => 1 - Math.pow(1 - x, 3);
export const eInOut = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
export const eBack = (x: number) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return x <= 0 ? 0 : 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
};
/** Видимость сцены: плавно появляется в начале и уходит в конце */
export const vis = (t: number, a: number, b: number, f = 0.45) => Math.min(eOut(prog(t, a, a + f)), 1 - eInOut(prog(t, b - f, b)));

// ─── Общие детали ────────────────────────────────────────────
export function Scene({ t, a, b, children, style }: { t: number; a: number; b: number; children: ReactNode; style?: CSSProperties }) {
  const v = vis(t, a, b);
  if (v <= 0.001) return null;
  return <div style={{ position: "absolute", inset: 0, opacity: v, ...style }}>{children}</div>;
}

export function Caption({ t, a, b, children, bottom = 64, size = 46 }: { t: number; a: number; b: number; children: ReactNode; bottom?: number; size?: number }) {
  const v = vis(t, a, b, 0.35);
  if (v <= 0.001) return null;
  const y = (1 - eOut(prog(t, a, a + 0.55))) * 28;
  return (
    <div style={{ position: "absolute", left: 0, right: 0, bottom, display: "flex", justifyContent: "center", opacity: v, transform: `translateY(${y}px)` }}>
      <div style={{ font: `800 ${size}px ${FONT}`, textAlign: "center", maxWidth: "88%", color: "#fff", letterSpacing: "-0.5px", padding: "14px 34px", borderRadius: 999, background: "rgba(10,20,40,0.55)", border: "1px solid rgba(255,255,255,0.14)", backdropFilter: "blur(8px)" }}>
        {children}
      </div>
    </div>
  );
}

/** Белая карточка-«окно» со схемой */
export function Card({ x, y, w, h, children, style }: { x: number; y: number; w: number; h: number; children: ReactNode; style?: CSSProperties }) {
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: w,
        height: h,
        borderRadius: 28,
        background: "#fff",
        boxShadow: "0 40px 90px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,255,255,0.08)",
        overflow: "hidden",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export const fill: CSSProperties = { width: "100%", height: "100%", display: "block" };

/** Появление пунктов схемы по одному: пружинка + прозрачность */
export function usePop(ref: React.RefObject<HTMLDivElement>, t: number, start: number, step: number, sel = "[data-item]") {
  useLayoutEffect(() => {
    const root = ref.current;
    if (!root) return;
    const title = root.querySelector<SVGGElement>("[data-title]");
    if (title) title.style.opacity = String(eOut(prog(t, start - 0.4, start)));
    root.querySelectorAll<SVGGElement>(sel).forEach((el, i) => {
      const k = eBack(prog(t, start + i * step, start + i * step + 0.5));
      el.style.transformBox = "fill-box";
      el.style.transformOrigin = "center";
      el.style.opacity = String(clamp(k * 1.5));
      el.style.transform = `scale(${0.35 + 0.65 * k})`;
    });
  });
}

// ─── Фон: ночное небо бренда с медленным свечением ───────────
export function Backdrop({ t }: { t: number }) {
  const gx = 30 + Math.sin(t * 0.25) * 8;
  const gy = 18 + Math.cos(t * 0.2) * 6;
  return (
    <div style={{ position: "absolute", inset: 0, background: "linear-gradient(160deg, #071022 0%, #0B1A33 55%, #10294B 100%)" }}>
      <div style={{ position: "absolute", inset: 0, background: `radial-gradient(900px 600px at ${gx}% ${gy}%, rgba(37,141,232,0.28), transparent 70%)` }} />
      <div style={{ position: "absolute", inset: 0, background: `radial-gradient(800px 600px at ${85 - gx * 0.3}% ${90 - gy}%, rgba(124,92,255,0.18), transparent 70%)` }} />
    </div>
  );
}

// ─── Сцена 1: логотип ────────────────────────────────────────
function Intro({ t }: { t: number }) {
  const k = eBack(prog(t, 0.1, 1.1));
  const blur = (1 - eOut(prog(t, 0.1, 0.9))) * 14;
  const word = "Салфетка";
  return (
    <Scene t={t} a={0} b={3.3}>
      <div style={{ position: "absolute", left: 0, right: 0, top: 210, display: "flex", flexDirection: "column", alignItems: "center" }}>
        <img src="/brand/logo-dark.png" alt="" style={{ height: 300, transform: `scale(${0.55 + 0.45 * k}) translateY(${(1 - k) * 30}px)`, filter: `blur(${blur}px) drop-shadow(0 20px 60px rgba(37,141,232,0.45))` }} />
        <div style={{ display: "flex", marginTop: 26, font: `800 132px ${FONT}`, color: "#fff", letterSpacing: "-3px" }}>
          {[...word].map((ch, i) => {
            const q = eOut(prog(t, 0.7 + i * 0.06, 1.2 + i * 0.06));
            return (
              <span key={i} style={{ display: "inline-block", opacity: q, transform: `translateY(${(1 - q) * 46}px)` }}>
                {ch}
              </span>
            );
          })}
        </div>
        <div style={{ marginTop: 18, font: `600 46px ${FONT}`, color: "#A9C6E4", opacity: eOut(prog(t, 1.6, 2.2)), transform: `translateY(${(1 - eOut(prog(t, 1.6, 2.2))) * 20}px)` }}>
          Текст <span style={{ color: BLUE }}>→</span> схема за секунды
        </div>
      </div>
    </Scene>
  );
}

// ─── Сцена 2: текст → схема ──────────────────────────────────
function TextToVisual({ t }: { t: number }) {
  const ref = useRef<HTMLDivElement>(null);
  usePop(ref, t, 6.7, 0.25);
  const full = data.text;
  const typed = Math.floor(full.length * eInOut(prog(t, 3.4, 5.3)));
  const sel0 = full.indexOf("Сначала");
  const sel1 = sel0 + Math.floor((full.length - sel0) * eOut(prog(t, 5.4, 5.95)));
  const shown = full.slice(0, typed);
  const press = prog(t, 6.15, 6.35) - prog(t, 6.35, 6.55);
  const cur = eInOut(prog(t, 5.6, 6.15));
  const cx = 520 - 210 * cur;
  const cy = 600 + 222 * cur;
  const right = eOut(prog(t, 6.35, 6.9));
  return (
    <Scene t={t} a={3.0} b={8.7}>
      <Card x={110} y={150} w={660} h={760} style={{ transform: `translateY(${(1 - eOut(prog(t, 3.0, 3.6))) * 40}px)` }}>
        <div style={{ padding: "26px 32px 0", font: `700 18px ${FONT}`, color: "#64748B", letterSpacing: "1.5px" }}>ТЕКСТ</div>
        <div style={{ padding: "16px 32px", font: `500 25px/1.55 ${FONT}`, color: "#1E293B", whiteSpace: "pre-wrap", height: 540 }}>
          {shown.slice(0, Math.min(sel0, typed))}
          <span style={{ background: "rgba(37,141,232,0.2)", borderRadius: 4 }}>{shown.slice(sel0, Math.max(sel0, Math.min(sel1, typed)))}</span>
          {shown.slice(Math.max(sel0, Math.min(sel1, typed)))}
          {t < 5.4 && <span style={{ display: "inline-block", width: 3, height: 30, background: BLUE, verticalAlign: "middle", opacity: Math.floor(t * 3) % 2 ? 1 : 0 }} />}
        </div>
        <div
          style={{
            position: "absolute",
            left: 32,
            right: 32,
            bottom: 36,
            height: 74,
            borderRadius: 16,
            background: BLUE,
            color: "#fff",
            font: `700 28px ${FONT}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 12,
            transform: `scale(${1 - press * 0.06})`,
            boxShadow: `0 ${12 - press * 8}px 30px rgba(37,141,232,0.4)`,
          }}
        >
          ✦ Визуализировать
        </div>
        {t > 5.5 && t < 6.9 && (
          <svg width="40" height="48" viewBox="0 0 20 24" style={{ position: "absolute", left: cx, top: cy, filter: "drop-shadow(0 3px 4px rgba(0,0,0,0.35))" }}>
            <path d="M1 1 L1 19 L6 14.5 L9.5 22 L12.5 20.6 L9 13.4 L16 13.4 Z" fill="#fff" stroke="#0B1220" strokeWidth="1.4" strokeLinejoin="round" />
          </svg>
        )}
      </Card>
      <Card x={830} y={150} w={980} h={760} style={{ opacity: right, transform: `translateX(${(1 - right) * 60}px) scale(${0.96 + 0.04 * right})` }}>
        <div ref={ref} style={{ ...fill, padding: 10, boxSizing: "border-box" }}>
          <VisualSvg visual={visual} layout={visual.layouts[0]} theme={theme} style={styleById("flat")} className="promo-svg" />
        </div>
      </Card>
      <Caption t={t} a={6.8} b={8.6}>
        Вставили текст — получили схему
      </Caption>
    </Scene>
  );
}

// ─── Сцена 3: 43 формы ───────────────────────────────────────
export const SHAPES: Layout[] = ["roadmap", "mountains", "iceberg", "target", "rocket", "stairs"];
export const SHAPE_T0 = 8.8;
export const SHAPE_DUR = 0.95;
function Shapes({ t }: { t: number }) {
  const n = Math.round(43 * eOut(prog(t, 8.9, 10.4)));
  return (
    <Scene t={t} a={8.5} b={14.6}>
      <div style={{ position: "absolute", left: 120, top: 150, color: "#fff", font: `800 200px/1 ${FONT}`, letterSpacing: "-6px" }}>{n}</div>
      <div style={{ position: "absolute", left: 128, top: 360, color: "#A9C6E4", font: `700 44px ${FONT}` }}>форм</div>
      <div style={{ position: "absolute", left: 128, top: 430, color: "#7E95B5", font: `500 28px/1.5 ${FONT}`, width: 420 }}>
        шаги, сравнение, воронка,
        <br />
        айсберг, горы, ракета…
      </div>
      {SHAPES.map((l, k) => {
        const a = SHAPE_T0 + k * SHAPE_DUR;
        const last = k === SHAPES.length - 1;
        const o = Math.min(eOut(prog(t, a, a + 0.28)), last ? 1 : 1 - eInOut(prog(t, a + SHAPE_DUR, a + SHAPE_DUR + 0.28)));
        if (o <= 0.001) return null;
        const s = 0.94 + 0.06 * eOut(prog(t, a, a + 0.5));
        return (
          <div key={l} style={{ position: "absolute", inset: 0, opacity: o }}>
            <Card x={640} y={140} w={1160} h={720} style={{ transform: `scale(${s})` }}>
              <div style={{ ...fill, padding: 14, boxSizing: "border-box" }}>
                <VisualSvg visual={visual} layout={l} theme={theme} style={styleById("flat")} className="promo-svg" />
              </div>
            </Card>
            <div style={{ position: "absolute", left: 640, width: 1160, top: 880, textAlign: "center", color: "#fff", font: `700 30px ${FONT}` }}>{LAYOUT_LABELS[l]}</div>
          </div>
        );
      })}
    </Scene>
  );
}

// ─── Сцена 3½: все 43 формы сеткой ───────────────────────────
/** Для форм со своим числом пунктов — подходящий пример, иначе схема выглядит странно */
export const extra = (data as unknown as { extra: Record<string, Visual> }).extra;
export const SAMPLE: Partial<Record<Layout, Visual>> = {
  proscons: extra.lock,
  scales: extra.lock,
  compare: extra.lock,
  swot: extra.glossary,
  matrix: extra.glossary,
  diamond: extra.glossary,
  venn: extra.glossary,
  glossary: extra.glossary,
  podium: extra.tree,
  fishbone: extra.tree,
  pestel: extra.tree,
  dialogue: extra.faq,
  faq: extra.faq,
  quote: extra.quote,
  persona: extra.persona,
  orgchart: extra.orgchart,
};
export const ALL: Layout[] = CATEGORIES.flatMap((c) => c.layouts);
// снизу оставляем полосу под титр, чтобы он не закрывал последний ряд
const G = { cols: 9, rows: 5, pad: 36, gap: 14, bottom: 172 };
const cellW = (1920 - 2 * G.pad - (G.cols - 1) * G.gap) / G.cols;
const cellH = (1080 - G.pad - G.bottom - (G.rows - 1) * G.gap) / G.rows;
export const GRID_A = 14.2;

function Grid({ t }: { t: number }) {
  // разлёт из центральной карточки прошлой сцены; ближние к центру клетки прилетают первыми
  const from = { x: 640 + 1160 / 2, y: 140 + 720 / 2 };
  const n = ALL.length;
  const offset = (G.cols * G.rows - n) / 2; // неполный последний ряд — по центру
  const cells = ALL.map((l, i) => {
    const k = i < n - (n % G.cols || G.cols) ? i : i + Math.floor(offset);
    const col = k % G.cols;
    const row = Math.floor(k / G.cols);
    const x = G.pad + col * (cellW + G.gap);
    const y = G.pad + row * (cellH + G.gap);
    const dist = Math.hypot(x + cellW / 2 - from.x, y + cellH / 2 - from.y);
    return { l, x, y, dist, col, row };
  });
  const order = [...cells].sort((a, b) => a.dist - b.dist).map((c) => c.l);
  return (
    <Scene t={t} a={GRID_A} b={GRID_A + 4.4} style={{ zIndex: 2 }}>
      {cells.map((c) => {
        const at = GRID_A + order.indexOf(c.l) * 0.024;
        const k = eBack(prog(t, at, at + 0.7));
        const o = clamp(eOut(prog(t, at, at + 0.35)));
        const dx = (from.x - (c.x + cellW / 2)) * (1 - eOut(prog(t, at, at + 0.7)));
        const dy = (from.y - (c.y + cellH / 2)) * (1 - eOut(prog(t, at, at + 0.7)));
        // световая волна по диагонали, когда сетка собралась
        const wave = Math.max(0, 1 - Math.abs(t - (GRID_A + 2.1 + (c.col + c.row) * 0.07)) / 0.35);
        const s = (0.2 + 0.8 * k) * (1 + wave * 0.06);
        return (
          <div
            key={c.l}
            style={{
              position: "absolute",
              left: c.x,
              top: c.y,
              width: cellW,
              height: cellH,
              opacity: o,
              transform: `translate(${dx}px, ${dy}px) scale(${s})`,
              borderRadius: 14,
              background: "#fff",
              boxShadow: `0 14px 34px rgba(0,0,0,0.38), 0 0 0 ${wave * 3}px rgba(37,141,232,${0.9 * wave})`,
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div style={{ flex: 1, minHeight: 0, padding: "6px 6px 0" }}>
              <VisualSvg visual={SAMPLE[c.l] ?? visual} layout={c.l} theme={theme} style={styleById("flat")} className="promo-svg" />
            </div>
            <div style={{ font: `700 14px ${FONT}`, color: "#334155", textAlign: "center", padding: "4px 6px 7px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {LAYOUT_LABELS[c.l]}
            </div>
          </div>
        );
      })}
      <Caption t={t} a={GRID_A + 1.1} b={GRID_A + 4.3}>
        43 формы на любой текст
      </Caption>
    </Scene>
  );
}

// ─── Сцена 4: стили ──────────────────────────────────────────
export const STYLE_IDS = ["flat", "napkin", "chalk", "business", "premium-night"];
export const STYLE_T0 = 14.7;
export const STYLE_DUR = 0.95;
function Styles({ t }: { t: number }) {
  const active = Math.floor(clamp((t - STYLE_T0) / STYLE_DUR, 0, STYLE_IDS.length - 1));
  return (
    <Scene t={t} a={14.4} b={19.7}>
      {STYLE_IDS.map((id, k) => {
        const a = STYLE_T0 + k * STYLE_DUR;
        const last = k === STYLE_IDS.length - 1;
        // новый стиль «закрашивает» старый слева направо; следующий лежит сверху, так что ничего не двоится
        const wipe = k === 0 ? 1 : eInOut(prog(t, a - 0.15, a + 0.35));
        const gone = !last && t > a + STYLE_DUR + 0.4;
        if (wipe <= 0.001 || gone) return null;
        return (
          <Card key={id} x={300} y={110} w={1320} h={760} style={{ clipPath: `inset(0 ${(1 - wipe) * 100}% 0 0 round 28px)`, background: "transparent", boxShadow: "none" }}>
            <div style={fill}>
              <VisualSvg visual={visual} layout="roadmap" theme={theme} style={styleById(id)} className="promo-svg promo-cover" />
            </div>
          </Card>
        );
      })}
      {STYLE_IDS.map((id, k) => {
        if (k === 0) return null;
        const a = STYLE_T0 + k * STYLE_DUR;
        const w = eInOut(prog(t, a - 0.15, a + 0.35));
        if (w <= 0 || w >= 1) return null;
        return <div key={`edge${id}`} style={{ position: "absolute", top: 100, height: 780, left: 300 + 1320 * w - 3, width: 6, borderRadius: 3, background: "#fff", boxShadow: "0 0 30px 8px rgba(37,141,232,0.8)" }} />;
      })}
      <div style={{ position: "absolute", left: 0, right: 0, top: 890, display: "flex", justifyContent: "center", gap: 14 }}>
        {STYLE_IDS.map((id, k) => (
          <div
            key={id}
            style={{
              font: `700 24px ${FONT}`,
              padding: "8px 18px",
              borderRadius: 999,
              color: k === active ? "#0B1220" : "#A9C6E4",
              background: k === active ? "#fff" : "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.14)",
            }}
          >
            {styleById(id).name}
          </div>
        ))}
      </div>
      <Caption t={t} a={15.2} b={19.6}>
        8 стилей · 10 палитр
      </Caption>
    </Scene>
  );
}

// ─── Сцена 5: процессы ───────────────────────────────────────
function Process({ t }: { t: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const T0 = 20.4;
  const STEP = 0.4;
  useLayoutEffect(() => {
    const root = ref.current;
    if (!root) return;
    const title = root.querySelector<SVGGElement>("[data-title]");
    if (title) title.style.opacity = String(eOut(prog(t, 19.8, 20.3)));
    root.querySelectorAll<SVGGElement>("[data-lane]").forEach((el, i) => {
      const k = eOut(prog(t, 19.9 + i * 0.1, 20.4 + i * 0.1));
      el.style.opacity = String(k);
      el.style.transform = `translateX(${(1 - k) * -70}px)`;
    });
    const rankOf = (id: string) => Number(root.querySelector(`[data-node="${CSS.escape(id)}"]`)?.getAttribute("data-rank") ?? 0);
    root.querySelectorAll<SVGGElement>("[data-node]").forEach((el) => {
      const r = Number(el.getAttribute("data-rank"));
      const k = eBack(prog(t, T0 + r * STEP, T0 + r * STEP + 0.45));
      el.style.transformBox = "fill-box";
      el.style.transformOrigin = "center";
      el.style.opacity = String(clamp(k * 1.5));
      el.style.transform = `scale(${0.3 + 0.7 * k})`;
    });
    root.querySelectorAll<SVGGElement>("[data-edge]").forEach((el) => {
      const r = rankOf(el.getAttribute("data-edge")!);
      const a = T0 + r * STEP - 0.3;
      const k = eInOut(prog(t, a, a + 0.32));
      const back = el.getAttribute("data-back") === "1";
      const line = el.querySelector("path");
      if (line && !back) {
        line.setAttribute("pathLength", "1");
        line.style.strokeDasharray = "1";
        line.style.strokeDashoffset = String(1 - k);
      }
      el.style.opacity = back ? String(eOut(prog(t, a + 0.4, a + 0.8))) : "1";
      el.querySelectorAll("polygon").forEach((pg) => ((pg as SVGElement).style.opacity = k > 0.97 ? "1" : "0"));
      el.querySelectorAll("text, rect").forEach((x) => ((x as SVGElement).style.opacity = String(eOut(prog(t, a + 0.25, a + 0.5)))));
    });
  });
  // камера: крупный план едет за построением по диагонали, в конце отъезжает на всю схему
  const pan = eInOut(prog(t, 20.2, 24.6));
  const zoomOut = eInOut(prog(t, 24.8, 25.8));
  const S = 1.9 - 0.9 * zoomOut;
  const px = (1760 - 1760 / S) * pan * (1 - zoomOut);
  const py = (840 - 840 / S) * pan * (1 - zoomOut);
  return (
    <Scene t={t} a={19.5} b={26.8}>
      <Card x={80} y={70} w={1760} h={840} style={{ background: "#0A1428" }}>
        <div ref={ref} style={{ ...fill, transformOrigin: "0 0", transform: `scale(${S}) translate(${-px}px, ${-py}px)` }}>
          <ProcessSvg process={process} dir="h" theme={theme} style={styleById("premium-night")} className="promo-svg" />
        </div>
      </Card>
      <Caption t={t} a={20.6} b={26.6}>
        Процессы — как в Draw.io
      </Caption>
    </Scene>
  );
}

// ─── Сцена 6: выгрузка ───────────────────────────────────────
export const EXPORTS = [
  { ext: "PNG", note: "для документов и постов", color: "#258DE8" },
  { ext: "SVG", note: "вектор для Figma и печати", color: "#7C5CFF" },
  { ext: ".drawio", note: "правка процессов в Draw.io", color: "#F08A24" },
];
function Export({ t }: { t: number }) {
  const ref = useRef<HTMLDivElement>(null);
  usePop(ref, t, 26.7, 0.06);
  const shrink = eInOut(prog(t, 27.0, 27.6));
  return (
    <Scene t={t} a={26.5} b={30.7}>
      <Card x={460} y={90} w={1000} h={580} style={{ transform: `scale(${1 - shrink * 0.08})`, transformOrigin: "50% 30%", background: "transparent" }}>
        <div ref={ref} style={fill}>
          <VisualSvg visual={visual} layout="roadmap" theme={theme} style={styleById("premium")} className="promo-svg promo-cover" />
        </div>
      </Card>
      {EXPORTS.map((x, i) => {
        const k = eBack(prog(t, 27.4 + i * 0.16, 28.0 + i * 0.16));
        const fx = 960 + (i - 1) * 420;
        const fy = 770;
        const px = 960 + (fx - 960) * k;
        const py = 380 + (fy - 380) * k;
        return (
          <div
            key={x.ext}
            style={{
              position: "absolute",
              left: px - 190,
              top: py - 60,
              width: 380,
              height: 120,
              opacity: clamp(k * 1.5),
              transform: `scale(${0.3 + 0.7 * k})`,
              borderRadius: 22,
              background: "#fff",
              display: "flex",
              alignItems: "center",
              gap: 18,
              padding: "0 22px",
              boxSizing: "border-box",
              boxShadow: "0 24px 60px rgba(0,0,0,0.4)",
            }}
          >
            <div style={{ width: 76, height: 76, borderRadius: 16, background: x.color, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", font: `800 ${x.ext.length > 4 ? 19 : 24}px ${FONT}` }}>{x.ext}</div>
            <div style={{ font: `600 24px/1.3 ${FONT}`, color: "#334155" }}>{x.note}</div>
          </div>
        );
      })}
      <Caption t={t} a={27.9} b={30.6}>
        Работает на вашем компьютере. Бесплатно
      </Caption>
    </Scene>
  );
}

// ─── Сцена 7: финал ──────────────────────────────────────────
function Outro({ t }: { t: number }) {
  const k = eBack(prog(t, 30.6, 31.5));
  const q = (a: number) => eOut(prog(t, a, a + 0.5));
  return (
    <Scene t={t} a={30.5} b={36}>
      <div style={{ position: "absolute", left: 0, right: 0, top: 170, display: "flex", flexDirection: "column", alignItems: "center" }}>
        <img src="/brand/logo-dark.png" alt="" style={{ height: 250, transform: `scale(${0.6 + 0.4 * k})`, filter: "drop-shadow(0 20px 60px rgba(37,141,232,0.45))" }} />
        <div style={{ marginTop: 20, font: `800 120px ${FONT}`, color: "#fff", letterSpacing: "-3px", opacity: q(31.0), transform: `translateY(${(1 - q(31.0)) * 30}px)` }}>Салфетка</div>
        <div style={{ marginTop: 10, font: `600 44px ${FONT}`, color: "#A9C6E4", opacity: q(31.5) }}>Превратите текст в схему</div>
        <div
          style={{
            marginTop: 48,
            display: "flex",
            alignItems: "center",
            gap: 24,
            padding: "14px 44px 14px 14px",
            borderRadius: 999,
            background: "rgba(34,158,217,0.14)",
            border: "1px solid rgba(34,158,217,0.5)",
            color: "#fff",
            opacity: q(32.1),
            transform: `scale(${0.9 + 0.1 * q(32.1)})`,
          }}
        >
          {/* логотип канала автора со значком Telegram в углу */}
          <div style={{ position: "relative", width: 104, height: 104, flex: "none", transform: `scale(${0.6 + 0.4 * eBack(prog(t, 32.2, 32.9))})` }}>
            <img
              src="/brand/channel-360.jpg"
              alt=""
              style={{
                width: 104,
                height: 104,
                borderRadius: "50%",
                display: "block",
                boxShadow: `0 0 0 3px #3FD6E8, 0 0 ${26 + Math.sin(t * 3) * 8}px rgba(63,214,232,0.55)`,
              }}
            />
            <span style={{ position: "absolute", right: -6, bottom: -6, display: "flex", color: "#229ED9", background: "#0B1A33", borderRadius: "50%", padding: 3 }}>
              <TelegramIcon size={36} />
            </span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <span style={{ font: `600 26px ${FONT}`, color: "#A9C6E4" }}>Канал автора · обновления и идеи</span>
            <span style={{ font: `800 46px ${FONT}`, letterSpacing: "-0.5px" }}>t.me/ii_eggs</span>
          </div>
        </div>
      </div>
    </Scene>
  );
}

// ─── Ролик ───────────────────────────────────────────────────
declare global {
  interface Window {
    __setTime: (t: number) => void;
    __ready: boolean;
  }
}

/** Время ролика: задаётся снаружи (__setTime) при записи, ?play — проигрывание, ?t= — стоп-кадр */
export function useTimeline() {
  const params = new URLSearchParams(location.search);
  const [t, setT] = useState(Number(params.get("t") ?? 0));
  useEffect(() => {
    window.__setTime = (x: number) => flushSync(() => setT(x));
    window.__ready = true;
    if (!params.has("play")) return;
    const t0 = performance.now();
    let id = 0;
    const loop = () => {
      setT(((performance.now() - t0) / 1000) % DURATION);
      id = requestAnimationFrame(loop);
    };
    id = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(id);
  }, []);
  return t;
}

export function Promo() {
  const t = useTimeline();
  return (
    <div style={{ position: "relative", width: 1920, height: 1080, overflow: "hidden", fontFamily: FONT }}>
      <style>{`.promo-svg { width: 100%; height: 100%; display: block; } .promo-cover { }`}</style>
      <Backdrop t={t} />
      <Intro t={t} />
      <TextToVisual t={t} />
      <Shapes t={t} />
      <Grid t={t} />
      {/* дальше — прежние сцены, сдвинутые на длину «сетки» */}
      <Styles t={t - GRID_SHIFT} />
      <Process t={t - GRID_SHIFT} />
      <Export t={t - GRID_SHIFT} />
      <Outro t={t - GRID_SHIFT} />
    </div>
  );
}
