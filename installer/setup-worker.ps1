param(
  [Parameter(Mandatory=$true)][string]$AppDir,
  [Parameter(Mandatory=$true)][ValidateSet('Prepare','Cloud','Manual','Automatic')][string]$Task,
  [Parameter(Mandatory=$true)][string]$StatusFile,
  [ValidateSet('google/gemma-4-e4b','google/gemma-4-12b-qat')][string]$Model = 'google/gemma-4-e4b',
  [switch]$Consent,
  [switch]$Simulation,
  [switch]$CheckOnly
)
$ErrorActionPreference = 'Stop'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$AppDir = [IO.Path]::GetFullPath($AppDir)
$log = [IO.Path]::ChangeExtension($StatusFile, '.log')
function Report($message, $state = 'working', $detail = '') {
  $json = @{ state=$state; message=$message; detail=$detail; log=$log } | ConvertTo-Json -Compress
  [IO.File]::WriteAllText($StatusFile, $json, [Text.UTF8Encoding]::new($false))
}
function Refresh-Path {
  $env:Path = [Environment]::GetEnvironmentVariable('Path','Machine') + ';' + [Environment]::GetEnvironmentVariable('Path','User')
  $env:Path += ';' + $env:ProgramFiles + '\nodejs;' + $env:LOCALAPPDATA + '\Programs\nodejs'
}
function Find-Lms {
  foreach ($candidate in @("$env:USERPROFILE\.lmstudio\bin\lms.exe", "$env:USERPROFILE\.cache\lm-studio\bin\lms.exe")) {
    if (Test-Path -LiteralPath $candidate) { return $candidate }
  }
  $cmd = Get-Command lms.exe -ErrorAction SilentlyContinue
  if ($cmd) { return $cmd.Source }
  return $null
}
function Run($file, [string[]]$arguments) {
  $before = $ErrorActionPreference
  try { $ErrorActionPreference='Continue'; & $file @arguments >> $log 2>&1; $nativeExit=$LASTEXITCODE }
  finally { $ErrorActionPreference=$before }
  if ($nativeExit -ne 0) { throw "Операция не завершилась (код $nativeExit). Подробности сохранены в журнале настройки." }
}
function Save-Mode($mode) {
  if ($CheckOnly) { return }
  $config = Join-Path $AppDir 'apps\api\.env'
  if (!(Test-Path -LiteralPath $config)) { Copy-Item -LiteralPath (Join-Path $AppDir 'apps\api\.env.example') -Destination $config }
  if ($mode -eq 'local') {
    $text = [IO.File]::ReadAllText($config)
    $text = [regex]::Replace($text, '(?m)^LLM_MODEL=.*$', "LLM_MODEL=$Model")
    [IO.File]::WriteAllText($config, $text, [Text.UTF8Encoding]::new($false))
  }
  [IO.File]::WriteAllText((Join-Path $AppDir '.first-run-done'), $mode, [Text.Encoding]::ASCII)
}
function Verify-Local {
  Report 'Проверяем подключение к LM Studio' 'working' 'Модель должна быть загружена, а сервер во вкладке Developer — включён.'
  try { $models = Invoke-RestMethod 'http://127.0.0.1:1234/v1/models' -TimeoutSec 10 }
  catch { throw 'LM Studio не отвечает. Откройте её, загрузите модель и включите сервер во вкладке Developer. Затем повторите проверку.' }
  if ($Model -notin @($models.data.id)) { throw "В LM Studio не найдена модель $Model. Загрузите выбранную модель или выберите другую в мастере." }
  Report 'Проверяем, отвечает ли нейросеть' 'working' 'Первый ответ может занять больше времени.'
  $body = @{ model=$Model; messages=@(@{role='user';content='Ответь одним словом: готово'}); max_tokens=40; temperature=0 } | ConvertTo-Json -Depth 5
  try { $answer = Invoke-RestMethod 'http://127.0.0.1:1234/v1/chat/completions' -Method Post -ContentType 'application/json; charset=utf-8' -Body ([Text.Encoding]::UTF8.GetBytes($body)) -TimeoutSec 120 }
  catch { throw 'Модель найдена, но пробный ответ не получен. Проверьте её загрузку и свободную память в LM Studio, затем повторите проверку.' }
  if (!$answer.choices[0].message.content) { throw 'Нейросеть вернула пустой ответ. Проверьте модель в LM Studio и повторите попытку.' }
}
try {
  # This guard precedes every install, download, simulation and configuration write.
  if ($Task -eq 'Automatic' -and !$Consent) { throw 'Автоматическая установка LM Studio требует вашего явного согласия.' }
  if ($CheckOnly -and $Task -ne 'Manual') { throw 'Проверка без изменений доступна только для самостоятельно настроенной LM Studio.' }
  if ($Simulation) {
    Report 'Проверяем компоненты — тестовый режим' 'working' 'Установка и загрузка не выполняются.'
    Start-Sleep -Milliseconds 900
    Report 'Проверка сценария завершена' 'done' 'Тестовый режим: программы, модели и настройки не изменялись.'
    exit 0
  }
  Set-Location -LiteralPath $AppDir
  if ($Task -eq 'Prepare') {
    Report 'Проверяем необходимые компоненты' 'working' 'Для работы Салфетки нужен Node.js. Если его нет, установим его с вашего разрешения.'
    Refresh-Path
    if (!(Get-Command node.exe -ErrorAction SilentlyContinue)) {
      if (!(Get-Command winget.exe -ErrorAction SilentlyContinue)) { throw 'Автоматическая установка Node.js недоступна. Установите LTS-версию с nodejs.org и повторите настройку.' }
      Report 'Устанавливаем Node.js' 'working' 'Windows может запросить разрешение. Установка может занять несколько минут.'
      Run 'winget.exe' @('install','--id','OpenJS.NodeJS.LTS','-e','--silent','--accept-source-agreements','--accept-package-agreements','--disable-interactivity')
      Refresh-Path
    }
    if (!(Get-Command node.exe -ErrorAction SilentlyContinue)) { throw 'Node.js пока не найден. Завершите его установку и повторите настройку.' }
    $major = [int]((& node.exe -p 'process.versions.node.split(".")[0]') | Select-Object -Last 1)
    if ($major -lt 20) { throw 'Нужна более новая версия Node.js. Установите актуальную LTS-версию с nodejs.org и повторите настройку.' }
    Report 'Подготавливаем Салфетку' 'working' 'Скачиваем необходимые компоненты. Дождитесь завершения — нужен интернет.'
    if (Test-Path -LiteralPath (Join-Path $AppDir 'package-lock.json')) { Run 'npm.cmd' @('ci','--no-audit','--no-fund') }
    else { Run 'npm.cmd' @('install','--no-audit','--no-fund') }
    $config = Join-Path $AppDir 'apps\api\.env'
    if (!(Test-Path -LiteralPath $config)) { Copy-Item -LiteralPath (Join-Path $AppDir 'apps\api\.env.example') -Destination $config }
    Report 'Салфетка подготовлена' 'done'
  } elseif ($Task -eq 'Cloud') {
    Save-Mode 'cloud'
    Report 'Режим через интернет выбран' 'done' 'При запуске Салфетки подключите OpenRouter. Ключ вводится только в самой программе.'
  } else {
    if ($Task -eq 'Automatic') {
      Report 'Проверяем свободное место' 'working' 'LM Studio и модель займут несколько гигабайт.'
      $drive = [IO.DriveInfo]::new([IO.Path]::GetPathRoot($env:USERPROFILE))
      if ($drive.AvailableFreeSpace -lt 12GB) { throw 'Для автоматической настройки освободите не менее 12 ГБ на диске профиля пользователя. Или установите LM Studio и модель самостоятельно на другой диск.' }
      $lms = Find-Lms
      if (!$lms) {
        $app = @("$env:LOCALAPPDATA\Programs\LM Studio\LM Studio.exe", "$env:ProgramFiles\LM Studio\LM Studio.exe") | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
        if (!$app) {
          if (!(Get-Command winget.exe -ErrorAction SilentlyContinue)) { throw 'Автоматическая установка недоступна. Выберите самостоятельную установку LM Studio.' }
          Report 'Устанавливаем LM Studio' 'working' 'Windows может запросить разрешение. Дождитесь завершения.'
          Run 'winget.exe' @('install','--id','ElementLabs.LMStudio','-e','--silent','--accept-source-agreements','--accept-package-agreements','--disable-interactivity')
          $app = @("$env:LOCALAPPDATA\Programs\LM Studio\LM Studio.exe", "$env:ProgramFiles\LM Studio\LM Studio.exe") | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
        }
        if ($app) {
          Report 'Открываем LM Studio в первый раз' 'working' 'Если появится приветствие LM Studio, завершите его. Мастер продолжит, когда программа будет готова.'
          Start-Process -FilePath $app -WindowStyle Normal | Out-Null
          for ($i=0; $i -lt 60 -and !$lms; $i++) { Start-Sleep -Seconds 2; $lms = Find-Lms }
        }
      }
      if (!$lms) { throw 'Откройте LM Studio один раз и завершите её приветствие. Затем вернитесь в мастер и повторите настройку.' }
      Report 'Скачиваем выбранную модель' 'working' 'Загрузка может занять от нескольких минут до часа и больше. Размер зависит от модели. Ход загрузки доступен в журнале.'
      Run $lms @('get',$Model,'-y')
      Report 'Включаем сервер нейросети' 'working' 'Подготавливаем подключение к Салфетке.'
      try { Invoke-RestMethod 'http://127.0.0.1:1234/v1/models' -TimeoutSec 3 | Out-Null }
      catch { Run $lms @('server','start') }
      Report 'Загружаем модель в память' 'working' 'Если памяти недостаточно, выберите более лёгкую модель.'
      Run $lms @('load',$Model,'--context-length','8192','-y')
      Report 'Подготавливаем подбор значков по смыслу' 'working' 'Скачиваем дополнительную небольшую модель. Если это не удастся, значки будут подбираться по словам.'
      $semantic=$true
      try {
        Run $lms @('get','https://huggingface.co/nomic-ai/nomic-embed-text-v1.5-GGUF','-y')
        Run $lms @('load','text-embedding-nomic-embed-text-v1.5','-y')
      } catch { $semantic=$false }
    }
    Verify-Local
    Save-Mode 'local'
    $detail='Можно создавать первую схему. Доступность подбора значков по смыслу будет показана в Салфетке.'
    if($Task -eq 'Automatic' -and !$semantic){$detail='Можно создавать схемы. Дополнительная модель значков не загрузилась: пока значки будут подбираться по словам.'}
    Report 'Нейросеть отвечает — всё готово' 'done' $detail
  }
  exit 0
} catch {
  Report 'Настройку пока не удалось завершить' 'error' $_.Exception.Message
  exit 1
}
