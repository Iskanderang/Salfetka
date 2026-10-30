import React from "react";
import ReactDOM from "react-dom/client";
import "@fontsource/caveat/400.css";
import "@fontsource/caveat/700.css";
import { App } from "./App";
import { clearTextCache } from "./render/text";
import "./styles.css";

// Ширину текста меряем по настоящему шрифту, поэтому ждём рукописный шрифт до первого рендера.
async function boot() {
  try {
    await Promise.all([document.fonts.load('400 20px "Caveat"', "Абв Abc"), document.fonts.load('700 20px "Caveat"', "Абв Abc")]);
  } catch {
    /* без рукописного шрифта тоже работаем */
  }
  clearTextCache();
  ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
}
boot();
