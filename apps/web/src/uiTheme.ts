/** Тема интерфейса: сохранённая или как в системе. Ставим до первой отрисовки, чтобы не мелькала светлая. */
export function initialUiTheme(): "light" | "dark" {
  try {
    const saved = JSON.parse(localStorage.getItem("nf.uiTheme") ?? "null");
    if (saved === "light" || saved === "dark") return saved;
  } catch {
    /* нет сохранённой темы */
  }
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}
