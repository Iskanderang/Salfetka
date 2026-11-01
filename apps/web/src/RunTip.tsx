import { useEffect, useRef, useState } from "react";
import { Ico } from "./render/primitives";

/** Значок-подсказка рядом с кнопкой «Визуализировать»: как подавать текст, чтобы схемы получались точными. */
export function RunTip({ onMore }: { onMore: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  return (
    <div className="run-tip" ref={ref}>
      <button className={`icon-btn run-tip-btn ${open ? "active" : ""}`} onClick={() => setOpen(!open)} title="Как подать текст" aria-expanded={open}>
        <Ico name="lightbulb" size={18} />
      </button>
      {open && (
        <div className="run-tip-card" role="dialog" aria-label="Как подать текст">
          <b className="run-tip-title">Один фрагмент — одна схема</b>
          <ul>
            <li>
              Выделяйте <b>абзац, список или блок</b> на 3–8 пунктов, а не весь текст.
            </li>
            <li>Из длинного текста модель возьмёт только главное и потеряет детали.</li>
            <li>Салфетка не собирает презентацию — она рисует ровно тот кусок, что вы дали.</li>
          </ul>
          <p className="run-tip-flow">Выделили → Визуализировать → следующий фрагмент</p>
          <button
            className="link"
            onClick={() => {
              setOpen(false);
              onMore();
            }}
          >
            Подробнее и примеры →
          </button>
        </div>
      )}
    </div>
  );
}
