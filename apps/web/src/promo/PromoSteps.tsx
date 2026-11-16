import { useRef } from "react";
import { LAYOUT_LABELS, type Layout } from "@napkin/shared";
import { VisualSvg } from "../render/VisualSvg";
import { THEMES, type Theme } from "../render/themes";
import { styleById } from "../render/styles";
import { Paint } from "../render/paint";
import data from "./data.json";
import { ALL, Backdrop, BLUE, Card, clamp, eBack, eInOut, eOut, FONT, fill, prog, SAMPLE, Scene, usePop, useTimeline, vis, visual } from "./Promo";

/**
 * Ролик «как это работает», 1920×1080, около минуты: семь шагов от ввода текста до скачивания.
 * Основа — сцена «текст → схема» первого ролика; новые стили — часть шага «Выбор стиля».
 * Открыть: /promo.html?format=steps (&play — проигрывание, &t=12 — стоп-кадр).
 */

export const STEPS_DURATION = 60;

// ─── Расписание ──────────────────────────────────────────────
const T = {
  intro: [0, 4],
  input: [4, 9.6],
  analyze: [9.6, 15.6],
  blocks: [15.6, 22.4],
  form: [22.4, 31.0],
  style: [31.0, 41.0],
  color: [41.0, 47.4],
  download: [47.4, 53.8],
  outro: [53.8, 60],
} as const;

const STEPS = [
  { at: T.input, title: "Ввод текста", sub: "Вставьте текст и выделите нужный абзац" },
  { at: T.analyze, title: "Анализ нейросетью", sub: "Нейросеть на вашем компьютере или в облаке читает текст" },
  { at: T.blocks, title: "Разбивка на блоки", sub: "Пункты, цифры и иконки по смыслу" },
  { at: T.form, title: "Выбор схемы", sub: "43 формы в 11 категориях — одним кликом" },
  { at: T.style, title: "Выбор стиля", sub: "12 стилей, четыре новых: Комикс, Чертёж, Конструктивизм, Газета" },
  { at: T.color, title: "Выбор цвета", sub: "10 палитр, свой фон и шрифт" },
  { at: T.download, title: "Скачать", sub: "PNG, PNG без фона для слайдов, SVG для Figma" },
];

const theme = (id: string) => THEMES.find((x) => x.id === id) ?? THEMES[0];

/** Состояния большой схемы (шаги 4–7): что на ней в какой момент; смена — по клику курсора */
type State = { t: number; layout: Layout; style: string; theme: string };
const FORM_LIST: Layout[] = ["steps", "mountains", "target", "roadmap"];
const STYLE_LIST = ["flat", "napkin", "chalk", "premium-night", "comic", "blueprint", "constructivism", "newspaper"];
const NEW_STYLES = new Set(["comic", "blueprint", "constructivism", "newspaper"]);
const STYLE_T = [31.0, 32.0, 32.9, 33.8, 34.9, 36.3, 37.7, 39.1];
const PALETTE_T: [number, string][] = [
  [42.3, "ocean"],
  [43.5, "sunset"],
  [44.7, "neon"],
  [45.9, "forest"],
];
const FORM_T = [22.4, 24.0, 25.4, 26.8];
const GRID = [28.2, 31.0];

const STATES: State[] = [
  ...FORM_LIST.map((layout, i) => ({ t: FORM_T[i], layout, style: "flat", theme: "indigo" })),
  ...STYLE_LIST.slice(1).map((style, i) => ({ t: STYLE_T[i + 1], layout: "roadmap" as Layout, style, theme: "indigo" })),
  { t: T.color[0], layout: "roadmap", style: "flat", theme: "indigo" },
  ...PALETTE_T.map(([t, th]) => ({ t, layout: "roadmap" as Layout, style: "flat", theme: th })),
];

