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
// Package only version-controlled application files, never arbitrary workspace contents.
const tracked = execFileSync("git", ["ls-files", "-z"], { encoding: "utf8" }).split("\0").filter(Boolean);
const roots = new Set(["package.json", "package-lock.json", "README.md", "LICENSE", "start.bat", "Первый запуск.bat"]);
const runtimeInstaller = new Set(["installer/setup-wizard.ps1", "installer/setup-worker.ps1", "installer/salfetka.ico"]);
const files = tracked.filter((name) => roots.has(name) || runtimeInstaller.has(name) ||
  ((name.startsWith("apps/") || name.startsWith("packages/")) && !/(^|\/)(?:node_modules|dist|\.cache|\.setup|\.git)(\/|$)/.test(name) && !/(^|\/)\.env(?:\..*)?$/.test(name)) ||
  name === "apps/api/.env.example" || name === "scripts/update.bat");
files.push("installer/Salfetka.Setup.exe");
const manifest = files.map((name) => {
  if (/["\r\n]/.test(name)) throw new Error("Unsupported package path");
  return `Source: "..\\${name.replaceAll("/", "\\")}"; DestDir: "{app}\\${path.posix.dirname(name) === "." ? "" : path.posix.dirname(name).replaceAll("/", "\\")}"; Flags: ignoreversion`;
}).join("\r\n");
fs.writeFileSync("installer/package-files.iss", "\ufeff; Generated from the Git file list. Do not edit.\r\n" + manifest + "\r\n");
execFileSync(iscc, [`/DAppVer=${version}`, "installer/salfetka-local.iss"], { stdio: "inherit" });
console.log(`Готово: installer/Output/Salfetka-Setup-${version}.exe (программа внутри; для настройки нужен интернет)`);
