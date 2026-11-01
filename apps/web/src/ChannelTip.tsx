import { useCallback, useRef, useState } from "react";
import { useDismiss } from "./useDismiss";

export const CHANNEL_URL = "https://t.me/ii_eggs";

/** Фирменный знак Telegram: в наборе иконок интерфейса (Lucide) логотипов брендов нет. */
export function TelegramIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" className="tg-ico">
      <circle cx="12" cy="12" r="12" fill="currentColor" />
      <path
        d="M5.4 11.8l11.7-4.5c.54-.2 1.01.13.84.96l-2 9.4c-.15.67-.54.83-1.1.52l-3.05-2.25-1.47 1.42c-.16.16-.3.3-.62.3l.22-3.1 5.64-5.1c.25-.22-.05-.34-.38-.12l-6.97 4.39-3-.94c-.65-.2-.67-.65.14-.97z"
        fill="#FFFFFF"
      />
    </svg>
  );
}

/** Кнопка в шапке: по клику — карточка канала автора со ссылкой на Telegram. */
export function ChannelTip() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useDismiss(ref, open, close);

  return (
    <div className="channel" ref={ref}>
      <button className={`icon-btn channel-btn ${open ? "active" : ""}`} onClick={() => setOpen(!open)} title="Канал автора" aria-label="Канал автора" aria-expanded={open}>
        <TelegramIcon />
      </button>
      {open && (
        <div className="channel-card" role="dialog" aria-label="Канал автора">
          <div className="channel-head">
            <img src="/brand/channel.jpg" alt="" width={44} height={44} />
            <div>
              <b>Канал автора</b>
              <span>t.me/ii_eggs</span>
            </div>
          </div>
          <p>Обновления Салфетки, новые формы и стили. Пишите идеи и предложения — читаю всё.</p>
          <a className="channel-go" href={CHANNEL_URL} target="_blank" rel="noreferrer" onClick={close}>
            <TelegramIcon size={16} />
            Открыть в Telegram
          </a>
        </div>
      )}
    </div>
  );
}