// ─── Геометрия ───────────────────────────────────────────────
const MAIN = { x: 110, y: 150, w: 1180, h: 720 };
const PANEL = { x: 1340, y: 150, w: 470, h: 720 };
const formItem = (k: number) => ({ x: PANEL.x + 20, y: PANEL.y + 74 + k * 160, w: PANEL.w - 40, h: 148 });
const styleItem = (k: number) => {
  const w = (PANEL.w - 52) / 2;
  return { x: PANEL.x + 20 + (k % 2) * (w + 12), y: PANEL.y + 74 + Math.floor(k / 2) * 160, w, h: 148 };
};
const paletteItem = (k: number) => ({ cx: PANEL.x + 19 + 36 + (k % 5) * 90 + 12, cy: PANEL.y + 140 + Math.floor(k / 5) * 96 });
/** Номер последнего момента, который уже наступил */
const lastAt = (times: number[], t: number) => times.reduce((acc, x, i) => (t >= x ? i : acc), -1);
const center = (r: { x: number; y: number; w: number; h: number }) => [r.x + r.w / 2, r.y + r.h / 2] as [number, number];

/** Фон, который рисует схема в этом стиле и палитре — им заливаем карточку, чтобы не было белых полей */
const bgOf = (style: string, th: Theme) => new Paint(styleById(style), th, visual).base.bg;

// ─── Детали ──────────────────────────────────────────────────
function Cursor({ x, y, press }: { x: number; y: number; press: number }) {
  return (
    <svg width="42" height="50" viewBox="0 0 20 24" style={{ position: "absolute", left: x, top: y, zIndex: 20, transform: `scale(${1 - press * 0.15})`, transformOrigin: "0 0", filter: "drop-shadow(0 4px 6px rgba(0,0,0,0.4))" }}>
      <path d="M1 1 L1 19 L6 14.5 L9.5 22 L12.5 20.6 L9 13.4 L16 13.4 Z" fill="#fff" stroke="#0B1220" strokeWidth="1.4" strokeLinejoin="round" />
    </svg>
  );
}

/** Курсор по маршруту [время, x, y]; клик — в моменты presses */
function cursorAt(t: number, path: [number, number, number][], presses: number[]) {
  let x = path[0][1];
  let y = path[0][2];
  for (let i = 1; i < path.length; i++) {
    const [t1, x1, y1] = path[i];
    const [t0] = path[i - 1];
    if (t >= t0) {
      const k = eInOut(prog(t, t0, t1));
      x = path[i - 1][1] + (x1 - path[i - 1][1]) * k;
      y = path[i - 1][2] + (y1 - path[i - 1][2]) * k;
    }
  }
  const press = Math.max(0, ...presses.map((p) => prog(t, p - 0.12, p) - prog(t, p, p + 0.15)));
  return { x, y, press };
}

/** Маршрут к нескольким целям: подлетаем к каждой за 0.6 с до клика */
function routeTo(targets: [number, number, number][], start: [number, number, number]) {
  const path: [number, number, number][] = [start];
  for (const [t, x, y] of targets) {
    path.push([t - 0.65, path[path.length - 1][1], path[path.length - 1][2]]);
    path.push([t - 0.08, x, y]);
  }
  return path;
}

function Panel({ title, children, style }: { title: string; children?: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ position: "absolute", left: PANEL.x, top: PANEL.y, width: PANEL.w, height: PANEL.h, borderRadius: 26, background: "rgba(15,26,48,0.92)", border: "1px solid rgba(255,255,255,0.1)", boxShadow: "0 30px 70px rgba(0,0,0,0.4)", ...style }}>
      <div style={{ position: "absolute", left: 24, top: 22, font: `800 26px ${FONT}`, color: "#fff" }}>{title}</div>
      {children}
    </div>
  );
}

