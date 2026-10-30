import { useEffect } from "react";

export type HelpTab = "install" | "usage" | "extend" | "licenses";

export const HELP_TABS: { id: HelpTab; label: string }[] = [
  { id: "install", label: "🚀 Установка" },
  { id: "usage", label: "📖 Как пользоваться" },
  { id: "extend", label: "🧩 Дополнения" },
  { id: "licenses", label: "⚖️ Лицензии" },
];

type Props = { tab: HelpTab; onTab: (t: HelpTab) => void; onClose: () => void };

/** Справка: установка на своём ПК, работа с сервисом, расширение, лицензии. */
export function Help({ tab, onTab, onClose }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div className="modal" onMouseDown={(e) => e.stopPropagation()} role="dialog" aria-label="Справка">
        <div className="modal-head">
          <div className="modal-tabs">
            {HELP_TABS.map((t) => (
              <button key={t.id} className={t.id === tab ? "active" : ""} onClick={() => onTab(t.id)}>
                {t.label}
              </button>
            ))}
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Закрыть">
            ✕
          </button>
        </div>
        <div className="modal-body">
          {tab === "install" && <Install />}
          {tab === "usage" && <Usage />}
          {tab === "extend" && <Extend />}
          {tab === "licenses" && <Licenses />}
        </div>
      </div>
    </div>
  );
}

function Install() {
  return (
    <>
      <h2>Запуск на своём компьютере</h2>
      <p className="lead">Всё работает локально: тексты никуда не отправляются, нейросеть крутится на вашей видеокарте.</p>

      <h3>Что нужно</h3>
      <ul>
        <li>Windows 10/11 (на macOS и Linux тоже работает, но вместо start.bat — команды из шага 4).</li>
        <li>Видеокарта NVIDIA от 8 ГБ памяти или Mac на Apple Silicon. Без видеокарты тоже запустится, но ответ будет идти 30–60 секунд.</li>
        <li>16 ГБ оперативной памяти и ~10 ГБ на диске.</li>
      </ul>

      <h3>Какую модель брать</h3>
      <table>
        <thead>
          <tr>
            <th>Память видеокарты</th>
            <th>Модель в LM Studio</th>
            <th>Скорость</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>8 ГБ</td>
            <td>
              <code>google/gemma-4-e4b</code>
            </td>
            <td>быстро, попроще</td>
          </tr>
          <tr>
            <td>12–16 ГБ</td>
            <td>
              <code>google/gemma-4-12b-qat</code> — по умолчанию
            </td>
            <td>6–8 с на схему</td>
          </tr>
          <tr>
            <td>24 ГБ и больше</td>
            <td>
              <code>google/gemma-4-26b-a4b-qat</code>
            </td>
            <td>точнее</td>
          </tr>
        </tbody>
      </table>
      <p className="note">
        Плюс маленькая модель для подбора иконок: <code>text-embedding-nomic-embed-text-v1.5</code> (84 МБ). Без неё иконки ищутся по словам, а не по смыслу.
      </p>

      <h3>Шаги</h3>
      <ol>
        <li>
          Установите <b>Node.js LTS</b> — <a href="https://nodejs.org" target="_blank" rel="noreferrer">nodejs.org</a>.
        </li>
        <li>
          Установите <b>LM Studio</b> — <a href="https://lmstudio.ai" target="_blank" rel="noreferrer">lmstudio.ai</a>. Во вкладке поиска моделей скачайте модель из таблицы и{" "}
          <code>nomic-embed-text-v1.5</code>.
        </li>
        <li>
          В LM Studio на вкладке <b>Developer</b> нажмите <b>Start Server</b> (порт 1234). Если включена консольная утилита <code>lms</code>, start.bat сделает это сам.
        </li>
        <li>
          Запустите <b>start.bat</b> в папке проекта. Он проверит Node.js и LM Studio, загрузит модели, при первом запуске поставит библиотеки (1–2 минуты) и откроет сайт.
          <br />
          Вручную: <code>npm install</code>, затем <code>npm run dev</code> и откройте <code>http://localhost:5173</code>.
        </li>
        <li>При самом первом запуске сервис ~20 секунд строит индекс иконок — дальше он берётся из кэша.</li>
      </ol>

      <h3>Другая модель</h3>
      <p>
        Поменяйте имя модели в двух местах: в начале <code>start.bat</code> и в <code>apps/api/.env</code> (строка <code>LLM_MODEL</code>). Точное имя покажет команда{" "}
        <code>lms ls</code>.
      </p>

      <h3>Нет мощной видеокарты?</h3>
      <p>
        Работайте через облако <b>OpenRouter</b>: LM Studio тогда не нужен — достаточно Node.js и start.bat.
      </p>
      <ol>
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
          Нажмите <b>Create Key</b>, задайте название и лимит расходов (для бесплатных моделей «:free» хватит нулевого).
        </li>
        <li>
          Скопируйте ключ — он начинается с <code>sk-or-v1-</code> — и сохраните его.
        </li>
        <li>
          В Napkin Free нажмите <b>⚙ Нейросеть</b> → «Облако — OpenRouter», вставьте ключ и нажмите «Проверить ключ».
        </li>
      </ol>
      <p className="note">В облачном режиме тексты уходят в OpenRouter, у бесплатных моделей есть дневной лимит запросов, а иконки подбираются по словам.</p>

      <h3>Если что-то не так</h3>
      <ul>
        <li>
          Справа вверху красная точка — сервис не видит модель. Проверьте, что сервер LM Studio запущен и имя модели совпадает с <code>LLM_MODEL</code>.
        </li>
        <li>Очень долго думает — модель не влезла в видеопамять. Возьмите модель поменьше из таблицы.</li>
        <li>
          «иконки: по словам» в статусе — не загружена <code>nomic-embed-text</code>. Всё работает, просто подбор иконок проще.
        </li>
      </ul>
    </>
  );
}

