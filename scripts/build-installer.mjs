// Сборка установщика Salfetka-Setup-<версия>.exe (нужен Inno Setup 6: winget install JRSoftware.InnoSetup).
// node scripts/build-installer.mjs → installer/Output/
// Готовый файл выкладывается на GitHub в раздел Releases — ссылку на него дают тем, кому сложно ставить через git.
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
execFileSync(iscc, [`/DAppVer=${version}`, "installer/salfetka.iss"], { stdio: "inherit" });
console.log(`Готово: installer/Output/Salfetka-Setup-${version}.exe`);