function StepStrip({ t }: { t: number }) {
  const o = Math.min(eOut(prog(t, 3.6, 4.2)), 1 - eInOut(prog(t, 53.4, 53.9)));
  if (o <= 0.001) return null;
  const cur = STEPS.findIndex((s) => t >= s.at[0] && t < s.at[1]);
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: 44, display: "flex", justifyContent: "center", gap: 12, opacity: o, zIndex: 10 }}>
      {STEPS.map((s, i) => {
        const done = t >= s.at[1];
        const on = i === cur;
        return (
          <div
            key={i}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "9px 18px 9px 10px",
              borderRadius: 999,
              font: `700 21px ${FONT}`,
              color: on ? "#fff" : done ? "#BFD4F2" : "#6F86B3",
              background: on ? BLUE : done ? "rgba(37,141,232,0.16)" : "rgba(255,255,255,0.05)",
              border: `1px solid ${on ? BLUE : "rgba(255,255,255,0.1)"}`,
              transform: `scale(${on ? 1.06 : 1})`,
            }}
          >
            <span style={{ width: 30, height: 30, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", font: `800 16px ${FONT}`, background: on ? "#fff" : done ? "rgba(37,141,232,0.5)" : "rgba(255,255,255,0.08)", color: on ? BLUE : "#fff" }}>
              {done ? "✓" : i + 1}
            </span>
            {s.title}
          </div>
        );
      })}
    </div>
  );
}

