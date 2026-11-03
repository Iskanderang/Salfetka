import { useCallback, useRef, useState } from "react";
import { useDismiss } from "./useDismiss";
import { TEXT_LIMITS } from "@napkin/shared";
import { Ico } from "./render/primitives";

/** Значок-подсказка рядом с кнопкой запуска: как подавать текст, чтобы схема получилась точной. Для схем и для процессов — своя. */
export function RunTip({ onMore, mode = "visual" }: { onMore: () => void; mode?: "visual" | "process" }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useDismiss(ref, open, close);

  return (
    <div className="run-tip" ref={ref}>
      <button className={`icon-btn run-tip-btn ${open ? "active" : ""}`} onClick={() => setOpen(!open)} title="Как подать текст" aria-expanded={open}>
        <Ico name="lightbulb" size={18} />
      </button>
      {open && (
        <div className="run-tip-card" role="dialog" aria-label="Как подать текст">
          {mode === "process" ? (
            <>
              <b className="run-tip-title">Как описать процесс</b>
              <ul>
                <li>
                  <b>Кто и что делает:</b> назовите исполнителей и их действия — «Менеджер проверяет заявку». Из них получатся дорожки.
                </li>
                <li>
                  <b>Проверки и варианты:</b> «если сумма больше 100 тыс. — согласует директор, иначе — руководитель».
                </li>
                <li>
                  <b>Возвраты и результат:</b> «возвращает на доработку», «заказ оплачен», «отказ клиенту».
                </li>
                <li>
                  До 15–20 шагов и <b>до {TEXT_LIMITS.process.toLocaleString("ru-RU")} символов</b> за раз — большой процесс разбейте на этапы. Счётчик — под кнопкой.
                </li>
              </ul>
              <p className="run-tip-flow">Описали → Нарисовать процесс → скачать или править в Draw.io</p>
            </>
          ) : (
            <>
              <b className="run-tip-title">Один фрагмент — одна схема</b>
              <ul>
                <li>
                  Выделяйте <b>абзац, список или блок</b> на 3–8 пунктов, а не весь текст.
                </li>
                <li>Из длинного текста модель возьмёт только главное и потеряет детали.</li>
                <li>Салфетка не собирает презентацию — она рисует ровно тот кусок, что вы дали.</li>
                <li>
                  За раз — <b>до {TEXT_LIMITS.visual.toLocaleString("ru-RU")} символов</b>, это полторы-две страницы. Счётчик — под кнопкой.
                </li>
              </ul>
              <p className="run-tip-flow">Выделили → Визуализировать → следующий фрагмент</p>
            </>
          )}
          <button
            className="link"
            onClick={() => {
              setOpen(false);
              onMore();
            }}
          >
            {mode === "process" ? "Подробнее и пример →" : "Подробнее и примеры →"}
          </button>
        </div>
      )}
    </div>
  );
}
