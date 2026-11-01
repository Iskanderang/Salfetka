// Снимки интерфейса для справки «Как пользоваться».
// Запуск (сервис и LM Studio должны работать): node scripts/help-shots.mjs
// Открывает Салфетку в чистом профиле Edge/Chrome, проходит сценарий и сохраняет PNG в apps/web/public/help/.
import { mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer-core";

const URL_APP = process.env.APP_URL ?? "http://localhost:5173";
const OUT = new URL("../apps/web/public/help/", import.meta.url);
const BROWSERS = [
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
];
const executablePath = BROWSERS.find((p) => existsSync(p));
if (!executablePath) throw new Error("Не найден Edge или Chrome");

await mkdir(OUT, { recursive: true });
const browser = await puppeteer.launch({ executablePath, headless: true, args: ["--no-first-run", "--hide-scrollbars"] });
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const file = (name) => fileURLToPath(new URL(name, OUT));
const shot = async (name, el) => {
  if (el) await (await page.$(el)).screenshot({ path: file(name) });
  else await page.screenshot({ path: file(name) });
  console.log("✓", name);
};

// чистое состояние: светлая тема, плоский стиль, пустая история
await page.goto(URL_APP, { waitUntil: "networkidle0" });
await page.evaluate(() => {
  for (const k of Object.keys(localStorage)) if (k.startsWith("nf.")) localStorage.removeItem(k);
  localStorage.setItem("nf.uiTheme", JSON.stringify("light"));
});
await page.reload({ waitUntil: "networkidle0" });
await page.waitForSelector(".status.ok", { timeout: 60_000 });

// 1. выделяем фрагмент текста
await page.evaluate(() => {
  const ta = document.querySelector("textarea");
  const s = ta.value.indexOf("Сначала");
  const e = ta.value.indexOf("маркетинг.") + "маркетинг.".length;
  ta.focus();
  ta.setSelectionRange(s, e);
});
await wait(300);
await shot("use-1-select.png");

// 2. запускаем — экран с этапами работы модели
await page.click(".editor-bar button.primary");
await wait(1700);
await shot("use-2-generating.png", ".loading");

// 3. готовая схема
await page.waitForSelector(".svg-main", { timeout: 120_000 });
await wait(800);
await shot("use-3-result.png");

// 4–6. вкладки боковой панели
await shot("use-4-shape.png", ".sidebar");
const tab = async (i) => {
  await page.evaluate((i) => document.querySelectorAll(".side-tabs button")[i].click(), i);
  await wait(400);
};
await tab(1);
await shot("use-5-style.png", ".sidebar");
await tab(2);
await shot("use-6-text.png", ".sidebar");
await tab(0);

// 7. правка пункта: клик по пункту и поиск иконки по-русски
const box = await page.evaluate(() => {
  const el = document.querySelector('.svg-main [data-item="1"]');
  const r = el.getBoundingClientRect();
  return { x: r.x + r.width / 2, y: r.y + Math.min(30, r.height / 2) };
});
await page.mouse.click(box.x, box.y);
await page.waitForSelector(".popover");
await page.type(".popover .search-row input", "деньги");
await wait(3500);
await shot("use-7-item.png", ".popover");
await page.keyboard.press("Escape");
await wait(300);

// 8. меню «Скачать»
await page.evaluate(() => [...document.querySelectorAll(".actions button")].find((b) => b.textContent.includes("Скачать")).click());
await wait(400);
const menu = await page.evaluate(() => {
  const m = document.querySelector(".menu").getBoundingClientRect();
  const b = [...document.querySelectorAll(".actions button")].find((x) => x.textContent.includes("Скачать")).getBoundingClientRect();
  return { x: Math.min(m.x, b.x) - 12, y: b.y - 12, width: Math.max(m.right, b.right) - Math.min(m.x, b.x) + 24, height: m.bottom - b.y + 24 };
});
await page.screenshot({ path: file("use-8-export.png"), clip: menu });
console.log("✓ use-8-export.png");
await page.keyboard.press("Escape");
await page.mouse.click(700, 860);

// 9. окно «Нейросеть»: облачный режим с инструкцией по ключу
await page.click(".ai-btn");
await page.waitForSelector(".modal");
await page.evaluate(() => document.querySelectorAll(".mode-switch button")[1].click());
await wait(500);
await shot("install-cloud.png", ".modal");
await page.evaluate(() => document.querySelectorAll(".mode-switch button")[0].click());

await browser.close();
console.log("Готово:", file(""));
