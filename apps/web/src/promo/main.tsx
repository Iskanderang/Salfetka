import { createRoot } from "react-dom/client";
import "@fontsource/manrope/400.css";
import "@fontsource/manrope/600.css";
import "@fontsource/manrope/700.css";
import "@fontsource/manrope/800.css";
import "../render/fonts";
import { clearTextCache } from "../render/text";
import { Promo } from "./Promo";
import { PromoVertical } from "./PromoVertical";

// схемы меряют текст по шрифту — ждём шрифты, иначе раскладка посчитается по запасному
document.fonts.ready.then(() => {
  clearTextCache();
  // ?format=v — вертикальная версия 1080×1920 для Shorts, Reels и клипов
  const vertical = new URLSearchParams(location.search).get("format") === "v";
  createRoot(document.getElementById("root")!).render(vertical ? <PromoVertical /> : <Promo />);
});
