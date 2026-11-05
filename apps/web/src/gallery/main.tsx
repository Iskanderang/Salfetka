import { createRoot } from "react-dom/client";
import { useState } from "react";
import { LAYOUTS, LAYOUT_LABELS, type ProcessGraph } from "@napkin/shared";
import "@fontsource/manrope/400.css";
import "@fontsource/manrope/700.css";
import { clearTextCache } from "../render/text";
import { loadFont, styleFonts } from "../render/fonts";
import { VisualSvg } from "../render/VisualSvg";
import { ProcessSvg } from "../process/ProcessSvg";
import { STYLES, styleById } from "../render/styles";
import { THEMES } from "../render/themes";
import { SAMPLE, visual } from "../promo/Promo";
import data from "../promo/data.json";

/**
 * Служебная страница разработчика: все формы и процесс в одном стиле и палитре.
 * Открыть: http://localhost:5173/gallery.html?style=comic&theme=comic
 */
function Gallery() {
  const q = new URLSearchParams(location.search);
  const [styleId, setStyle] = useState(q.get("style") ?? "flat");
  const [themeId, setTheme] = useState(q.get("theme") ?? "indigo");
  const style = styleById(styleId);
  const theme = THEMES.find((t) => t.id === themeId) ?? THEMES[0];
  const set = (k: string, v: string) => {
    q.set(k, v);
    history.replaceState(null, "", "?" + q.toString());
  };
  return (
    <>
      <div className="bar">
        <b>Все формы</b>
        <select value={styleId} onChange={(e) => (setStyle(e.target.value), set("style", e.target.value))}>
          {STYLES.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <select value={themeId} onChange={(e) => (setTheme(e.target.value), set("theme", e.target.value))}>
          {THEMES.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </div>
      <div className="grid">
        <figure data-form="process">
          <ProcessSvg process={data.process as ProcessGraph} theme={theme} style={style} />
          <figcaption>Процесс</figcaption>
        </figure>
        {LAYOUTS.map((l) => (
          <figure key={l} data-form={l}>
            <VisualSvg visual={SAMPLE[l] ?? visual} layout={l} theme={theme} style={style} />
            <figcaption>
              {LAYOUT_LABELS[l]} <small>({l})</small>
            </figcaption>
          </figure>
        ))}
      </div>
    </>
  );
}

Promise.all(styleFonts().map(loadFont)).then(() => {
  clearTextCache();
  createRoot(document.getElementById("root")!).render(<Gallery />);
});
