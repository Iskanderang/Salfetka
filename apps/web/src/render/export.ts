import cyr400 from "@fontsource/caveat/files/caveat-cyrillic-400-normal.woff2?url";
import cyr700 from "@fontsource/caveat/files/caveat-cyrillic-700-normal.woff2?url";
import lat400 from "@fontsource/caveat/files/caveat-latin-400-normal.woff2?url";
import lat700 from "@fontsource/caveat/files/caveat-latin-700-normal.woff2?url";

const CYR = "U+0301,U+0400-045F,U+0490-0491,U+04B0-04B1,U+2116";
const LAT = "U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD";

let caveatCss: Promise<string> | null = null;

async function toDataUrl(url: string) {
  const blob = await (await fetch(url)).blob();
  return new Promise<string>((resolve) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.readAsDataURL(blob);
  });
}

/** Рукописный шрифт встраивается в файл: SVG-картинка не видит шрифты страницы. */
function caveatFontFace(): Promise<string> {
  caveatCss ??= Promise.all(
    [
      [cyr400, 400, CYR],
      [lat400, 400, LAT],
      [cyr700, 700, CYR],
      [lat700, 700, LAT],
    ].map(async ([url, weight, range]) => {
      const data = await toDataUrl(url as string);
      return `@font-face{font-family:"Caveat";font-weight:${weight};src:url(${data}) format("woff2");unicode-range:${range};}`;
    }),
  ).then((rules) => rules.join(""));
  return caveatCss;
}

export async function svgToString(svg: SVGSVGElement, transparent = false): Promise<string> {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.removeAttribute("class");
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  if (transparent) clone.querySelector("[data-bg]")?.remove();
  clone.querySelectorAll("[data-item],[data-icon],[data-title]").forEach((el) => {
    el.removeAttribute("data-item");
    el.removeAttribute("data-icon");
    el.removeAttribute("data-title");
  });
  if ((clone.getAttribute("font-family") ?? "").includes("Caveat")) {
    const style = document.createElementNS("http://www.w3.org/2000/svg", "style");
    style.textContent = await caveatFontFace();
    clone.insertBefore(style, clone.firstChild);
  }
  return '<?xml version="1.0" encoding="UTF-8"?>\n' + new XMLSerializer().serializeToString(clone);
}

async function loadImage(svg: SVGSVGElement, transparent = false) {
  const src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(await svgToString(svg, transparent));
  const img = new Image();
  img.src = src;
  await img.decode();
  // встроенные в SVG шрифты догружаются после decode(): без паузы часть текста
  // успевает нарисоваться запасным шрифтом
  if (src.includes("font-face")) await new Promise((r) => setTimeout(r, 300));
  return img;
}

const toBlob = (canvas: HTMLCanvasElement) =>
  new Promise<Blob>((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("PNG не создан"))), "image/png"));

export async function svgToPng(svg: SVGSVGElement, scale = 2, transparent = false): Promise<Blob> {
  const w = Number(svg.getAttribute("width"));
  const h = Number(svg.getAttribute("height"));
  const img = await loadImage(svg, transparent);
  const canvas = document.createElement("canvas");
  canvas.width = w * scale;
  canvas.height = h * scale;
  canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
  return toBlob(canvas);
}

/** Вертикальная картинка 1080×1920 для сторис: схема по центру на фоне стиля. */
export async function svgToStory(svg: SVGSVGElement, bg: string): Promise<Blob> {
  const W = 1080;
  const H = 1920;
  const pad = 60;
  const w = Number(svg.getAttribute("width"));
  const h = Number(svg.getAttribute("height"));
  const img = await loadImage(svg);
  const scale = Math.min((W - pad * 2) / w, (H - pad * 2) / h);
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);
  ctx.drawImage(img, (W - w * scale) / 2, (H - h * scale) / 2, w * scale, h * scale);
  return toBlob(canvas);
}

export function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function copyPng(svg: SVGSVGElement) {
  const blob = await svgToPng(svg);
  await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
}

export const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40) || "visual";
