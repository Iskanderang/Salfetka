import { createRoot } from "react-dom/client";
import "@fontsource/manrope/400.css";
import "@fontsource/manrope/600.css";
import "@fontsource/manrope/700.css";
import "@fontsource/manrope/800.css";
import "../render/fonts";
import { clearTextCache } from "../render/text";
import { Promo } from "./Promo";

// схемы меряют текст по шрифту — ждём шрифты, иначе раскладка посчитается по запасному
document.fonts.ready.then(() => {
  clearTextCache();
  createRoot(document.getElementById("root")!).render(<Promo />);
});
