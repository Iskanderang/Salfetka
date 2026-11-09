# Установщик Салфетки: скачивает свежую версию с GitHub в выбранную папку.
# Его запускает Salfetka-Setup.exe (installer/salfetka.iss) после копирования своих файлов.
# Через Git — тогда Салфетка обновляется сама при каждом запуске start.bat; без Git — архивом.
param(
  [Parameter(Mandatory = $true)][string]$Dir,
  # тихий режим (проверка установщика): без вопросов и пауз
  [switch]$Quiet,
  # для проверки запасного пути: вести себя так, будто Git нет и поставить его нельзя
  [switch]$NoGit
)

$ErrorActionPreference = "Stop"
$Repo = "https://github.com/Iskanderang/Salfetka"
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$Host.UI.RawUI.WindowTitle = "Салфетка — установка"

function Say($text, $color = "Gray") { Write-Host "  $text" -ForegroundColor $color }
function Fail($text) {
  Write-Host ""
  Say "Не получилось: $text" Red
  Say "Проверьте интернет и запустите установщик ещё раз." Yellow
  Say "Или скачайте Салфетку вручную: $Repo" Yellow
  if (-not $Quiet) { Read-Host "  Нажмите Enter, чтобы закрыть" | Out-Null }
  exit 1
}

# git.exe: в PATH или в обычных папках (сразу после установки PATH этого окна ещё старый)
function Find-Git {
  $cmd = Get-Command git.exe -ErrorAction SilentlyContinue
  if ($cmd) { return $cmd.Source }
  foreach ($p in @("$env:ProgramFiles\Git\cmd\git.exe", "${env:ProgramFiles(x86)}\Git\cmd\git.exe", "$env:LOCALAPPDATA\Programs\Git\cmd\git.exe")) {
    if ($p -and (Test-Path $p)) { return $p }
  }
  return $null
}

Write-Host ""
Say "Салфетка — превращаем текст в схемы" White
Say "Папка: $Dir" DarkGray
Write-Host ""

# 1. Git — нужен для автообновлений
$git = if ($NoGit) { $null } else { Find-Git }
if (-not $git -and $NoGit) {
  Say "[1/3] Проверка без Git — скачаю архивом." Yellow
} elseif (-not $git) {
  Say "[1/3] Ставлю Git — с ним Салфетка будет обновляться сама..." Cyan
  if (Get-Command winget.exe -ErrorAction SilentlyContinue) {
    Say "Windows может спросить разрешение — нажмите «Да»." DarkGray
    winget install --id Git.Git -e --silent --accept-package-agreements --accept-source-agreements | Out-Null
    $git = Find-Git
  }
  if ($git) { Say "Git установлен." Green }
  else { Say "Git поставить не вышло — скачаю архивом, без автообновлений." Yellow }
} else {
  Say "[1/3] Git уже есть." Green
}

# 2. Сама Салфетка
Write-Host ""
Say "[2/3] Скачиваю Салфетку с GitHub..." Cyan
New-Item -ItemType Directory -Force -Path $Dir | Out-Null
$ok = $false
if ($git) {
  try {
    # в папке уже лежат файлы установщика, поэтому не clone, а init + fetch + checkout поверх
    Push-Location $Dir
    if (-not (Test-Path ".git")) {
      & $git init -q
      & $git remote add origin "$Repo.git"
    }
    & $git -c http.lowSpeedLimit=1000 -c http.lowSpeedTime=30 fetch -q origin master
    if ($LASTEXITCODE -ne 0) { throw "git fetch" }
    & $git checkout -q -f -B master --track origin/master
    if ($LASTEXITCODE -ne 0) { throw "git checkout" }
    $ok = $true
    Say "Готово, автообновления включены." Green
  } catch {
    Say "Через Git не получилось — пробую архивом." Yellow
  } finally {
    Pop-Location
  }
}
if (-not $ok) {
  try {
    $zip = Join-Path $env:TEMP "salfetka-master.zip"
    $tmp = Join-Path $env:TEMP "salfetka-unpack"
    Invoke-WebRequest "$Repo/archive/refs/heads/master.zip" -OutFile $zip -UseBasicParsing
    if (Test-Path $tmp) { Remove-Item $tmp -Recurse -Force }
    Expand-Archive $zip -DestinationPath $tmp -Force
    $src = Get-ChildItem $tmp -Directory | Select-Object -First 1
    Copy-Item (Join-Path $src.FullName "*") $Dir -Recurse -Force
    Remove-Item $zip, $tmp -Recurse -Force -ErrorAction SilentlyContinue
    $ok = $true
    Say "Готово (архивом: новую версию ставьте этим же установщиком)." Green
  } catch {
    Fail "не удалось скачать архив ($($_.Exception.Message))."
  }
}

# 3. Проверка
Write-Host ""
if (-not (Test-Path (Join-Path $Dir "start.bat"))) { Fail "в скачанной папке нет start.bat." }
Say "[3/3] Салфетка установлена." Green
Say "Дальше откроется мастер первого запуска: он поставит Node.js, библиотеки и нейросеть." DarkGray
Write-Host ""
exit 0
