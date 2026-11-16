import { createRoot } from "react-dom/client";
import "@fontsource/manrope/400.css";
import "@fontsource/manrope/600.css";
import "@fontsource/manrope/700.css";
import "@fontsource/manrope/800.css";
import { loadFont, styleFonts } from "../render/fonts";
import { clearTextCache } from "../render/text";
import { Promo } from "./Promo";
import { PromoVertical } from "./PromoVertical";
import { PromoSteps } from "./PromoSteps";

// схемы меряют текст по шрифту — ждём шрифты, иначе раскладка посчитается по запасному
// шрифты стилей («Комикс», «Чертёж» и др.) догружаем заранее — они нужны схемам в ролике
Promise.all([document.fonts.ready, ...styleFonts().map(loadFont)]).then(() => {
  clearTextCache();
  // ?format=v — вертикальная версия 1080×1920 для Shorts, Reels и клипов; ?format=steps — «как это работает» по шагам
  const format = new URLSearchParams(location.search).get("format");
  createRoot(document.getElementById("root")!).render(format === "v" ? <PromoVertical /> : format === "steps" ? <PromoSteps /> : <Promo />);
});
