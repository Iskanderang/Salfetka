import { fontFaceCss, fontsInStack } from "./fonts";

export async function svgToString(svg: SVGSVGElement, transparent = false): Promise<string> {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.removeAttribute("class");
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  // фон — это и сплошная заливка, и украшения премиум-стиля (свечение, ночное небо)
  if (transparent) clone.querySelectorAll("[data-bg]").forEach((el) => el.remove());
  clone.querySelectorAll("[data-item],[data-icon],[data-title]").forEach((el) => {
    el.removeAttribute("data-item");
    el.removeAttribute("data-icon");
    el.removeAttribute("data-title");
  });
  const used = fontsInStack(clone.getAttribute("font-family") ?? "");
  if (used.length) {
    const style = document.createElementNS("http://www.w3.org/2000/svg", "style");
    style.textContent = (await Promise.all(used.map(fontFaceCss))).join("");
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
