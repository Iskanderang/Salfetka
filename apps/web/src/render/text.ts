// Перенос и автоподгонка текста по реальной ширине шрифта (через canvas.measureText).

export const FONT = '"Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

const ctx = document.createElement("canvas").getContext("2d")!;

function measure(text: string, size: number, weight: number, font: string): number {
  ctx.font = `${weight} ${size}px ${font}`;
  return ctx.measureText(text).width;
}

function wrap(text: string, width: number, size: number, weight: number, font: string): { lines: string[]; broken: boolean } {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  let broken = false;
  for (let word of words) {
    // слово длиннее строки — режем по символам
    while (measure(word, size, weight, font) > width && word.length > 1) {
      broken = true;
      let cut = word.length - 1;
      while (cut > 1 && measure(word.slice(0, cut) + "-", size, weight, font) > width) cut--;
      if (line) {
        lines.push(line);
        line = "";
      }
      lines.push(word.slice(0, cut) + "-");
      word = word.slice(cut);
    }
    const next = line ? `${line} ${word}` : word;
    if (measure(next, size, weight, font) <= width) line = next;
    else {
      if (line) lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  return { lines, broken };
}

export type Fitted = { lines: string[]; size: number };

const cache = new Map<string, Fitted>();

/** Подбирает размер шрифта (от size до minSize), чтобы текст влез в maxLines строк; иначе обрезает с «…». */
export function fitText(
  text: string,
  width: number,
  size: number,
  maxLines: number,
  weight = 400,
  minSize = Math.round(size * 0.75),
  font = FONT,
): Fitted {
  const key = `${text}|${width}|${size}|${maxLines}|${weight}|${minSize}|${font}`;
  const hit = cache.get(key);
  if (hit) return hit;

  let result: Fitted = { lines: [], size };
  if (text.trim()) {
    // сначала уменьшаем шрифт, чтобы и влезло, и слова не рвались дефисом
    for (let s = size; s >= minSize; s--) {
      const { lines, broken } = wrap(text, width, s, weight, font);
      result = { lines, size: s };
      if (lines.length <= maxLines && (!broken || s === minSize)) break;
    }
    if (result.lines.length > maxLines) {
      const lines = result.lines.slice(0, maxLines);
      let last = lines[maxLines - 1];
      while (last.length > 1 && measure(last + "…", result.size, weight, font) > width) last = last.slice(0, -1);
      lines[maxLines - 1] = last.replace(/[\s,.;:-]+$/, "") + "…";
      result = { lines, size: result.size };
    }
  }
  if (cache.size > 5000) cache.clear();
  cache.set(key, result);
  return result;
}

export const LINE = 1.25;

/** Сбросить кэш после загрузки веб-шрифтов, иначе останутся замеры по запасному шрифту. */
export const clearTextCache = () => cache.clear();

/** Высота текстового блока в пикселях. */
export function textHeight(f: Fitted): number {
  return f.lines.length * f.size * LINE;
}