function StepCaption({ t }: { t: number }) {
  return (
    <>
      {STEPS.map((s, i) => {
        const v = vis(t, s.at[0] + 0.25, s.at[1], 0.35);
        if (v <= 0.001) return null;
        const y = (1 - eOut(prog(t, s.at[0] + 0.25, s.at[0] + 0.8))) * 24;
        return (
          <div key={i} style={{ position: "absolute", left: 0, right: 0, bottom: 52, display: "flex", justifyContent: "center", opacity: v, transform: `translateY(${y}px)`, zIndex: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 20, padding: "14px 34px 14px 16px", borderRadius: 999, background: "rgba(10,20,40,0.72)", border: "1px solid rgba(255,255,255,0.14)" }}>
              <span style={{ width: 52, height: 52, borderRadius: "50%", background: BLUE, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", font: `800 26px ${FONT}` }}>{i + 1}</span>
              <span style={{ font: `800 36px ${FONT}`, color: "#fff", letterSpacing: "-0.3px" }}>{s.title}</span>
              <span style={{ font: `500 30px ${FONT}`, color: "#BFD0EC" }}>— {s.sub}</span>
            </div>
          </div>
        );
      })}
    </>
  );
}

// ─── Заставка ────────────────────────────────────────────────
function Intro({ t }: { t: number }) {
  const k = eBack(prog(t, 0.1, 1.1));
  const word = "Салфетка";
  return (
    <Scene t={t} a={T.intro[0]} b={T.intro[1]}>
      <div style={{ position: "absolute", left: 0, right: 0, top: 200, display: "flex", flexDirection: "column", alignItems: "center" }}>
        <img src="/brand/logo-dark.png" alt="" style={{ height: 300, transform: `scale(${0.55 + 0.45 * k})`, filter: `blur(${(1 - eOut(prog(t, 0.1, 0.9))) * 14}px) drop-shadow(0 20px 60px rgba(37,141,232,0.45))` }} />
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
        <div style={{ marginTop: 18, font: `600 46px ${FONT}`, color: "#A9C6E4", opacity: eOut(prog(t, 1.6, 2.2)) }}>
          Как текст превращается в схему — за&nbsp;7&nbsp;шагов
        </div>
      </div>
    </Scene>
  );
}

// ─── Шаги 1–3: ввод, анализ, разбивка ────────────────────────
const STAGES = ["Читаю текст", "Выбираю форму", "Подбираю иконки", "Рисую схему"];
const STAGE_T = [10.2, 11.4, 12.6, 13.8];
const POP_T = 16.3;
const POP_STEP = 0.8;

function TextToBlocks({ t }: { t: number }) {
  const ref = useRef<HTMLDivElement>(null);
  usePop(ref, t, POP_T, POP_STEP);
  const full = data.text;
  const typed = Math.floor(full.length * eInOut(prog(t, 4.4, 6.6)));
  const sel0 = full.indexOf("Сначала");
  const sel1 = sel0 + Math.floor((full.length - sel0) * eOut(prog(t, 6.9, 7.5)));
  const shown = full.slice(0, typed);
  const c = cursorAt(t, [[7.3, 620, 560], [8.0, 430, 828]], [8.25]);
  const busy = t >= 8.25 && t < T.blocks[0];
  const toList = eInOut(prog(t, T.blocks[0], T.blocks[0] + 0.6));
  const waiting = vis(t, 8.5, T.blocks[0] + 0.3, 0.4);
  const empty = 1 - eOut(prog(t, 8.3, 8.8));
  const result = eOut(prog(t, T.blocks[0], T.blocks[0] + 0.5));
  const card = { x: 110, y: 150, w: 660, h: 760 };
  const right = { x: 830, y: 150, w: 980, h: 760 };
  return (
    <Scene t={t} a={T.input[0]} b={T.blocks[1]}>
      {/* левая карточка: текст, потом — найденные блоки */}
      <Card {...card} style={{ transform: `translateY(${(1 - eOut(prog(t, 4.0, 4.6))) * 40}px)` }}>
        <div style={{ position: "absolute", inset: 0, opacity: 1 - toList }}>
          <div style={{ padding: "26px 32px 0", font: `700 18px ${FONT}`, color: "#64748B", letterSpacing: "1.5px" }}>ТЕКСТ</div>
          <div style={{ padding: "16px 32px", font: `500 25px/1.55 ${FONT}`, color: "#1E293B", whiteSpace: "pre-wrap", height: 540 }}>
            {shown.slice(0, Math.min(sel0, typed))}
            <span style={{ background: "rgba(37,141,232,0.2)", borderRadius: 4 }}>{shown.slice(sel0, Math.max(sel0, Math.min(sel1, typed)))}</span>
            {shown.slice(Math.max(sel0, Math.min(sel1, typed)))}
            {t < 6.9 && <span style={{ display: "inline-block", width: 3, height: 30, background: BLUE, verticalAlign: "middle", opacity: Math.floor(t * 3) % 2 ? 1 : 0 }} />}
          </div>
          <div style={{ position: "absolute", left: 32, right: 32, bottom: 36, height: 74, borderRadius: 16, background: busy ? "#7FA9D6" : BLUE, color: "#fff", font: `700 28px ${FONT}`, display: "flex", alignItems: "center", justifyContent: "center", gap: 12, transform: `scale(${1 - c.press * 0.06})` }}>
            {busy ? "Рисую схему…" : "✦ Визуализировать"}
          </div>
        </div>
        <div style={{ position: "absolute", inset: 0, opacity: toList, padding: "26px 32px" }}>
          <div style={{ font: `700 18px ${FONT}`, color: "#64748B", letterSpacing: "1.5px" }}>НАЙДЕНО БЛОКОВ: {visual.items.length}</div>
          {visual.items.map((it, i) => {
            const k = eBack(prog(t, POP_T + i * POP_STEP, POP_T + i * POP_STEP + 0.5));
            const color = THEMES[0].palette[i];
            return (
              <div key={i} style={{ marginTop: i ? 16 : 26, display: "flex", alignItems: "center", gap: 18, padding: "16px 20px", borderRadius: 16, background: "#F4F7FC", borderLeft: `6px solid ${color}`, opacity: clamp(k * 1.5), transform: `translateX(${(1 - k) * -40}px)` }}>
                <span style={{ font: `800 22px ${FONT}`, color }}>{String(i + 1).padStart(2, "0")}</span>
                <span style={{ flex: 1, font: `700 27px ${FONT}`, color: "#1E293B" }}>{it.label}</span>
                {it.value && <span style={{ font: `800 22px ${FONT}`, color, background: `${color}1A`, padding: "4px 12px", borderRadius: 999 }}>{it.value}</span>}
              </div>
            );
          })}
        </div>
        {t > 7.2 && t < 8.9 && <Cursor x={c.x} y={c.y} press={c.press} />}
      </Card>

      {/* правая карточка: пусто → ожидание → схема */}
      <Card {...right} style={{ background: "#F7F9FD" }}>
        {empty > 0.01 && (
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", opacity: empty * 0.9 }}>
            <img src="/brand/logo.png" alt="" style={{ height: 150, opacity: 0.55 }} />
            <div style={{ marginTop: 20, font: `700 30px ${FONT}`, color: "#94A3B8" }}>Здесь появится схема</div>
          </div>
        )}
        {waiting > 0.01 && (
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", opacity: waiting }}>
            <img src="/brand/logo.png" alt="" style={{ height: 130, transform: `translateY(${Math.sin(t * 3) * 6}px)` }} />
            <div style={{ marginTop: 34, display: "flex", flexDirection: "column", gap: 20 }}>
              {STAGES.map((s, i) => {
                const on = t >= STAGE_T[i];
                const done = t >= STAGE_T[i] + 1.2;
                return (
                  <div key={s} style={{ display: "flex", alignItems: "center", gap: 18, font: `700 32px ${FONT}`, color: done ? "#16A34A" : on ? "#1E293B" : "#B6C2D3", opacity: eOut(prog(t, STAGE_T[i] - 0.6, STAGE_T[i] - 0.2)) * 0.6 + 0.4 }}>
                    <span style={{ width: 40, height: 40, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", background: done ? "#16A34A" : "transparent", border: done ? "none" : `4px solid ${on ? "#D6E4F5" : "#E2E8F0"}`, color: "#fff", font: `800 22px ${FONT}`, position: "relative", boxSizing: "border-box" }}>
                      {done ? "✓" : on && <span style={{ position: "absolute", inset: -4, borderRadius: "50%", border: `4px solid transparent`, borderTopColor: BLUE, transform: `rotate(${t * 400}deg)` }} />}
                    </span>
                    {s}
                  </div>
                );
              })}
            </div>
          </div>
        )}
        {result > 0.01 && (
          <div ref={ref} style={{ ...fill, padding: 16, boxSizing: "border-box", opacity: result, position: "absolute", inset: 0, background: "#fff" }}>
            <VisualSvg visual={visual} layout="steps" theme={THEMES[0]} style={styleById("flat")} className="promo-svg" />
          </div>
        )}
      </Card>
    </Scene>
  );
}

// ─── Шаги 4–7: схема, стиль, цвет, скачать ───────────────────
function MainVisual({ t }: { t: number }) {
  let i = 0;
  for (let k = 0; k < STATES.length; k++) if (t >= STATES[k].t) i = k;
  const cur = STATES[i];
  const prev = STATES[Math.max(0, i - 1)];
  const p = i === 0 ? 1 : eInOut(prog(t, cur.t, cur.t + 0.55));
  const layer = (s: State, clip?: number) => (
    <div style={{ position: "absolute", inset: 0, background: bgOf(s.style, theme(s.theme)), clipPath: clip === undefined ? undefined : `inset(0 ${(1 - clip) * 100}% 0 0)` }}>
      <div style={{ ...fill, padding: 14, boxSizing: "border-box" }}>
        <VisualSvg visual={visual} layout={s.layout} theme={theme(s.theme)} style={styleById(s.style)} className="promo-svg" />
      </div>
    </div>
  );
  return (
    <>
      {p < 1 && layer(prev)}
      {layer(cur, p < 1 ? p : undefined)}
      {/* полоса стирания: где проходит граница смены */}
      {p > 0 && p < 1 && <div style={{ position: "absolute", top: 0, bottom: 0, left: `${p * 100}%`, width: 4, background: BLUE, boxShadow: `0 0 24px ${BLUE}` }} />}
    </>
  );
}

function Thumb({ layout, style = "flat", th = "indigo" }: { layout: Layout; style?: string; th?: string }) {
  return (
    <div style={{ ...fill, background: bgOf(style, theme(th)), borderRadius: 10, overflow: "hidden" }}>
      <VisualSvg visual={visual} layout={layout} theme={theme(th)} style={styleById(style)} className="promo-svg" />
    </div>
  );
}

function Builder({ t }: { t: number }) {
  const gridV = vis(t, GRID[0], GRID[1], 0.45);
  const mainV = 1 - gridV;
  const tab = t < T.style[0] ? "form" : t < T.color[0] ? "style" : t < T.download[0] ? "color" : "download";
  const tabV = (a: number, b: number) => vis(t, a, b, 0.35);

  // курсор: формы → стили → палитры → скачать
  const formClicks = FORM_T.slice(1).map((ft, k): [number, number, number] => [ft, ...center(formItem(k + 1))]);
  const styleClicks = STYLE_T.slice(1).map((st, k): [number, number, number] => [st, ...center(styleItem(k + 1))]);
  const palClicks = PALETTE_T.map(([pt, id]): [number, number, number] => {
    const c = paletteItem(THEMES.findIndex((x) => x.id === id));
    return [pt, c.cx, c.cy];
  });
  const dl: [number, number, number][] = [
    [48.6, 1575, 290],
    [49.9, 1575, 398],
  ];
  const all = [...formClicks, ...styleClicks, ...palClicks, ...dl];
  const c = cursorAt(t, routeTo(all, [23.2, 1200, 700]), all.map((x) => x[0]));
  const cursorV = t > 23.2 && t < 50.8 && !(t > GRID[0] - 0.2 && t < GRID[1] + 0.3);

  const shrink = eInOut(prog(t, 50.0, 50.6));
  const toast = eBack(prog(t, 50.5, 51.1));

  return (
    <Scene t={t} a={T.form[0]} b={T.download[1]}>
      <div style={{ position: "absolute", inset: 0, opacity: mainV }}>
        <Card {...MAIN} style={{ transform: `scale(${1 - shrink * 0.06}) translateY(${shrink * -10}px)` }}>
          <MainVisual t={t} />
        </Card>

        {/* панель «Форма» */}
        {tab === "form" && (
          <Panel title="Форма" style={{ opacity: tabV(T.form[0], T.form[1]) }}>
            {FORM_LIST.map((l, k) => {
              const r = formItem(k);
              const on = lastAt(FORM_T, t) === k;
              return (
                <div key={l} style={{ position: "absolute", left: r.x - PANEL.x, top: r.y - PANEL.y, width: r.w, height: r.h, borderRadius: 16, background: "#fff", boxShadow: on ? `0 0 0 4px ${BLUE}` : "none", overflow: "hidden", display: "flex", alignItems: "center", gap: 14, padding: 10, boxSizing: "border-box" }}>
                  <div style={{ width: 220, height: 124, flex: "none" }}>
                    <Thumb layout={l} />
                  </div>
                  <span style={{ font: `800 26px ${FONT}`, color: "#1E293B" }}>{LAYOUT_LABELS[l]}</span>
                </div>
              );
            })}
          </Panel>
        )}

        {/* панель «Стиль» */}
        {tab === "style" && (
          <Panel title="Стиль" style={{ opacity: tabV(T.style[0], T.style[1]) }}>
            {STYLE_LIST.map((s, k) => {
              const r = styleItem(k);
              const on = lastAt(STYLE_T, t) === k;
              const isNew = NEW_STYLES.has(s);
              return (
                <div key={s} style={{ position: "absolute", left: r.x - PANEL.x, top: r.y - PANEL.y, width: r.w, height: r.h, borderRadius: 14, background: "rgba(255,255,255,0.06)", boxShadow: on ? `0 0 0 4px ${BLUE}` : "0 0 0 1px rgba(255,255,255,0.1)", padding: 8, boxSizing: "border-box" }}>
                  <div style={{ height: 96, position: "relative" }}>
                    <Thumb layout="roadmap" style={s} />
                    {isNew && <span style={{ position: "absolute", right: 6, top: 6, font: `800 13px ${FONT}`, color: "#1B1400", background: "#FFD23F", padding: "3px 9px", borderRadius: 999, boxShadow: "0 2px 6px rgba(0,0,0,0.3)" }}>НОВОЕ</span>}
                  </div>
                  <div style={{ marginTop: 8, font: `700 19px ${FONT}`, color: isNew ? "#FFE08A" : "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{styleById(s).name}</div>
                </div>
              );
            })}
          </Panel>
        )}

        {/* панель «Дополнительно»: палитра */}
        {tab === "color" && (
          <Panel title="Палитра" style={{ opacity: tabV(T.color[0], T.color[1]) }}>
            {THEMES.map((th, k) => {
              const pc = paletteItem(k);
              const active = ["indigo", ...PALETTE_T.filter(([pt]) => t >= pt).map(([, id]) => id)].pop() === th.id;
              return (
                <div
                  key={th.id}
                  style={{
                    position: "absolute",
                    left: pc.cx - PANEL.x - 36,
                    top: pc.cy - PANEL.y - 36,
                    width: 72,
                    height: 72,
                    borderRadius: "50%",
                    background: `conic-gradient(${th.palette[0]} 0 25%, ${th.palette[1]} 0 50%, ${th.palette[2]} 0 75%, ${th.palette[3]} 0 100%)`,
                    boxShadow: active ? `0 0 0 4px #0F1A30, 0 0 0 8px ${BLUE}` : "0 0 0 2px rgba(255,255,255,0.15)",
                  }}
                />
              );
            })}
            <div style={{ position: "absolute", left: 24, top: 360, font: `700 22px ${FONT}`, color: "#93A7C2" }}>Фон</div>
            <div style={{ position: "absolute", left: 24, top: 400, display: "flex", gap: 10 }}>
              {["#FFFFFF", "#FFFDF7", "#F3F4F6", "#EEF4FF", "#FFF4E5", "#EEF7EE", "#1F2937", "#0F172A"].map((b) => (
                <span key={b} style={{ width: 42, height: 42, borderRadius: 10, background: b, border: "1px solid rgba(255,255,255,0.2)" }} />
              ))}
            </div>
            <div style={{ position: "absolute", left: 24, top: 480, font: `700 22px ${FONT}`, color: "#93A7C2" }}>Шрифт</div>
            <div style={{ position: "absolute", left: 24, right: 24, top: 520, height: 60, borderRadius: 14, border: "1px solid rgba(255,255,255,0.15)", display: "flex", alignItems: "center", padding: "0 18px", font: `600 24px ${FONT}`, color: "#DCE7FB" }}>Как в стиле</div>
          </Panel>
        )}

        {/* скачать */}
        {tab === "download" && (
          <Panel title="Скачать" style={{ opacity: tabV(T.download[0], T.download[1]) }}>
            <div style={{ position: "absolute", left: 40, right: 40, top: 100, height: 80, borderRadius: 18, background: BLUE, color: "#fff", font: `800 30px ${FONT}`, display: "flex", alignItems: "center", justifyContent: "center", gap: 14, transform: `scale(${1 - c.press * 0.05})` }}>
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 4v11M7 10l5 5 5-5M5 20h14" /></svg>
              Скачать
            </div>
            {[
              ["PNG", "для документов и постов"],
              ["PNG без фона", "для слайдов"],
              ["SVG", "вектор для Figma"],
              ["Копировать", "в буфер обмена"],
            ].map(([a, b], i) => {
              const k = eOut(prog(t, 48.75 + i * 0.08, 49.15 + i * 0.08));
              const hot = i === 0 && t > 49.8 && t < 50.6;
              return (
                <div key={a} style={{ position: "absolute", left: 40, right: 40, top: 210 + i * 92, height: 78, borderRadius: 14, background: hot ? "#E8F2FF" : "#fff", opacity: k, transform: `translateY(${(1 - k) * -20}px)`, display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 22px" }}>
                  <span style={{ font: `800 26px ${FONT}`, color: "#1E293B" }}>{a}</span>
                  <span style={{ font: `500 19px ${FONT}`, color: "#64748B" }}>{b}</span>
                </div>
              );
            })}
            {toast > 0.01 && (
              <div style={{ position: "absolute", left: 30, right: 30, bottom: 34, height: 92, borderRadius: 18, background: "#16A34A", color: "#fff", display: "flex", alignItems: "center", gap: 16, padding: "0 22px", opacity: clamp(toast * 1.5), transform: `scale(${0.7 + 0.3 * toast})` }}>
                <span style={{ font: `800 40px ${FONT}` }}>✓</span>
                <span style={{ display: "flex", flexDirection: "column" }}>
                  <b style={{ font: `800 25px ${FONT}` }}>Файл сохранён</b>
                  <span style={{ font: `500 19px ${FONT}`, opacity: 0.9 }}>zapusk-produkta.png</span>
                </span>
              </div>
            )}
          </Panel>
        )}

        {cursorV && <Cursor x={c.x} y={c.y} press={c.press} />}
      </div>

      {/* миг «все 43 формы» */}
      {gridV > 0.01 && <FormGrid t={t} o={gridV} />}
    </Scene>
  );
}

function FormGrid({ t, o }: { t: number; o: number }) {
  const cols = 9;
  const pad = 110;
  const gap = 12;
  const top = 140;
  const w = (1920 - 2 * pad - (cols - 1) * gap) / cols;
  const h = 128;
  return (
    <div style={{ position: "absolute", inset: 0, opacity: o }}>
      {ALL.map((l, i) => {
        const k = eBack(prog(t, GRID[0] + i * 0.02, GRID[0] + i * 0.02 + 0.5));
        const col = i % cols;
        const row = Math.floor(i / cols);
        return (
          <div key={l} style={{ position: "absolute", left: pad + col * (w + gap), top: top + row * (h + gap), width: w, height: h, borderRadius: 12, background: "#fff", overflow: "hidden", transform: `scale(${0.3 + 0.7 * k})`, opacity: clamp(k * 1.5), padding: 4, boxSizing: "border-box" }}>
            <VisualSvg visual={SAMPLE[l] ?? visual} layout={l} theme={THEMES[0]} style={styleById("flat")} className="promo-svg" />
          </div>
        );
      })}
    </div>
  );
}

// ─── Финал ───────────────────────────────────────────────────
function Outro({ t }: { t: number }) {
  const a = T.outro[0];
  const k = eBack(prog(t, a + 0.1, a + 1.0));
  const q = (x: number) => eOut(prog(t, a + x, a + x + 0.5));
  return (
    <Scene t={t} a={a} b={T.outro[1] + 1}>
      <div style={{ position: "absolute", left: 0, right: 0, top: 190, display: "flex", flexDirection: "column", alignItems: "center" }}>
        <img src="/brand/logo-dark.png" alt="" style={{ height: 270, transform: `scale(${0.6 + 0.4 * k})`, filter: "drop-shadow(0 20px 60px rgba(37,141,232,0.45))" }} />
        <div style={{ marginTop: 20, font: `800 130px ${FONT}`, color: "#fff", letterSpacing: "-3px", opacity: q(0.5), transform: `translateY(${(1 - q(0.5)) * 30}px)` }}>Салфетка</div>
        <div style={{ marginTop: 10, font: `600 46px ${FONT}`, color: "#A9C6E4", opacity: q(1.0) }}>
          Текст <span style={{ color: BLUE }}>→</span> схема за секунды
        </div>
        <div style={{ marginTop: 50, display: "flex", gap: 16 }}>
          {["43 формы", "12 стилей", "Бесплатно"].map((s, i) => (
            <span key={s} style={{ font: `700 34px ${FONT}`, color: "#DCE7FB", padding: "12px 30px", borderRadius: 999, background: "rgba(37,141,232,0.14)", border: "1px solid rgba(37,141,232,0.45)", opacity: q(1.6 + i * 0.15), transform: `scale(${0.85 + 0.15 * q(1.6 + i * 0.15)})` }}>
              {s}
            </span>
          ))}
        </div>
      </div>
    </Scene>
  );
}

export function PromoSteps() {
  const t = useTimeline(STEPS_DURATION);
  return (
    <div style={{ position: "relative", width: 1920, height: 1080, overflow: "hidden", fontFamily: FONT }}>
      <style>{`.promo-svg { width: 100%; height: 100%; display: block; }`}</style>
      <Backdrop t={t} />
      <Intro t={t} />
      <TextToBlocks t={t} />
      <Builder t={t} />
      <Outro t={t} />
      <StepStrip t={t} />
      <StepCaption t={t} />
    </div>
  );
}
