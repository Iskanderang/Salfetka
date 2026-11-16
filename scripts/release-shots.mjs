// Product-only screenshots in a fresh browser profile, using public demonstration data.
import puppeteer from "puppeteer-core";
import fs from "node:fs";
const dir = ".github/screenshots/v1.2.0";
fs.mkdirSync(dir, { recursive: true });
const data = JSON.parse(fs.readFileSync("apps/web/src/promo/data.json", "utf8"));
const browser = await puppeteer.launch({ executablePath: "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe", headless: true });
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 980, deviceScaleFactor: 1 });
  const errors = [];
  page.on("pageerror", e => errors.push(e.message));
  const figures = [];
  for (const [style, name] of [["comic", "Комикс"], ["blueprint", "Чертёж"], ["constructivism", "Конструктивизм"], ["newspaper", "Газета"]]) {
    await page.goto(`http://127.0.0.1:5187/gallery.html?style=${style}`, { waitUntil: "networkidle0" });
    await page.waitForSelector('figure[data-form="roadmap"] svg');
    let markup = await page.$eval('figure[data-form="roadmap"]', el => el.innerHTML);
    markup = markup.replace(/id="([^"]+)"/g, `id="${style}-$1"`).replace(/url\(#([^)]+)\)/g, `url(#${style}-$1)`);
    figures.push({ name, markup });
  }
  await page.evaluate(figures => {
    document.body.innerHTML = `<main style="padding:32px;background:#edf1f7;font-family:Manrope,sans-serif"><h1 style="font-size:29px;color:#152b46;margin:0 0 8px">Четыре новых стиля Салфетки</h1><p style="color:#52647b;margin:0 0 24px">Один пример — четыре варианта оформления</p><div style="display:grid;grid-template-columns:1fr 1fr;gap:20px">${figures.map(({name,markup})=>`<section style="background:white;border-radius:14px;overflow:hidden"><h2 style="margin:0;padding:18px 22px;font-size:18px;color:#152b46">${name}</h2>${markup}</section>`).join('')}</div></main>`;
    const style = document.createElement('style');
    style.textContent = 'section>svg{width:100%;height:auto;display:block}figcaption{display:none}';
    document.head.appendChild(style);
  }, figures);
  await page.screenshot({ path: `${dir}/new-styles.png`, fullPage: true });
  await page.goto('http://127.0.0.1:5187/', { waitUntil: 'domcontentloaded' });
  await page.evaluate(({visual,text}) => {
    localStorage.clear();
    const settings = { 'nf.history': [{id:'public-demo',visual,layout:'roadmap',source:text,at:0}], 'nf.text':text, 'nf.uiTheme':'light','nf.style':'comic','nf.sideTab':'style','nf.seenVersion':'1.2.0' };
    for (const [key,value] of Object.entries(settings)) localStorage.setItem(key, JSON.stringify(value));
  }, data);
  await page.reload({ waitUntil: 'networkidle0' });
  await page.waitForSelector('.sidebar .style-card');
  await page.evaluate(async () => { const {loadFont,styleFonts}=await import('/src/render/fonts.ts');await Promise.all(styleFonts().map(loadFont));await document.fonts.ready; });
  // Capture the real style picker and a product-only canvas crop, without OS/browser chrome.
  await (await page.$('.sidebar')).screenshot({ path: `${dir}/style-picker.png` });
  await (await page.$('.preview')).screenshot({ path:`${dir}/example.png` });
  if (errors.length) throw new Error(errors.join('\n'));
  console.log('Saved 3 product screenshots using only public demo data.');
} finally { await browser.close(); }
