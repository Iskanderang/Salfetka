import { useState } from "react";
import { FONTS, fontById, loadFont } from "./render/fonts";
import { clearTextCache } from "./render/text";
import { DEFAULT_LOOK, type Look } from "./render/paint";
import type { StyleDef } from "./render/styles";
import { Ico } from "./render/primitives";

type Props = { look: Look; onChange: (look: Look) => void; style: StyleDef; autoColor: string; colorIgnored: boolean; autoBg: string };

const BACKGROUNDS = [
  { c: "#FFFFFF", name: "Белый" },
  { c: "#FFFDF7", name: "Бумага" },
  { c: "#F3F4F6", name: "Светло-серый" },
  { c: "#EEF4FF", name: "Голубой" },
  { c: "#FFF4E5", name: "Персик" },
  { c: "#EEF7EE", name: "Мятный" },
  { c: "#1F2937", name: "Графит" },
  { c: "#0F172A", name: "Ночь" },
];

const WEIGHTS: { v: Look["weight"]; label: string }[] = [
  { v: -1, label: "Тоньше" },
  { v: 0, label: "Обычный" },
  { v: 1, label: "Жирнее" },
];

/** Оформление: шрифт, размер, жирность и цвет текста, фон схемы, интенсивность штриховки. */
export function LookPanel({ look, onChange, style, autoColor, colorIgnored, autoBg }: Props) {
  const [loading, setLoading] = useState(false);
  const set = (patch: Partial<Look>) => onChange({ ...look, ...patch });

  async function pickFont(id: string) {
    const f = fontById(id || undefined);
    setLoading(true);
    await loadFont(f);
    // замеры текста запасным шрифтом больше не годятся
    clearTextCache();
    setLoading(false);
    set({ font: f?.id });
  }

  const changed = JSON.stringify({ ...DEFAULT_LOOK, ...look }) !== JSON.stringify(DEFAULT_LOOK);

  return (
    <div className="look-panel">
      <span className="look-title">Аа Оформление</span>

      <label className="look-field">
        <span>Шрифт</span>
        <select value={look.font ?? ""} onChange={(e) => pickFont(e.target.value)} disabled={loading}>
          <option value="">Как в стиле</option>
          {FONTS.map((f) => (
            <option key={f.id} value={f.id} style={{ fontFamily: f.stack }}>
              {f.name}
            </option>
          ))}
        </select>
      </label>

      <div className="look-field">
        <span>Размер</span>
        <div className="stepper">
          <button onClick={() => set({ size: Math.max(0.8, +(look.size - 0.1).toFixed(1)) })} disabled={look.size <= 0.8} aria-label="Меньше">
            −
          </button>
          <b>{Math.round(look.size * 100)}%</b>
          <button onClick={() => set({ size: Math.min(1.4, +(look.size + 0.1).toFixed(1)) })} disabled={look.size >= 1.4} aria-label="Больше">
            +
          </button>
        </div>
      </div>

      <div className="look-field">
        <span>Жирность</span>
        <div className="segmented">
          {WEIGHTS.map((w) => (
            <button key={w.v} className={look.weight === w.v ? "active" : ""} style={{ fontWeight: w.v > 0 ? 800 : w.v < 0 ? 400 : 600 }} onClick={() => set({ weight: w.v })}>
              {w.label}
            </button>
          ))}
        </div>
      </div>

      <div className="look-field">
        <span>Цвет</span>
        <div className="color-pick">
          <label className="color-swatch" title="Свой цвет текста" style={{ background: look.color ?? autoColor }}>
            <input type="color" value={(look.color ?? autoColor).slice(0, 7)} onChange={(e) => set({ color: e.target.value })} />
          </label>
          <button className="link" onClick={() => set({ color: undefined })} disabled={!look.color}>
            авто
          </button>
        </div>
        {colorIgnored && <span className="look-warn">не читается на этом фоне — взят цвет стиля</span>}
      </div>

      <div className="look-field">
        <span>Фон</span>
        <div className="bg-row">
          <button className={`bg-dot auto ${!look.bg ? "active" : ""}`} title="Фон стиля и палитры" style={{ background: autoBg }} onClick={() => set({ bg: undefined })}>
            A
          </button>
          {BACKGROUNDS.map((b) => (
            <button
              key={b.c}
              className={`bg-dot ${look.bg?.toLowerCase() === b.c.toLowerCase() ? "active" : ""}`}
              title={b.name}
              style={{ background: b.c }}
              onClick={() => set({ bg: b.c })}
            />
          ))}
          <label className="bg-dot custom" title="Свой цвет фона">
            <input type="color" value={(look.bg ?? autoBg).slice(0, 7)} onChange={(e) => set({ bg: e.target.value })} />
            <Ico name="pipette" size={14} />
          </label>
        </div>
      </div>

      {style.sketch && (
        <label className="look-field grow">
          <span>Интенсивность {style.id === "chalk" ? "мела" : "маркера"}</span>
          <div className="range-row">
            <input type="range" min={15} max={100} step={5} value={Math.round(look.intensity * 100)} onChange={(e) => set({ intensity: Number(e.target.value) / 100 })} />
            <b>{Math.round(look.intensity * 100)}%</b>
          </div>
        </label>
      )}

      {changed && (
        <button className="link reset" onClick={() => onChange(DEFAULT_LOOK)}>
          сбросить
        </button>
      )}
    </div>
  );
}
