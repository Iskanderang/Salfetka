import { useLayoutEffect, useRef } from "react";
import { LAYOUT_LABELS, type Layout, type ProcessGraph } from "@napkin/shared";
import { VisualSvg } from "../render/VisualSvg";
import { ProcessSvg } from "../process/ProcessSvg";
import { styleById } from "../render/styles";
import { TelegramIcon } from "../ChannelTip";
import data from "./data.json";
import {
  ALL,
  BLUE,
  Backdrop,
  Caption,
  Card,
  EXPORTS,
  FONT,
  GRID_A,
  GRID_SHIFT,
  SAMPLE,
  STYLE_DUR,
  STYLE_IDS,
  STYLE_T0,
  Scene,
  clamp,
  eBack,
  eInOut,
  eOut,
  fill,
  prog,
  theme,
  usePop,
  useTimeline,
  visual,
} from "./Promo";

/**
 * Вертикальная версия ролика, 1080×1920 — для Shorts, Reels, клипов VK и Telegram-историй.
 * Тот же сценарий и тайминг, но каждая сцена заново скомпонована под высокий экран:
 * схемы друг под другом, процесс — сверху вниз, сетка 5×9, стили «закрашиваются» сверху вниз.
 * Низ и правый край в Shorts/Reels закрыты кнопками — титры подняты, главное держим по центру.
 */

const VW = 1080;
const VH = 1920;
const CAP = { bottom: 330, size: 54 };
const processV = (data as unknown as { processV: ProcessGraph }).processV;

// ─── 1. Логотип ──────────────────────────────────────────────
function Intro({ t }: { t: number }) {
  const k = eBack(prog(t, 0.1, 1.1));
  const blur = (1 - eOut(prog(t, 0.1, 0.9))) * 14;
  const word = "Салфетка";
  const tag = eOut(prog(t, 1.6, 2.2));
  return (
    <Scene t={t} a={0} b={3.3}>
      <div style={{ position: "absolute", left: 0, right: 0, top: 430, display: "flex", flexDirection: "column", alignItems: "center" }}>
        <img src="/brand/logo-dark.png" alt="" style={{ height: 380, transform: `scale(${0.55 + 0.45 * k}) translateY(${(1 - k) * 40}px)`, filter: `blur(${blur}px) drop-shadow(0 24px 70px rgba(37,141,232,0.5))` }} />
        <div style={{ display: "flex", marginTop: 34, font: `800 150px ${FONT}`, color: "#fff", letterSpacing: "-4px" }}>
          {[...word].map((ch, i) => {
            const q = eOut(prog(t, 0.7 + i * 0.06, 1.2 + i * 0.06));
            return (
              <span key={i} style={{ display: "inline-block", opacity: q, transform: `translateY(${(1 - q) * 56}px)` }}>
                {ch}
              </span>
            );
          })}
        </div>
        <div style={{ marginTop: 26, font: `600 56px/1.3 ${FONT}`, color: "#A9C6E4", textAlign: "center", opacity: tag, transform: `translateY(${(1 - tag) * 24}px)` }}>
          Текст <span style={{ color: BLUE }}>→</span> схема
          <br />
          за секунды
        </div>
      </div>
    </Scene>
  );
}