function Usage() {
  return (
    <>
      <h2>Как пользоваться</h2>
      <ol>
        <li>Вставьте текст слева. Выделите кусок, который нужно превратить в схему, — или ничего не выделяйте, тогда возьмётся весь текст.</li>
        <li>
          Нажмите <b>⚡ Визуализировать</b> (или Ctrl+Enter). Модель предложит раскладки — лучшие отмечены ★.
        </li>
        <li>
          Выберите <b>стиль</b> (миниатюры сверху), <b>палитру</b> (кружки) и <b>раскладку</b> (карточки под схемой). Модель при этом не вызывается — всё мгновенно.
        </li>
        <li>
          <b>Кликните по пункту</b> на схеме: поменяйте текст, иконку (8 подобранных по смыслу или поиск по-русски), цвет, порядок. Клик по заголовку — правка заголовка.
        </li>
        <li>
          <b>Аа Оформление</b> — шрифт, размер, жирность и цвет текста, фон схемы. Для «Салфетки» и «Доски» — интенсивность маркера и мела.
        </li>
        <li>
          <b>🔄 Ещё вариант</b> — тот же текст, но другая подача. <b>+ Пункт</b> — добавить пункт вручную.
        </li>
        <li>
          <b>Скачать</b>: PNG — для документов и соцсетей, PNG без фона — для слайдов, SVG — для Figma, сайтов и печати. <b>Копировать</b> кладёт картинку в буфер.
        </li>
      </ol>
      <p className="note">Все схемы хранятся в этом браузере, в списке «История». Очистка истории браузера удалит и их.</p>
    </>
  );
}

function Extend() {
  return (
    <>
      <h2>Иконки, шрифты, модели</h2>

      <h3>Иконки</h3>
      <p>
        Используется набор <b>Lucide</b> — 1539 иконок. Чтобы получить новые иконки из свежих версий Lucide, в папке проекта выполните:
      </p>
      <pre>npm i lucide-react@latest -w apps/web{"\n"}npm i lucide-react@latest lucide-static@latest -w apps/api</pre>
      <p>
        и удалите папку <code>apps/api/.cache</code> — при следующем запуске индекс иконок пересоберётся с новыми. Свои SVG-иконки пока не поддерживаются.
      </p>

      <h3>Шрифты</h3>
      <p>
        Шрифты берутся из <b>Fontsource</b> и лежат в проекте. Чтобы добавить новый (с кириллицей): <code>npm i @fontsource/имя -w apps/web</code>, затем добавьте его в
        список в <code>apps/web/src/render/fonts.ts</code> — он сразу появится в «Оформлении» и будет встраиваться в экспорт.
      </p>

      <h3>Модели</h3>
      <p>
        Подойдёт любая модель из LM Studio, которая хорошо отвечает по-русски и умеет строгий JSON. Сервис говорит с ней через OpenAI-совместимый API, поэтому вместо LM Studio можно
        указать Ollama или другой сервер — адрес в <code>apps/api/.env</code> (<code>LLM_BASE_URL</code>).
      </p>

      <h3>Раскладки и стили</h3>
      <p>
        Новая раскладка — функция в <code>apps/web/src/render/layouts.tsx</code>, новый стиль — запись в <code>styles.ts</code>. Подробности в <code>README.md</code>.
      </p>
    </>
  );
}

const LIBS: [string, string, string][] = [
  ["Иконки Lucide", "ISC", "можно в коммерческих проектах, без указания авторства в картинках"],
  ["Шрифты Inter, Montserrat, Rubik, Comfortaa, PT Serif, Caveat", "SIL OFL 1.1", "можно встраивать в картинки и документы, нельзя продавать сами шрифты"],
  ["rough.js (эффект «от руки»)", "MIT", ""],
  ["React, Vite, Fastify, zod", "MIT", ""],
  ["OpenAI SDK (клиент для LM Studio)", "Apache 2.0", ""],
];

function Licenses() {
  return (
    <>
      <h2>Лицензии</h2>
      <p className="lead">
        <b>Ваши схемы принадлежат вам.</b> Иконки и шрифты в них разрешено использовать, в том числе в коммерческих материалах.
      </p>
      <table>
        <thead>
          <tr>
            <th>Компонент</th>
            <th>Лицензия</th>
            <th>Что это значит</th>
          </tr>
        </thead>
        <tbody>
          {LIBS.map(([what, lic, note]) => (
            <tr key={what}>
              <td>{what}</td>
              <td>
                <b>{lic}</b>
              </td>
              <td>{note || "свободное использование, в том числе коммерческое"}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h3>Нейросети</h3>
      <ul>
        <li>
          <b>LM Studio</b> — бесплатная программа, работает по своим условиям использования (lmstudio.ai).
        </li>
        <li>
          <b>Модели</b> (Gemma, nomic-embed-text и другие) — у каждой своя лицензия. Её видно в карточке модели в LM Studio и на странице модели на Hugging Face. Для
          коммерческого использования проверьте условия выбранной модели.
        </li>
      </ul>
      <p className="note">Napkin Free не связан с Napkin.ai — это самостоятельный проект с похожей идеей.</p>
    </>
  );
}
