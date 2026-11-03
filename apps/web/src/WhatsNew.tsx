import { useEffect } from "react";
import { CHANNEL_URL, TelegramIcon } from "./ChannelTip";
import { Logo } from "./Logo";
import { Ico } from "./render/primitives";
import { VERSION, releasesSince, type Release } from "./changelog";

const SEEN_KEY = "nf.seenVersion";

/**
 * Что показать при запуске: список выпусков после версии, которую пользователь видел в прошлый раз.
 * Первый запуск (ничего не видел) — окно не нужно, просто запоминаем текущую версию.
 */
export function pendingReleases(): Release[] | null {
  let seen: string | null = null;
  try {
    seen = JSON.parse(localStorage.getItem(SEEN_KEY) ?? "null");
  } catch {
    /* испорченная запись — как первый запуск */
  }
  if (!seen) {
    localStorage.setItem(SEEN_KEY, JSON.stringify(VERSION));
    return null;
  }
  const list = releasesSince(seen);
  return list.length ? list : null;
}

const fmtDate = (d: string) => new Date(d + "T00:00:00").toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" });

/** Окно «Салфетка обновилась» (после обновления) или «Что нового» (по клику на номер версии). */
export function WhatsNew({ releases, updated, onClose }: { releases: Release[]; updated: boolean; onClose: () => void }) {
  const close = () => {
    localStorage.setItem(SEEN_KEY, JSON.stringify(VERSION));
    onClose();
  };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  });
  return (
    <div className="modal-backdrop" onMouseDown={close}>
      <div className="modal whats-new" onMouseDown={(e) => e.stopPropagation()} role="dialog" aria-label={updated ? "Салфетка обновилась" : "Что нового"}>
        <div className="wn-head">
          <Logo size={64} />
          <div>
            <h2>{updated ? "Салфетка обновилась" : "Что нового в Салфетке"}</h2>
            <p className="muted">
              Сейчас у вас версия <b>{VERSION}</b>
            </p>
          </div>
          <button className="icon-btn wn-close" onClick={close} aria-label="Закрыть">
            <Ico name="x" size={18} />
          </button>
        </div>
        <div className="wn-body">
          {releases.map((r) => (
            <section key={r.version} className="wn-release">
              <div className="wn-ver">
                <span className="wn-badge">v{r.version}</span>
                <b>{r.title}</b>
                <small className="muted">{fmtDate(r.date)}</small>
              </div>
              <ul>
                {r.items.map((it, i) => (
                  <li key={i}>
                    <Ico name="sparkles" size={14} />
                    <span>{it}</span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
        <div className="wn-foot">
          <a className="wn-channel" href={CHANNEL_URL} target="_blank" rel="noreferrer">
            <TelegramIcon size={18} />
            Подробнее и планы — в канале автора
          </a>
          <button className="primary" onClick={close}>
            Отлично
          </button>
        </div>
      </div>
    </div>
  );
}

