import { useEffect, useState, type ReactNode } from "react";
import { CHANNEL_URL, TelegramIcon } from "./ChannelTip";
import { TEXT_LIMITS } from "@napkin/shared";
import { Ico } from "./render/primitives";

export type HelpTab = "install" | "usage" | "extend" | "licenses";

export const HELP_TABS: { id: HelpTab; label: string; icon: string }[] = [
  { id: "install", label: "Установка", icon: "rocket" },
  { id: "usage", label: "Как пользоваться", icon: "book-open" },
  { id: "extend", label: "Дополнения", icon: "blocks" },
  { id: "licenses", label: "Лицензии", icon: "scroll-text" },
];

type Props = { tab: HelpTab; onTab: (t: HelpTab) => void; onClose: () => void; anchor?: string };

/** Справка: установка на своём ПК, работа с сервисом, расширение, лицензии. */
export function Help({ tab, onTab, onClose, anchor = "" }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);
  // открыли из подсказки «Процессы» — сразу к нужному разделу
  useEffect(() => {
    if (anchor) document.getElementById(`help-${anchor}`)?.scrollIntoView({ block: "start" });
  }, [anchor, tab]);

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div className="modal" onMouseDown={(e) => e.stopPropagation()} role="dialog" aria-label="Справка">
        <div className="modal-head">
          <div className="modal-tabs">
            {HELP_TABS.map((t) => (
              <button key={t.id} className={t.id === tab ? "active" : ""} onClick={() => onTab(t.id)}>
                <Ico name={t.icon} />
                {t.label}
              </button>
            ))}
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Закрыть">
            <Ico name="x" size={18} />
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

/** Снимок экрана в справке: по клику открывается крупно. Если файла нет (например, снимки LM Studio ещё не сделаны) — не показывается. */
function Shot({ src, alt, caption, narrow }: { src: string; alt: string; caption?: string; narrow?: boolean }) {
  const [ok, setOk] = useState(true);
  const [zoom, setZoom] = useState(false);
  if (!ok) return null;
  return (
    <figure className={`shot ${narrow ? "narrow" : ""}`}>
      <img src={`/help/${src}`} alt={alt} loading="lazy" onError={() => setOk(false)} onClick={() => setZoom(true)} title="Открыть крупно" />
      {caption && <figcaption>{caption}</figcaption>}
      {zoom && (
        <div className="shot-zoom" onClick={() => setZoom(false)} role="dialog" aria-label={alt}>
          <img src={`/help/${src}`} alt={alt} />
          <span className="shot-zoom-hint">
            <Ico name="x" size={14} />
            Закрыть
          </span>
        </div>
      )}
    </figure>
  );
}

