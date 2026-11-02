// Рекламный ролик: покадровая запись страницы /promo.html (сервис должен работать) → frames/*.jpg.
// Склейка: ffmpeg -framerate 30 -i frames/%05d.jpg -c:v libx264 -crf 18 -pix_fmt yuv420p salfetka-promo.mp4
import { createRequire } from "node:module";
import { mkdir, rm } from "node:fs/promises";
const require = createRequire(import.meta.url);
const puppeteer = require("puppeteer-core");
const FPS = 30, DURATION = 39.5;
await rm("frames", { recursive: true, force: true });
await mkdir("frames");
const b = await puppeteer.launch({ executablePath: "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe", headless: true });
const pg = await b.newPage();
await pg.setViewport({ width: 1920, height: 1080 });
await pg.goto("http://localhost:5173/promo.html", { waitUntil: "networkidle0" });
await pg.waitForFunction(() => window.__ready === true, { timeout: 20000 });
const total = FPS * DURATION;
const t0 = Date.now();
for (let f = 0; f < total; f++) {
  await pg.evaluate((t) => window.__setTime(t), f / FPS);
  await pg.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
  await pg.screenshot({ path: `frames/${String(f).padStart(5, "0")}.jpg`, type: "jpeg", quality: 95 });
  if (f % 150 === 0) console.log(`кадр ${f}/${total}, ${((Date.now() - t0) / 1000).toFixed(0)} с`);
}
await b.close();
console.log("кадры готовы за", ((Date.now() - t0) / 1000).toFixed(0), "с");
