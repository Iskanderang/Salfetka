// Снимки всех форм в выбранных стилях — для проверки нового стиля глазами.
// node scripts/gallery-shots.mjs comic:comic flat:indigo
// Сервис должен работать (npm run dev). Снимки — в docs/gallery/<стиль>-<палитра>/.
import { createRequire } from "node:module";
import fs from "node:fs";
const require = createRequire(import.meta.url);
const puppeteer = require("puppeteer-core");

const pairs = process.argv.slice(2);
const b = await puppeteer.launch({ executablePath: "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe", headless: true });
const page = await b.newPage();
await page.setViewport({ width: 1100, height: 900, deviceScaleFactor: 1 });
for (const pair of pairs) {
  const [style, theme] = pair.split(":");
  const dir = `docs/gallery/${style}-${theme}`;
  fs.mkdirSync(dir, { recursive: true });
  await page.goto(`http://localhost:5173/gallery.html?style=${style}&theme=${theme}`, { waitUntil: "networkidle0" });
  await page.addStyleTag({ content: ".bar{position:static!important}.grid{grid-template-columns:1fr!important;width:1000px}" });
  await new Promise((r) => setTimeout(r, 1500));
  const figs = await page.$$("figure");
  for (const f of figs) {
    const id = await f.evaluate((el) => el.dataset.form);
    await f.screenshot({ path: `${dir}/${id}.png` });
  }
  console.log(pair, figs.length);
}
await b.close();
