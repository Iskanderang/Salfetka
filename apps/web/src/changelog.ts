/**
 * Версия Салфетки и список изменений.
 * Как выпустить обновление: поднимите VERSION, добавьте запись в начало CHANGELOG, закоммитьте и отправьте на GitHub.
 * У пользователей start.bat при следующем запуске сам скачает новую версию, а сервис покажет окно «Что нового».
 */
export const VERSION = "1.0.0";

export type Release = {
  version: string;
  /** ГГГГ-ММ-ДД */
  date: string;
  title: string;
  items: string[];
};

export const CHANGELOG: Release[] = [
  {
    version: "1.0.0",
    date: "2026-11-03",
    title: "Первая версия на GitHub",
    items: [
      "43 формы в 11 категориях: от шагов и воронки до айсберга, ракеты и оргструктуры",
      "8 стилей, включая «Набросок» от руки и «Премиум» как на лендинге, и 10 палитр",
      "Режим «Процессы»: схема с исполнителями и развилками, слева направо или сверху вниз, выгрузка в Draw.io",
      "Правка пунктов на схеме, поиск иконок по-русски, PNG, PNG без фона и SVG",
      "Работает на своей видеокарте через LM Studio или в облаке через OpenRouter",
    ],
  },
];

/** Сравнение версий вида 1.2.3: отрицательное — a старше b */
export function compareVersions(a: string, b: string) {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (d) return d;
  }
  return 0;
}

/** Что вышло после версии, которую пользователь видел в прошлый раз */
export const releasesSince = (seen: string) => CHANGELOG.filter((r) => compareVersions(r.version, seen) > 0);
