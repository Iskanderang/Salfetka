import { useEffect, useRef, useState, type ReactNode } from "react";
import type { Item } from "@napkin/shared";
import { searchIcons } from "./api";
import { LucideByName } from "./render/primitives";

type PopoverProps = { x: number; y: number; onClose: () => void; children: ReactNode; width?: number };

/** Всплывающее окно у точки клика; закрывается по Esc и клику мимо. */
export function Popover({ x, y, onClose, children, width = 360 }: PopoverProps) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node) && !(e.target as Element).closest?.("[data-item],[data-title]")) onClose();
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onDown);
    };
  }, [onClose]);
  return (
    <div ref={ref} className="popover" style={{ left: x, top: y, width }} onMouseDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}>
      {children}
    </div>
  );
}

type ItemEditorProps = {
  item: Item;
  index: number;
  count: number;
  palette: string[];
  autoColor: string;
  colorLocked: boolean;
  onChange: (patch: Partial<Item>) => void;
  onMove: (dir: -1 | 1) => void;
  onDelete: () => void;
  onClose: () => void;
};

export function ItemEditor({ item, index, count, palette, autoColor, colorLocked, onChange, onMove, onDelete, onClose }: ItemEditorProps) {
  const [query, setQuery] = useState("");
  const [found, setFound] = useState<string[] | null>(null);
  const [translated, setTranslated] = useState("");
  const [busy, setBusy] = useState(false);

  // поиск иконок с задержкой, чтобы не дёргать модель на каждую букву
  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setFound(null);
      setTranslated("");
      return;
    }
    const ac = new AbortController();
    const id = setTimeout(async () => {
      setBusy(true);
      try {
        const r = await searchIcons(q, ac.signal);
        setFound(r.icons);
        setTranslated(r.query !== q ? r.query : "");
      } catch {
        /* отменён или сервер недоступен */
      } finally {
        setBusy(false);
      }
    }, 350);
    return () => {
      clearTimeout(id);
      ac.abort();
    };
  }, [query]);

  const current = item.color ?? autoColor;
  const suggestions = item.iconOptions.length ? item.iconOptions : [item.icon];

  return (
    <div className="editor-pop">
      <div className="pop-head">
        <b>Пункт {index + 1}</b>
        <div className="pop-head-actions">
          <button className="icon-btn" title="Левее / выше" disabled={index === 0} onClick={() => onMove(-1)}>
            ←
          </button>
          <button className="icon-btn" title="Правее / ниже" disabled={index === count - 1} onClick={() => onMove(1)}>
            →
          </button>
          <button className="icon-btn danger" title="Удалить пункт" disabled={count <= 2} onClick={onDelete}>
            Удалить
          </button>
          <button className="icon-btn" title="Закрыть (Esc)" onClick={onClose}>
            ✕
          </button>
        </div>
      </div>

      <div className="pop-grid">
        <input value={item.label} placeholder="Заголовок" onChange={(e) => onChange({ label: e.target.value })} autoFocus />
        <input value={item.value} placeholder="Число / дата" className="narrow" onChange={(e) => onChange({ value: e.target.value })} />
      </div>
      <textarea rows={2} value={item.text} placeholder="Пояснение" onChange={(e) => onChange({ text: e.target.value })} />
      <input
        value={item.children.join("; ")}
        placeholder="Подпункты через ;"
        onChange={(e) =>
          onChange({ children: e.target.value.split(";").map((s) => s.trimStart()).filter((s, k, a) => s || k === a.length - 1) })
        }
      />

      <div className="pop-section">Иконка — подобраны по смыслу</div>
      <div className="icon-grid">
        {suggestions.map((n) => (
          <button key={n} className={`icon-cell ${n === item.icon ? "active" : ""}`} title={n} onClick={() => onChange({ icon: n })}>
            <LucideByName name={n} size={22} color={current} />
          </button>
        ))}
      </div>
      <div className="search-row">
        <input value={query} placeholder="Найти иконку: деньги, команда, рост…" onChange={(e) => setQuery(e.target.value)} />
        {busy && <span className="spinner small" />}
      </div>
      {translated && <div className="hint">ищу: {translated}</div>}
      {found && (
        <div className="icon-grid scroll">
          {found.map((n) => (
            <button
              key={n}
              className={`icon-cell ${n === item.icon ? "active" : ""}`}
              title={n}
              onClick={() => onChange({ icon: n, iconOptions: [n, ...suggestions.filter((s) => s !== n)].slice(0, 8) })}
            >
              <LucideByName name={n} size={22} color={current} />
            </button>
          ))}
          {!found.length && <span className="hint">Ничего не нашлось</span>}
        </div>
      )}

      <div className="pop-section">Цвет</div>
      {colorLocked ? (
        <div className="hint">У этого стиля своя палитра — цвета пунктов задаёт мел.</div>
      ) : (
        <div className="color-row">
          {palette.map((c) => (
            <button key={c} className={`color-dot ${current.toLowerCase() === c.toLowerCase() ? "active" : ""}`} style={{ background: c }} title={c} onClick={() => onChange({ color: c })} />
          ))}
          <label className="color-custom" title="Свой цвет">
            <input type="color" value={current.slice(0, 7)} onChange={(e) => onChange({ color: e.target.value })} />
            🎨
          </label>
          <button className="link" onClick={() => onChange({ color: undefined })} disabled={!item.color}>
            авто
          </button>
        </div>
      )}
    </div>
  );
}

export function TitleEditor({ title, onChange, onClose }: { title: string; onChange: (t: string) => void; onClose: () => void }) {
  return (
    <div className="editor-pop">
      <div className="pop-head">
        <b>Заголовок</b>
        <button className="icon-btn" onClick={onClose}>
          ✕
        </button>
      </div>
      <input value={title} onChange={(e) => onChange(e.target.value)} autoFocus onKeyDown={(e) => e.key === "Enter" && onClose()} />
    </div>
  );
}
