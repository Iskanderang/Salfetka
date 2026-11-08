// Бесплатные шрифты с кириллицей (Fontsource, локально, без CDN).
import "@fontsource/inter/400.css";
import "@fontsource/inter/700.css";
import "@fontsource/montserrat/400.css";
import "@fontsource/montserrat/700.css";
import "@fontsource/rubik/400.css";
import "@fontsource/rubik/700.css";
import "@fontsource/comfortaa/400.css";
import "@fontsource/comfortaa/700.css";
import "@fontsource/pt-serif/400.css";
import "@fontsource/pt-serif/700.css";
import "@fontsource/caveat/400.css";
import "@fontsource/caveat/700.css";
import "@fontsource/manrope/400.css";
import "@fontsource/manrope/700.css";
import "@fontsource/balsamiq-sans/400.css";
import "@fontsource/balsamiq-sans/700.css";
import "@fontsource/jetbrains-mono/400.css";
import "@fontsource/jetbrains-mono/700.css";
import "@fontsource/oswald/400.css";
import "@fontsource/oswald/700.css";
// заголовочные шрифты стилей «Комикс», «Конструктивизм», «Газета»
import "@fontsource/unbounded/700.css";
import "@fontsource/unbounded/900.css";
import "@fontsource/russo-one/400.css";
import "@fontsource/playfair-display/700.css";
import "@fontsource/playfair-display/900.css";

export type FontDef = {
  id: string;
  name: string;
  /** Имя семейства, как его регистрирует Fontsource */
  family: string;
  /** CSS-стек с запасными шрифтами */
  stack: string;
  /** Рукописные шрифты мельче при том же кегле */
  scale: number;
};

export const FONTS: FontDef[] = [
  { id: "manrope", name: "Manrope", family: "Manrope", stack: '"Manrope", "Segoe UI", Arial, sans-serif', scale: 1 },
  { id: "inter", name: "Inter", family: "Inter", stack: '"Inter", "Segoe UI", Arial, sans-serif', scale: 1 },
  { id: "montserrat", name: "Montserrat", family: "Montserrat", stack: '"Montserrat", "Segoe UI", Arial, sans-serif', scale: 0.95 },
  { id: "rubik", name: "Rubik", family: "Rubik", stack: '"Rubik", "Segoe UI", Arial, sans-serif', scale: 1 },
  { id: "comfortaa", name: "Comfortaa", family: "Comfortaa", stack: '"Comfortaa", "Segoe UI", Arial, sans-serif', scale: 0.95 },
  { id: "pt-serif", name: "PT Serif", family: "PT Serif", stack: '"PT Serif", Georgia, serif', scale: 1 },
  { id: "caveat", name: "Caveat (от руки)", family: "Caveat", stack: '"Caveat", "Segoe Print", cursive', scale: 1.3 },
  { id: "balsamiq-sans", name: "Balsamiq (комикс)", family: "Balsamiq Sans", stack: '"Balsamiq Sans", "Comic Sans MS", cursive', scale: 1 },
  { id: "jetbrains-mono", name: "JetBrains Mono (чертёж)", family: "JetBrains Mono", stack: '"JetBrains Mono", Consolas, monospace', scale: 0.92 },
  { id: "oswald", name: "Oswald (плакат)", family: "Oswald", stack: '"Oswald", "Arial Narrow", sans-serif', scale: 1.05 },
];

/** Шрифты заголовков стилей: в списке выбора их нет, но в экспорт они встраиваются. */
export const TITLE_FONTS: FontDef[] = [
  { id: "unbounded", name: "Unbounded", family: "Unbounded", stack: '"Unbounded", "Arial Black", sans-serif', scale: 0.9 },
  { id: "russo-one", name: "Russo One", family: "Russo One", stack: '"Russo One", "Arial Black", sans-serif', scale: 1 },
  { id: "playfair-display", name: "Playfair Display", family: "Playfair Display", stack: '"Playfair Display", Georgia, serif', scale: 1 },
];

export const fontById = (id: string | undefined) => FONTS.find((f) => f.id === id);

/** Шрифты, которые стили используют сами (не через выбор пользователя), — грузим до первого рендера. */
export const styleFonts = () => [fontById("caveat"), fontById("balsamiq-sans"), fontById("jetbrains-mono"), fontById("oswald"), fontById("pt-serif"), ...TITLE_FONTS];

/** Ждём файлы шрифта, чтобы замерять ширину текста уже по нему. */
export async function loadFont(f: FontDef | undefined) {
  if (!f) return;
  try {
    await Promise.all([400, 700, 900].map((w) => document.fonts.load(`${w} 20px "${f.family}"`, "Абв Abc")));
  } catch {
    /* запасной шрифт тоже подойдёт */
  }
}

// Файлы для встраивания в экспорт: SVG-картинка не видит шрифты страницы.
const FILES = import.meta.glob("../../../../node_modules/@fontsource/*/files/*-{cyrillic,latin}-{400,700,900}-normal.woff2", {
  query: "?url",
  import: "default",
  eager: true,
}) as Record<string, string>;

const RANGES = {
  cyrillic: "U+0301,U+0400-045F,U+0490-0491,U+04B0-04B1,U+2116",
  latin:
    "U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD",
};

async function toDataUrl(url: string) {
  const blob = await (await fetch(url)).blob();
  return new Promise<string>((resolve) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.readAsDataURL(blob);
  });
}

const faceCache = new Map<string, Promise<string>>();

/** @font-face с данными шрифта внутри — для экспорта в PNG/SVG. */
export function fontFaceCss(f: FontDef): Promise<string> {
  let hit = faceCache.get(f.id);
  if (!hit) {
    const jobs: Promise<string>[] = [];
    for (const [path, url] of Object.entries(FILES)) {
      const m = path.match(new RegExp(`/@fontsource/${f.id}/files/${f.id}-(cyrillic|latin)-(400|700|900)-normal\\.woff2$`));
      if (!m) continue;
      const [, subset, weight] = m;
      jobs.push(
        toDataUrl(url).then(
          (data) => `@font-face{font-family:"${f.family}";font-weight:${weight};src:url(${data}) format("woff2");unicode-range:${RANGES[subset as keyof typeof RANGES]};}`,
        ),
      );
    }
    hit = Promise.all(jobs).then((r) => r.join(""));
    faceCache.set(f.id, hit);
  }
  return hit;
}

/** Какие из наших шрифтов упомянуты в font-family. */
export const fontsInStack = (stack: string) => [...FONTS, ...TITLE_FONTS].filter((f) => stack.includes(`"${f.family}"`));