// ─── 2. Текст сверху → схема под ним ─────────────────────────
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
  const cx = 760 - 300 * cur;
  const cy = 360 + 210 * cur;
  const below = eOut(prog(t, 6.35, 6.9));
  return (
    <Scene t={t} a={3.0} b={8.7}>
      <Card x={60} y={110} w={960} h={640} style={{ transform: `translateY(${(1 - eOut(prog(t, 3.0, 3.6))) * 50}px)` }}>
        <div style={{ padding: "24px 34px 0", font: `700 22px ${FONT}`, color: "#64748B", letterSpacing: "1.5px" }}>ТЕКСТ</div>
        <div style={{ padding: "14px 34px", font: `500 28px/1.5 ${FONT}`, color: "#1E293B", whiteSpace: "pre-wrap", height: 440, overflow: "hidden" }}>
          {shown.slice(0, Math.min(sel0, typed))}
          <span style={{ background: "rgba(37,141,232,0.2)", borderRadius: 4 }}>{shown.slice(sel0, Math.max(sel0, Math.min(sel1, typed)))}</span>
          {shown.slice(Math.max(sel0, Math.min(sel1, typed)))}
          {t < 5.4 && <span style={{ display: "inline-block", width: 3, height: 32, background: BLUE, verticalAlign: "middle", opacity: Math.floor(t * 3) % 2 ? 1 : 0 }} />}
        </div>
        <div
          style={{
            position: "absolute",
            left: 34,
            right: 34,
            bottom: 34,
            height: 84,
            borderRadius: 18,
            background: BLUE,
            color: "#fff",
            font: `700 32px ${FONT}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transform: `scale(${1 - press * 0.06})`,
            boxShadow: `0 ${12 - press * 8}px 30px rgba(37,141,232,0.4)`,
          }}
        >
          ✦ Визуализировать
        </div>
        {t > 5.5 && t < 6.9 && (
          <svg width="46" height="56" viewBox="0 0 20 24" style={{ position: "absolute", left: cx, top: cy + 120, filter: "drop-shadow(0 3px 4px rgba(0,0,0,0.35))" }}>
            <path d="M1 1 L1 19 L6 14.5 L9.5 22 L12.5 20.6 L9 13.4 L16 13.4 Z" fill="#fff" stroke="#0B1220" strokeWidth="1.4" strokeLinejoin="round" />
          </svg>
        )}
      </Card>
      {/* стрелка-подсказка «вниз» между текстом и схемой */}
      <div style={{ position: "absolute", left: 0, right: 0, top: 752, textAlign: "center", color: BLUE, font: `800 44px ${FONT}`, opacity: below, transform: `translateY(${(1 - below) * -16}px)` }}>↓</div>
      <Card x={60} y={810} w={960} h={640} style={{ opacity: below, transform: `translateY(${(1 - below) * 60}px) scale(${0.96 + 0.04 * below})` }}>
        <div ref={ref} style={{ ...fill, padding: 10, boxSizing: "border-box" }}>
          <VisualSvg visual={visual} layout={visual.layouts[0]} theme={theme} style={styleById("flat")} className="promo-svg" />
        </div>
      </Card>
      <Caption t={t} a={6.8} b={8.6} {...CAP}>
        Вставили текст — получили схему
      </Caption>
    </Scene>
  );
}

// ─── 3. «43 формы»: счётчик сверху, формы на всю ширину ──────
const SHAPES_V: Layout[] = ["vtimeline", "mountains", "iceberg", "target", "rocket", "pyramid"];
const T0 = 8.8;
const DUR = 0.95;
function Shapes({ t }: { t: number }) {
  const n = Math.round(43 * eOut(prog(t, 8.9, 10.4)));
  return (
    <Scene t={t} a={8.5} b={14.6}>
      <div style={{ position: "absolute", left: 0, right: 0, top: 110, textAlign: "center", color: "#fff", font: `800 230px/1 ${FONT}`, letterSpacing: "-8px" }}>{n}</div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 350, textAlign: "center", color: "#A9C6E4", font: `700 52px ${FONT}` }}>форм</div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 420, textAlign: "center", color: "#7E95B5", font: `500 32px ${FONT}` }}>шаги, воронка, айсберг, ракета…</div>
      {SHAPES_V.map((l, k) => {
        const a = T0 + k * DUR;
        const last = k === SHAPES_V.length - 1;
        const o = Math.min(eOut(prog(t, a, a + 0.28)), last ? 1 : 1 - eInOut(prog(t, a + DUR, a + DUR + 0.28)));
        if (o <= 0.001) return null;
        const s = 0.94 + 0.06 * eOut(prog(t, a, a + 0.5));
        return (
          <div key={l} style={{ position: "absolute", inset: 0, opacity: o }}>
            <Card x={60} y={520} w={960} h={840} style={{ transform: `scale(${s})` }}>
              <div style={{ ...fill, padding: 14, boxSizing: "border-box" }}>
                <VisualSvg visual={visual} layout={l} theme={theme} style={styleById("flat")} className="promo-svg" />
              </div>
            </Card>
            <div style={{ position: "absolute", left: 0, right: 0, top: 1390, textAlign: "center", color: "#fff", font: `700 40px ${FONT}` }}>{LAYOUT_LABELS[l]}</div>
          </div>
        );
      })}
    </Scene>
  );
}

// ─── 3½. Сетка всех форм: 5 колонок × 9 рядов ────────────────
const GV = { cols: 5, rows: 9, pad: 30, gap: 12, top: 210, bottom: 330 };
const cw = (VW - 2 * GV.pad - (GV.cols - 1) * GV.gap) / GV.cols;
const ch = (VH - GV.top - GV.bottom - (GV.rows - 1) * GV.gap) / GV.rows;
function Grid({ t }: { t: number }) {
  const from = { x: 60 + 960 / 2, y: 520 + 840 / 2 };
  const n = ALL.length;
  const lastRow = n % GV.cols || GV.cols;
  const shift = Math.floor((GV.cols - lastRow) / 2);
  const cells = ALL.map((l, i) => {
    const k = i < n - lastRow ? i : i + shift;
    const col = k % GV.cols;
    const row = Math.floor(k / GV.cols);
    const x = GV.pad + col * (cw + GV.gap);
    const y = GV.top + row * (ch + GV.gap);
    return { l, x, y, col, row, dist: Math.hypot(x + cw / 2 - from.x, y + ch / 2 - from.y) };
  });
  const order = [...cells].sort((a, b) => a.dist - b.dist).map((c) => c.l);
  const head = eOut(prog(t, GRID_A + 0.9, GRID_A + 1.4));
  return (
    <Scene t={t} a={GRID_A} b={GRID_A + 4.4} style={{ zIndex: 2 }}>
      <div style={{ position: "absolute", left: 0, right: 0, top: 70, textAlign: "center", color: "#fff", font: `800 64px ${FONT}`, letterSpacing: "-1px", opacity: head, transform: `translateY(${(1 - head) * 20}px)` }}>
        43 формы на любой текст
      </div>
      {cells.map((c) => {
        const at = GRID_A + order.indexOf(c.l) * 0.024;
        const k = eBack(prog(t, at, at + 0.7));
        const e = eOut(prog(t, at, at + 0.7));
        const wave = Math.max(0, 1 - Math.abs(t - (GRID_A + 2.1 + (c.col + c.row) * 0.07)) / 0.35);
        return (
          <div
            key={c.l}
            style={{
              position: "absolute",
              left: c.x,
              top: c.y,
              width: cw,
              height: ch,
              opacity: clamp(eOut(prog(t, at, at + 0.35))),
              transform: `translate(${(from.x - (c.x + cw / 2)) * (1 - e)}px, ${(from.y - (c.y + ch / 2)) * (1 - e)}px) scale(${(0.2 + 0.8 * k) * (1 + wave * 0.07)})`,
              borderRadius: 12,
              background: "#fff",
              boxShadow: `0 12px 30px rgba(0,0,0,0.38), 0 0 0 ${wave * 3}px rgba(37,141,232,${0.9 * wave})`,
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div style={{ flex: 1, minHeight: 0, padding: "5px 5px 0" }}>
              <VisualSvg visual={SAMPLE[c.l] ?? visual} layout={c.l} theme={theme} style={styleById("flat")} className="promo-svg" />
            </div>
            <div style={{ font: `700 14px ${FONT}`, color: "#334155", textAlign: "center", padding: "3px 5px 6px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {LAYOUT_LABELS[c.l]}
            </div>
          </div>
        );
      })}
    </Scene>
  );
}

// ─── 4. Стили: вертикальная схема, «закрашивается» сверху вниз ─
const styleBg = (id: string) => {
  const st = styleById(id);
  return st.fixedTheme?.bg ?? (st.premium === "dark" ? "#0B1A33" : (st.override?.bg ?? theme.bg));
};
function Styles({ t }: { t: number }) {
  const active = Math.floor(clamp((t - STYLE_T0) / STYLE_DUR, 0, STYLE_IDS.length - 1));
  const box = { x: 90, y: 150, w: 900, h: 1150 };
  return (
    <Scene t={t} a={14.4} b={19.7}>
      {STYLE_IDS.map((id, k) => {
        const a = STYLE_T0 + k * STYLE_DUR;
        const last = k === STYLE_IDS.length - 1;
        const wipe = k === 0 ? 1 : eInOut(prog(t, a - 0.15, a + 0.35));
        if (wipe <= 0.001 || (!last && t > a + STYLE_DUR + 0.4)) return null;
        return (
          // карточка залита фоном стиля: схемы разной высоты, и в полях не должен просвечивать прошлый стиль
          <Card key={id} {...box} style={{ clipPath: `inset(0 0 ${(1 - wipe) * 100}% 0 round 28px)`, background: styleBg(id), boxShadow: "none" }}>
            <div style={fill}>
              <VisualSvg visual={visual} layout="vtimeline" theme={theme} style={styleById(id)} className="promo-svg" />
            </div>
          </Card>
        );
      })}
      {STYLE_IDS.map((id, k) => {
        if (k === 0) return null;
        const w = eInOut(prog(t, STYLE_T0 + k * STYLE_DUR - 0.15, STYLE_T0 + k * STYLE_DUR + 0.35));
        if (w <= 0 || w >= 1) return null;
        return <div key={`edge${id}`} style={{ position: "absolute", left: box.x - 10, width: box.w + 20, top: box.y + box.h * w - 3, height: 6, borderRadius: 3, background: "#fff", boxShadow: "0 0 30px 8px rgba(37,141,232,0.8)" }} />;
      })}
      <div style={{ position: "absolute", left: 90, right: 90, top: 1330, display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 12 }}>
        {STYLE_IDS.map((id, k) => (
          <div
            key={id}
            style={{
              font: `700 30px ${FONT}`,
              padding: "10px 22px",
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
      <Caption t={t} a={15.2} b={19.6} {...CAP}>
        8 стилей · 10 палитр
      </Caption>
    </Scene>
  );
}

// ─── 5. Процесс сверху вниз, камера едет вниз ────────────────
function Process({ t }: { t: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const PT0 = 20.4;
  const STEP = 0.42;
  useLayoutEffect(() => {
    const root = ref.current;
    if (!root) return;
    const title = root.querySelector<SVGGElement>("[data-title]");
    if (title) title.style.opacity = String(eOut(prog(t, 19.8, 20.3)));
    root.querySelectorAll<SVGGElement>("[data-lane]").forEach((el, i) => {
      const k = eOut(prog(t, 19.9 + i * 0.12, 20.4 + i * 0.12));
      el.style.opacity = String(k);
      el.style.transform = `translateY(${(1 - k) * -80}px)`;
    });
    const rankOf = (id: string) => Number(root.querySelector(`[data-node="${CSS.escape(id)}"]`)?.getAttribute("data-rank") ?? 0);
    root.querySelectorAll<SVGGElement>("[data-node]").forEach((el) => {
      const r = Number(el.getAttribute("data-rank"));
      const k = eBack(prog(t, PT0 + r * STEP, PT0 + r * STEP + 0.45));
      el.style.transformBox = "fill-box";
      el.style.transformOrigin = "center";
      el.style.opacity = String(clamp(k * 1.5));
      el.style.transform = `scale(${0.3 + 0.7 * k})`;
    });
    root.querySelectorAll<SVGGElement>("[data-edge]").forEach((el) => {
      const a = PT0 + rankOf(el.getAttribute("data-edge")!) * STEP - 0.3;
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
  const box = { x: 40, y: 110, w: 1000, h: 1330 };
  const pan = eInOut(prog(t, 20.2, 24.4));
  const zoomOut = eInOut(prog(t, 24.7, 25.7));
  const S = 1.45 - 0.45 * zoomOut;
  // процесс идёт в основном вниз — камера едет вниз и лишь чуть вбок, чтобы не срезать первую колонку
  const px = (box.w - box.w / S) * pan * (1 - zoomOut) * 0.3;
  const py = (box.h - box.h / S) * pan * (1 - zoomOut);
  return (
    <Scene t={t} a={19.5} b={26.8}>
      <Card {...box} style={{ background: "#0A1428" }}>
        <div ref={ref} style={{ ...fill, transformOrigin: "0 0", transform: `scale(${S}) translate(${-px}px, ${-py}px)` }}>
          <ProcessSvg process={processV} dir="v" theme={theme} style={styleById("premium-night")} className="promo-svg" />
        </div>
      </Card>
      <Caption t={t} a={20.6} b={26.6} {...CAP}>
        Процессы — как в Draw.io
      </Caption>
    </Scene>
  );
}

// ─── 6. Выгрузка: карточки столбиком ─────────────────────────
function Export({ t }: { t: number }) {
  const ref = useRef<HTMLDivElement>(null);
  usePop(ref, t, 26.7, 0.06);
  const shrink = eInOut(prog(t, 27.0, 27.6));
  const from = { x: 540, y: 140 + 600 / 2 };
  return (
    <Scene t={t} a={26.5} b={30.7}>
      <Card x={90} y={140} w={900} h={600} style={{ transform: `scale(${1 - shrink * 0.06})`, transformOrigin: "50% 20%", background: "transparent" }}>
        <div ref={ref} style={fill}>
          <VisualSvg visual={visual} layout="roadmap" theme={theme} style={styleById("premium")} className="promo-svg" />
        </div>
      </Card>
      {EXPORTS.map((x, i) => {
        const k = eBack(prog(t, 27.4 + i * 0.16, 28.0 + i * 0.16));
        const fy = 850 + i * 165;
        const py = from.y + (fy - from.y) * k;
        return (
          <div
            key={x.ext}
            style={{
              position: "absolute",
              left: 140,
              top: py - 70,
              width: 800,
              height: 140,
              opacity: clamp(k * 1.5),
              transform: `scale(${0.3 + 0.7 * k})`,
              borderRadius: 26,
              background: "#fff",
              display: "flex",
              alignItems: "center",
              gap: 26,
              padding: "0 28px",
              boxSizing: "border-box",
              boxShadow: "0 24px 60px rgba(0,0,0,0.4)",
            }}
          >
            <div style={{ width: 96, height: 96, borderRadius: 20, background: x.color, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", font: `800 ${x.ext.length > 4 ? 23 : 30}px ${FONT}`, flex: "none" }}>{x.ext}</div>
            <div style={{ font: `600 34px/1.25 ${FONT}`, color: "#334155" }}>{x.note}</div>
          </div>
        );
      })}
      <Caption t={t} a={27.9} b={30.6} {...CAP}>
        Работает на вашем компьютере. Бесплатно
      </Caption>
    </Scene>
  );
}

// ─── 7. Финал ────────────────────────────────────────────────
function Outro({ t }: { t: number }) {
  const k = eBack(prog(t, 30.6, 31.5));
  const q = (a: number) => eOut(prog(t, a, a + 0.5));
  return (
    <Scene t={t} a={30.5} b={36}>
      <div style={{ position: "absolute", left: 0, right: 0, top: 300, display: "flex", flexDirection: "column", alignItems: "center" }}>
        <img src="/brand/logo-dark.png" alt="" style={{ height: 340, transform: `scale(${0.6 + 0.4 * k})`, filter: "drop-shadow(0 24px 70px rgba(37,141,232,0.5))" }} />
        <div style={{ marginTop: 26, font: `800 150px ${FONT}`, color: "#fff", letterSpacing: "-4px", opacity: q(31.0), transform: `translateY(${(1 - q(31.0)) * 36}px)` }}>Салфетка</div>
        <div style={{ marginTop: 12, font: `600 52px/1.3 ${FONT}`, color: "#A9C6E4", textAlign: "center", opacity: q(31.5) }}>
          Превратите текст
          <br />в схему
        </div>
        <div
          style={{
            marginTop: 70,
            display: "flex",
            alignItems: "center",
            gap: 26,
            padding: "16px 46px 16px 16px",
            borderRadius: 999,
            background: "rgba(34,158,217,0.14)",
            border: "1px solid rgba(34,158,217,0.5)",
            color: "#fff",
            opacity: q(32.1),
            transform: `scale(${0.9 + 0.1 * q(32.1)})`,
          }}
        >
          <div style={{ position: "relative", width: 124, height: 124, flex: "none", transform: `scale(${0.6 + 0.4 * eBack(prog(t, 32.2, 32.9))})` }}>
            <img
              src="/brand/channel-360.jpg"
              alt=""
              style={{ width: 124, height: 124, borderRadius: "50%", display: "block", boxShadow: `0 0 0 3px #3FD6E8, 0 0 ${28 + Math.sin(t * 3) * 9}px rgba(63,214,232,0.55)` }}
            />
            <span style={{ position: "absolute", right: -6, bottom: -6, display: "flex", color: "#229ED9", background: "#0B1A33", borderRadius: "50%", padding: 3 }}>
              <TelegramIcon size={42} />
            </span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ font: `600 28px ${FONT}`, color: "#A9C6E4" }}>Канал автора</span>
            <span style={{ font: `800 56px ${FONT}`, letterSpacing: "-0.5px" }}>t.me/ii_eggs</span>
          </div>
        </div>
      </div>
    </Scene>
  );
}

export function PromoVertical() {
  const t = useTimeline();
  return (
    <div style={{ position: "relative", width: VW, height: VH, overflow: "hidden", fontFamily: FONT }}>
      <style>{`.promo-svg { width: 100%; height: 100%; display: block; }`}</style>
      <Backdrop t={t} />
      <Intro t={t} />
      <TextToVisual t={t} />
      <Shapes t={t} />
      <Grid t={t} />
      <Styles t={t - GRID_SHIFT} />
      <Process t={t - GRID_SHIFT} />
      <Export t={t - GRID_SHIFT} />
      <Outro t={t - GRID_SHIFT} />
    </div>
  );
}