/** Шаг инструкции: номер, заголовок, текст и снимки. */
function Step({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <section className="step">
      <div className="step-num">{n}</div>
      <div className="step-body">
        <h3>{title}</h3>
        {children}
      </div>
    </section>
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
      <Step n={1} title="Установите Node.js">
        <p>
          Скачайте версию <b>LTS</b> с <a href="https://nodejs.org" target="_blank" rel="noreferrer">nodejs.org</a> и установите с настройками по умолчанию.
        </p>
      </Step>
      <Step n={2} title="Установите LM Studio и скачайте модели">
        <p>
          Скачайте программу с <a href="https://lmstudio.ai" target="_blank" rel="noreferrer">lmstudio.ai</a>. Откройте поиск моделей (значок лупы слева), найдите модель из
          таблицы выше, например <code>gemma-4-12b</code>, и нажмите <b>Download</b>.
        </p>
        <Shot src="lm-1-search.png" alt="Поиск модели в LM Studio" caption="Поиск «gemma»: справа выбор файла модели и кнопка Download (если модель уже скачана — Use in New Chat)" />
        <p>
          Так же найдите и скачайте <code>nomic-embed-text-v1.5</code> — маленькую модель для подбора иконок по смыслу.
        </p>
        <Shot src="lm-2-models.png" alt="Скачанные модели в LM Studio" caption="Окно выбора модели (Ctrl+L): сверху загруженная gemma-4-12b-qat, ниже — скачанные модели. Модель для иконок (nomic-embed) здесь не показывается — это нормально. Обычно start.bat загружает обе сам" />
      </Step>
      <Step n={3} title="Включите сервер в LM Studio">
        <p>
          Откройте вкладку <b>Developer</b> (значок консоли слева) и включите переключатель <b>Status: Running</b>. Адрес сервера — <code>http://localhost:1234</code>. Если в
          LM Studio включена консольная утилита <code>lms</code>, start.bat сделает это сам.
        </p>
        <Shot src="lm-3-server.png" alt="Запущенный сервер в LM Studio" caption="Developer → Local Server: Status: Running, адрес http://127.0.0.1:1234, обе модели в статусе READY — Салфетка готова к работе" />
      </Step>
      <Step n={4} title="Запустите Салфетку">
        <p>
          Дважды щёлкните <b>start.bat</b> в папке проекта. Он проверит Node.js и LM Studio, загрузит модели, при первом запуске поставит библиотеки (1–2 минуты) и сам
          откроет <code>http://localhost:5173</code>. Окно с логами не закрывайте — в нём работает сервис.
        </p>
        <p className="note">
          Вручную: <code>npm install</code>, затем <code>npm run dev</code>. При самом первом запуске ~20 секунд строится индекс иконок — дальше он берётся из кэша.
        </p>
      </Step>
      <Step n={5} title="Проверьте, что всё работает">
        <p>
          Справа в шапке должна гореть <b style={{ color: "var(--ok)" }}>зелёная точка</b> с названием модели и надписью «иконки: по смыслу». Красная — смотрите раздел
          «Если что-то не так» ниже.
        </p>
      </Step>

      <h3>Обновления</h3>
      <p>
        Салфетка обновляется сама: при каждом запуске <b>start.bat</b> проверяет, вышла ли новая версия, скачивает её и при необходимости докачивает
        библиотеки. После обновления в браузере появится окно «Салфетка обновилась» со списком нового. Номер вашей версии — значок рядом с названием в
        шапке, по клику на него — что нового.
      </p>
      <p className="note">
        Автообновление работает, если Салфетка скачана командой <code>git clone</code> (нужен{" "}
        <a href="https://git-scm.com/download/win" target="_blank" rel="noreferrer">
          Git для Windows
        </a>
        ). Скачали архивом ZIP — новую версию нужно скачать заново. Нет интернета или вы правили файлы вручную — обновление пропустится, сервис
        запустится на текущей версии.
      </p>

      <h3>Конфиденциальность</h3>
      <p>
        <b>Салфетка не собирает сведений о вас и о том, как вы ей пользуетесь.</b> В ней нет статистики, счётчиков, рекламы и регистрации. Ваши тексты, схемы и
        настройки хранятся только в этом браузере на вашем компьютере.
      </p>
      <p className="note">
        Наружу сервис обращается только в двух случаях: в облачном режиме — к OpenRouter (туда уходит текст, по которому рисуется схема), и при запуске
        start.bat — к GitHub, чтобы проверить и скачать обновление. В режиме «Своя видеокарта» тексты не покидают компьютер.
      </p>

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
          В Салфетке нажмите кнопку нейросети в шапке → «Облако — OpenRouter», вставьте ключ и нажмите «Проверить ключ».
        </li>
      </ol>
      <Shot src="install-cloud.png" alt="Окно «Где работает нейросеть» в облачном режиме" caption="Окно нейросети: облачный режим с инструкцией и полем для ключа" />
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
      <p className="lead">От текста до готовой картинки — шесть шагов. Нажмите на любой снимок, чтобы увеличить.</p>

      <div className="tip-box">
        <h3>
          <Ico name="lightbulb" size={18} />
          Главное правило: один фрагмент — одна схема
        </h3>
        <p>
          Салфетка не делает презентацию за вас. Она превращает в схему <b>ровно тот текст, который вы ей дали</b>, — и чем он короче и цельнее, тем точнее
          получается картинка. Длинный документ целиком модель сожмёт до нескольких общих пунктов, а детали, цифры и примеры потеряются.
        </p>
        <div className="tip-compare">
          <div className="tip-bad">
            <b>
              <Ico name="x" size={14} /> Не так
            </b>
            <p>Вставить статью на три страницы и нажать «Визуализировать» один раз.</p>
          </div>
          <div className="tip-good">
            <b>
              <Ico name="check" size={14} /> А так
            </b>
            <p>Выделить первый абзац — получить схему. Выделить следующий блок — ещё одну. Каждая схема — отдельный слайд или иллюстрация.</p>
          </div>
        </div>
        <p className="tip-sub">Что хорошо подходит для одной схемы:</p>
        <ul>
          <li>
            абзац с одной мыслью — <i>этапы, причины, сравнение, плюсы и минусы</i>;
          </li>
          <li>список на 3–8 пунктов — больше пунктов схема вместит, но читать её станет трудно;</li>
          <li>блок с цифрами — показатели, сроки, доли.</li>
        </ul>
        <p>
          <b>Предел — {TEXT_LIMITS.visual.toLocaleString("ru-RU")} символов за раз</b> (примерно полторы-две страницы). Под кнопкой «Визуализировать» видно, сколько
          уйдёт в модель: выделенное или весь текст. У предела счётчик желтеет, за пределом кнопка не нажмётся, пока вы не выделите кусок поменьше. Это не
          прихоть: у модели ограниченная «память» на один запрос, и длинный текст она перескажет общими словами, а то и оборвёт ответ.
        </p>
        <p className="note">
          Если результат получился слишком общим — выделите кусок поменьше. Если пунктов мало — добавьте в фрагмент соседнее предложение. Кнопка с лампочкой рядом с
          «Визуализировать» напомнит это правило.
        </p>
      </div>

      <Step n={1} title="Вставьте текст и выделите фрагмент">
        <p>
          Вставьте текст в панель слева и выделите мышью один фрагмент — абзац или блок, который нужно превратить в схему. Если ничего не выделять, возьмётся весь
          текст: это удобно только для коротких заметок. Размер шрифта
          меняют кнопки A− / A+, а кнопка рядом сворачивает панель, чтобы схеме было больше места.
        </p>
        <Shot src="use-1-select.png" alt="Выделенный фрагмент текста" caption="Выделен один абзац — его и превратим в схему" />
      </Step>

      <Step n={2} title="Нажмите «Визуализировать»">
        <p>
          Или <b>Ctrl+Enter</b>. Модель прочитает текст, выберет форму и подберёт иконки — это 5–10 секунд на своей видеокарте. Пока она работает, видны этапы.
        </p>
        <Shot src="use-2-generating.png" alt="Этапы работы модели" />
      </Step>

      <Step n={3} title="Получите схему">
        <p>
          Схема появится в центре. Над ней — <b>Ещё вариант</b> (тот же текст, другая подача), <b>+ Пункт</b>, <b>Копировать</b> и <b>Скачать</b>. Все схемы
          сохраняются в «Истории» слева.
        </p>
        <Shot src="use-3-result.png" alt="Готовая схема в редакторе" />
      </Step>

      <Step n={4} title="Выберите форму, стиль и оформление">
        <p>
          Справа три вкладки. <b>Форма</b> — сверху формы, которые советует модель, ниже 32 формы по категориям. <b>Стиль</b> — шесть стилей. <b>Аа Текст</b> — шрифт,
          размер, жирность, цвет текста и фон. Над вкладками всегда видна палитра из десяти цветовых наборов. Всё меняется по клику, мгновенно, без нового запроса к
          модели.
        </p>
        <div className="shot-row">
          <Shot src="use-4-shape.png" alt="Вкладка «Форма»" caption="Форма" narrow />
          <Shot src="use-5-style.png" alt="Вкладка «Стиль»" caption="Стиль" narrow />
          <Shot src="use-6-text.png" alt="Вкладка «Аа Текст»" caption="Аа Текст" narrow />
        </div>
      </Step>

      <Step n={5} title="Поправьте пункт прямо на схеме">
        <p>
          Кликните по пункту: поменяйте текст, число и подпункты, выберите одну из иконок, подобранных по смыслу, или найдите другую поиском по-русски, задайте цвет,
          переставьте пункт или добавьте новый перед ним или после. Клик по заголовку схемы — правка заголовка.
        </p>
        <Shot src="use-7-item.png" alt="Окно правки пункта с поиском иконки" caption="Поиск «деньги» нашёл монеты, валюту и копилки" narrow />
      </Step>

      <Step n={6} title="Скачайте или скопируйте">
        <p>
          <b>PNG</b> — для документов, соцсетей и писем. <b>PNG без фона</b> — для слайдов PowerPoint, Keynote, Canva. <b>SVG</b> — вектор для Figma, сайтов и
          печати. <b>Копировать</b> кладёт картинку в буфер: вставьте её через Ctrl+V куда угодно.
        </p>
        <Shot src="use-8-export.png" alt="Меню «Скачать»" narrow />
      </Step>

      <div className="tip-box" id="help-processes">
        <h3>
          <Ico name="workflow" size={18} />
          Процессы: как описать, чтобы схема получилась точной
        </h3>
        <p>
          Переключите над текстом <b>«Процессы»</b> и опишите процесс словами. Модель найдёт шаги, исполнителей, проверки и возвраты и разложит схему по дорожкам —
          как в Draw.io. Чем конкретнее описание, тем точнее схема:
        </p>
        <ul>
          <li>
            <b>Исполнители и их действия.</b> Кто что делает: «Менеджер проверяет заявку», «Бухгалтерия выставляет счёт». Каждый исполнитель станет своей дорожкой.
          </li>
          <li>
            <b>Проверки и варианты.</b> «Если сумма больше 100 тысяч — согласует директор, если меньше — руководитель».
          </li>
          <li>
            <b>Возвраты и одновременные действия.</b> «Юрист возвращает договор на доработку», «Одновременно склад собирает заказ, а менеджер готовит документы».
          </li>
          <li>
            <b>Результат.</b> Чем процесс заканчивается: «Заказ оплачен», «Отказ клиенту», «Товар принят на склад».
          </li>
          <li>
            <b>Размер.</b> До 15–20 шагов и до {TEXT_LIMITS.process.toLocaleString("ru-RU")} символов на схему — счётчик под кнопкой «Нарисовать процесс».
            Большой процесс разбейте на этапы и нарисуйте каждый отдельно.
          </li>
        </ul>
        <div className="tip-compare">
          <div className="tip-bad">
            <b>
              <Ico name="x" size={14} /> Не так
            </b>
            <p>«Мы быстро и качественно обрабатываем заявки клиентов.» — нет ни шагов, ни исполнителей, ни проверок.</p>
          </div>
          <div className="tip-good">
            <b>
              <Ico name="check" size={14} /> А так
            </b>
            <p>
              «Клиент оставляет заявку. Менеджер проверяет её. Если данных не хватает — запрашивает их у клиента. Если всё в порядке — бухгалтерия выставляет счёт,
              клиент оплачивает. Заказ оплачен.»
            </p>
          </div>
        </div>
        <p className="tip-sub">Что дальше со схемой:</p>
        <ul>
          <li>
            <b>Скачать:</b> PNG и SVG — для регламентов, инструкций и презентаций.
          </li>
          <li>
            <b>Править дальше:</b> файл <b>.drawio</b> открывается в Draw.io (app.diagrams.net) — там можно двигать шаги, стрелки и дорожки.
          </li>
          <li>
            <b>Ориентация:</b> над схемой переключатель «Слева направо / Сверху вниз». Клик по шагу — поправить его текст.
          </li>
        </ul>
      </div>

      <p className="note">Схемы хранятся в этом браузере. Очистка данных браузера удалит и их.</p>

      <a className="author-box" href={CHANNEL_URL} target="_blank" rel="noreferrer">
        <img src="/brand/channel.jpg" alt="" width={48} height={48} />
        <span>
          <b>Автор и обновления</b>
          <span>Новые формы, стили и планы — в Telegram-канале t.me/ii_eggs. Там же можно предложить идею или сообщить об ошибке.</span>
        </span>
        <TelegramIcon size={22} />
      </a>
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
      <p className="note">Салфетка не связана с Napkin.ai — это самостоятельный проект с похожей идеей.</p>
    </>
  );
}
