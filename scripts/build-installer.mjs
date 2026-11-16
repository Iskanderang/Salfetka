// Сборка установщика Salfetka-Setup-<версия>.exe (нужен Inno Setup 6: winget install JRSoftware.InnoSetup).
// node scripts/build-installer.mjs → installer/Output/
// Сам проект внутри установщика; для подготовки Node.js, зависимостей и моделей нужен интернет.
// Старый web-установщик-загрузчик (installer/salfetka.iss) больше не собирается.
// Готовый файл выкладывается на GitHub в раздел Releases вместе с проектом.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const version = JSON.parse(fs.readFileSync("package.json", "utf8")).version;
const candidates = [
  path.join(process.env.LOCALAPPDATA ?? "", "Programs", "Inno Setup 6", "ISCC.exe"),
  "C:\\Program Files (x86)\\Inno Setup 6\\ISCC.exe",
  "C:\\Program Files\\Inno Setup 6\\ISCC.exe",
];
const iscc = candidates.find((p) => fs.existsSync(p));
if (!iscc) {
  console.error("Не найден Inno Setup 6. Установите: winget install JRSoftware.InnoSetup");
  process.exit(1);
}
if (process.argv.includes("--refresh-branding") || !["wizard.bmp", "wizard-small.bmp"].every((name) => fs.existsSync(path.join("installer/assets", name)))) {
  execFileSync("python", ["scripts/installer-assets.py"], { stdio: "inherit" });
}
execFileSync("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", "scripts/build-setup-host.ps1"], { stdio: "inherit" });
execFileSync(iscc, [`/DAppVer=${version}`, "installer/salfetka-local.iss"], { stdio: "inherit" });
console.log(`Готово: installer/Output/Salfetka-Setup-${version}.exe (программа внутри; для настройки нужен интернет)`);
