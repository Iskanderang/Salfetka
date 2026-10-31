import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App";
import { clearTextCache } from "./render/text";
import { fontById, loadFont } from "./render/fonts";
import { initialUiTheme } from "./uiTheme";
import "./styles.css";

// Ширину текста меряем по настоящему шрифту, поэтому ждём рукописный шрифт до первого рендера.
document.documentElement.dataset.theme = initialUiTheme();

async function boot() {
  // рукописный шрифт стилей «Салфетка»/«Доска» и шрифт, выбранный пользователем в прошлый раз
  let saved: string | undefined;
  try {
    saved = JSON.parse(localStorage.getItem("nf.look") ?? "{}").font;
  } catch {
    /* нет сохранённых настроек */
  }
  await Promise.all([loadFont(fontById("caveat")), loadFont(fontById(saved))]);
  clearTextCache();
  ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
}
boot();
