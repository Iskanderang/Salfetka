import { useEffect, useState } from "react";
import type { AiSettings, ProviderId, ProviderInfo } from "@napkin/shared";
import { models as fetchModels } from "./api";

type Props = {
  settings: AiSettings;
  providers: ProviderInfo[];
  onChange: (s: AiSettings) => void;
  onClose: () => void;
  onInstallHelp: () => void;
};

type Check = { state: "idle" | "busy" | "ok" | "error"; text?: string; models?: string[] };

/** Где работает нейросеть: своя видеокарта или OpenRouter. */
export function AiDialog({ settings, providers, onChange, onClose, onInstallHelp }: Props) {
  const [showKey, setShowKey] = useState(false);
  const [check, setCheck] = useState<Check>({ state: "idle" });
  const current = providers.find((p) => p.id === settings.provider);
  // режим определяем по выбору, а не по списку с сервера — список может ещё не загрузиться
  const isCloud = settings.provider !== "local";
  const key = settings.keys[settings.provider] ?? "";
  const model = settings.models[settings.provider] ?? "";

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => setCheck({ state: "idle" }), [settings.provider]);

  const pick = (provider: ProviderId) => onChange({ ...settings, provider });
  const setKey = (v: string) => onChange({ ...settings, keys: { ...settings.keys, [settings.provider]: v.trim() } });
  const setModel = (v: string) => onChange({ ...settings, models: { ...settings.models, [settings.provider]: v.trim() } });

  async function runCheck() {
    setCheck({ state: "busy" });
    const r = await fetchModels(settings);
    if (r.error) setCheck({ state: "error", text: r.error });
    else {
      const effective = model || current?.defaultModel || "";
      if (r.probeError) {
        setCheck({
          state: "error",
          models: r.models,
          text: `Ключ принят, но пробная генерация моделью «${effective}» не прошла: ${r.probeError} Попробуйте другую модель из списка ниже.`,
        });
      } else {
        setCheck({
          state: "ok",
          models: r.models,
          text: `Всё работает: модель «${effective}» ответила (режим: ${r.probe}). Можно создавать схемы.`,
        });
      }
    }
  }

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div className="modal" onMouseDown={(e) => e.stopPropagation()} role="dialog" aria-label="Настройки нейросети">
        <div className="modal-head">
          <b className="modal-title">⚙ Где работает нейросеть</b>
          <button className="icon-btn" onClick={onClose} aria-label="Закрыть">
            ✕
          </button>
        </div>
        <div className="modal-body">
          <div className="mode-switch">
            <button className={!isCloud ? "active" : ""} onClick={() => pick("local")}>
              <span className="mode-icon">💻</span>
              <b>Своя видеокарта</b>
              <small>LM Studio на этом компьютере. Бесплатно, без лимитов, тексты никуда не уходят.</small>
            </button>
            <button className={isCloud ? "active" : ""} onClick={() => !isCloud && pick("openrouter")}>
              <span className="mode-icon">☁️</span>
              <b>Облако — OpenRouter</b>
              <small>Если видеокарты нет или не хочется её нагружать. Нужен бесплатный ключ OpenRouter.</small>
            </button>
          </div>

          {!isCloud && (
            <p className="note">
              Нужны LM Studio и загруженная модель. Не настроено?{" "}
              <button className="link" onClick={onInstallHelp}>
                Как запустить →
              </button>
            </p>
          )}

          {isCloud && (
            <>
              <h3>Как получить ключ OpenRouter</h3>
              <ol className="steps">
                <li>
                  Зарегистрируйтесь на{" "}
                  <a href="https://openrouter.ai/" target="_blank" rel="noreferrer">
                    официальном сайте OpenRouter
                  </a>
                  .
                </li>
                <li>
                  Откройте страницу{" "}
                  <a href="https://openrouter.ai/keys" target="_blank" rel="noreferrer">
                    API Keys
                  </a>
                  .
                </li>
                <li>
                  Нажмите <b>Create Key</b>, задайте название и лимит расходов. Бесплатные модели (с пометкой «:free») денег не тратят — лимит можно поставить нулевым.
                </li>
                <li>
                  Скопируйте ключ — он начинается с <code>sk-or-v1-</code>.
                </li>
                <li>Сохраните его у себя и вставьте в поле ниже, затем нажмите «Проверить ключ».</li>
              </ol>

              <div className="privacy">🔒 {current?.privacy ?? "Тексты уходят в OpenRouter и к выбранному поставщику модели."}</div>

              <h3>Ключ OpenRouter</h3>
              <div className="key-row">
                <input
                  type={showKey ? "text" : "password"}
                  value={key}
                  placeholder="sk-or-v1-…"
                  onChange={(e) => setKey(e.target.value)}
                  autoComplete="off"
                  spellCheck={false}
                />
                <button onClick={() => setShowKey((v) => !v)} title={showKey ? "Скрыть" : "Показать"}>
                  {showKey ? "🙈" : "👁"}
                </button>
                <button className="primary" onClick={runCheck} disabled={!key || check.state === "busy"}>
                  {check.state === "busy" ? "Проверяю…" : "Проверить ключ"}
                </button>
              </div>
              {key && !key.startsWith("sk-or-") && <div className="check bad">Ключ OpenRouter обычно начинается с «sk-or-v1-» — проверьте, что скопировали его целиком.</div>}
              {check.text && <div className={check.state === "ok" ? "check ok" : "check bad"}>{check.text}</div>}

              <h3>Модель</h3>
              <div className="key-row">
                <input list="model-list" value={model} placeholder={`по умолчанию: ${current?.defaultModel ?? "openai/gpt-oss-20b:free"}`} onChange={(e) => setModel(e.target.value)} spellCheck={false} />
                {model && (
                  <button className="link" onClick={() => setModel("")}>
                    по умолчанию
                  </button>
                )}
              </div>
              <datalist id="model-list">
                {check.models?.map((m) => (
                  <option key={m} value={m} />
                ))}
              </datalist>
              {check.models && check.models.length > 0 && (
                <div className="model-chips">
                  {check.models.slice(0, 40).map((m) => (
                    <button key={m} className={m === (model || current?.defaultModel) ? "active" : ""} onClick={() => setModel(m)}>
                      {m}
                    </button>
                  ))}
                </div>
              )}
              <p className="note">
                Ключ хранится только в этом браузере и передаётся вашему локальному серверу Napkin Free, а он — в OpenRouter. Список бесплатных моделей и лимиты у
                OpenRouter меняются: если что-то перестало работать, нажмите «Проверить ключ» и выберите другую модель «:free». Иконки в облачном режиме подбираются по
                словам.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
