@echo off
chcp 65001 >nul
cd /d "%~dp0"
setlocal
title Салфетка - первый запуск

rem ─── Мастер первого запуска ─────────────────────────────────
rem Ведёт новичка по шагам: Node.js, библиотеки, где работает нейросеть, LM Studio и её сервер, модели.
rem Где можно - ставит сам (winget, npm, lms), где нельзя - объясняет и ждёт, потом проверяет снова.
rem В конце создаёт файл .first-run-done: дальше start.bat работает сам, без вопросов.

rem модель и адрес можно переопределить снаружи (для проверки мастера)
if not defined MODEL set "MODEL=google/gemma-4-12b-qat"
if not defined MODEL_GET set "MODEL_GET=%MODEL%"
set "EMBED=text-embedding-nomic-embed-text-v1.5"
set "EMBED_GET=https://huggingface.co/nomic-ai/nomic-embed-text-v1.5-GGUF"
if not defined LM_URL set "LM_URL=http://localhost:1234"
set "SETUP_MODE=local"

for /F %%a in ('echo prompt $E ^| cmd') do set "ESC=%%a"
set "N=%ESC%[0m"
set "B=%ESC%[1m"
set "DIM=%ESC%[90m"
set "CY=%ESC%[96m"
set "GR=%ESC%[92m"
set "YE=%ESC%[93m"
set "RE=%ESC%[91m"
set "MA=%ESC%[94m"

cls
echo.
echo %MA%   ╔════════════════════════════════════════════════════╗%N%
echo %MA%   ║%N%  %B%С А Л Ф Е Т К А%N%   ·   первый запуск                %MA%║%N%
echo %MA%   ╚════════════════════════════════════════════════════╝%N%
echo.
echo   Привет! Я проведу вас по шагам и помогу поставить всё, что нужно.
echo   Где смогу - сделаю сам, где не смогу - подскажу, что нажать.
echo   Отвечайте цифрами на клавиатуре, Enter нажимать не нужно.
echo.
echo   %DIM%Нажмите любую клавишу, чтобы начать...%N%
call :wait

rem ─── 1. Node.js ─────────────────────────────────────────────
:node
echo.
echo %CY%[1/5]%N% %B%Node.js%N% - движок, на котором работает сайт Салфетки
call :find_node
if defined NODE_OK goto :node_ok
echo       %YE%Node.js не установлен.%N%
echo       %B%1%N% - установить автоматически %DIM%(через winget, около 30 МБ)%N%
echo       %B%2%N% - открыть сайт nodejs.org и установить самому
echo       %B%3%N% - выйти
call :ask 123
if "%ANSWER%"=="3" goto :bye
if "%ANSWER%"=="2" goto :node_site
where winget >nul 2>nul || goto :node_nowinget
echo       Устанавливаю Node.js... %DIM%Windows может спросить разрешение - согласитесь.%N%
winget install --id OpenJS.NodeJS.LTS -e --silent --accept-source-agreements --accept-package-agreements
goto :node
:node_nowinget
echo       %YE%Автоматическая установка недоступна - поставим через сайт.%N%
:node_site
start "" "https://nodejs.org/ru/download"
echo       Скачайте версию %B%LTS%N%, установите с настройками по умолчанию и вернитесь сюда.
echo       %DIM%Нажмите любую клавишу, когда установка закончится...%N%
call :wait
goto :node
:node_ok
echo       %GR%✓%N% Node.js %NODEV% на месте.

rem ─── 2. Библиотеки и настройки ──────────────────────────────
:deps
echo.
echo %CY%[2/5]%N% %B%Библиотеки и настройки Салфетки%N%
if not exist "apps\api\.env" copy /y "apps\api\.env.example" "apps\api\.env" >nul
if exist "node_modules" goto :deps_ok
:deps_run
echo       Скачиваю библиотеки - нужен интернет, займёт 1-2 минуты.
echo.
call npm install
if errorlevel 1 goto :deps_fail
:deps_ok
echo       %GR%✓%N% Библиотеки и настройки на месте.
goto :mode
:deps_fail
echo       %RE%✗ Библиотеки не скачались.%N% Проверьте интернет.
echo       %B%1%N% - попробовать снова    %B%2%N% - выйти
call :ask 12
if "%ANSWER%"=="2" goto :bye
goto :deps_run

rem ─── 3. Где работает нейросеть ──────────────────────────────
:mode
echo.
echo %CY%[3/5]%N% %B%Где будет работать нейросеть?%N%
echo       %B%1%N% - на моём компьютере, через LM Studio
echo           %DIM%бесплатно и без интернета, тексты никуда не уходят;
echo           нужна видеокарта с 8 ГБ памяти или больше, скачается около 7 ГБ%N%
echo       %B%2%N% - в облаке, через OpenRouter
echo           %DIM%подойдёт без видеокарты; нужен бесплатный ключ, тексты уходят в интернет%N%
call :ask 12
if "%ANSWER%"=="2" goto :cloud
goto :lms
:cloud
set "SETUP_MODE=cloud"
echo       %GR%✓%N% Облако. Ключ OpenRouter вставите в браузере - я сразу открою нужное окно.
goto :finish

rem ─── 4. LM Studio и её сервер ───────────────────────────────
:lms
echo.
echo %CY%[4/5]%N% %B%LM Studio и её сервер%N%
call :find_lms
call :ping
if defined LMS goto :server
rem LM Studio уже работает с включённым сервером, но её помощник lms не найден - можно и так
if defined LM_UP goto :server_ok
if defined LMAPP goto :lms_never_opened
echo       %YE%LM Studio не найдена.%N%
echo       %B%1%N% - установить автоматически %DIM%(через winget, около 500 МБ)%N%
echo       %B%2%N% - открыть сайт lmstudio.ai и установить самому
echo       %B%3%N% - передумал, работаю через облако
call :ask 123
if "%ANSWER%"=="3" goto :cloud
if "%ANSWER%"=="2" goto :lms_site
where winget >nul 2>nul || goto :lms_site
echo       Устанавливаю LM Studio... %DIM%это может занять несколько минут.%N%
winget install --id ElementLabs.LMStudio -e --silent --accept-source-agreements --accept-package-agreements
goto :lms
:lms_site
start "" "https://lmstudio.ai/download"
echo       Установите LM Studio, %B%откройте её один раз%N% и вернитесь сюда.
echo       %DIM%Нажмите любую клавишу, когда LM Studio откроется...%N%
call :wait
goto :lms
:lms_never_opened
echo       LM Studio установлена, но ещё ни разу не открывалась -
echo       без этого не появится её помощник %B%lms%N%, через который я с ней говорю.
echo       %B%1%N% - открыть LM Studio сейчас    %B%2%N% - я открою сам
call :ask 12
if "%ANSWER%"=="2" goto :lms_wait
start "" "%LMAPP%"
:lms_wait
echo       %DIM%Дождитесь, пока LM Studio откроется, и нажмите любую клавишу...%N%
call :wait
goto :lms

:server
echo       %GR%✓%N% LM Studio на месте.
echo       Проверяю сервер нейросети: %B%%LM_URL%%N% ...
if defined LM_UP goto :server_ok
"%LMS%" server start >nul 2>nul
call :ping
if defined LM_UP goto :server_ok
echo       %YE%Сервер не отвечает.%N% Включите его в LM Studio:
echo       вкладка %B%Developer%N% слева, переключатель %B%Status: Running%N% сверху.
echo       Включили?   %B%1%N% - да, проверить снова    %B%2%N% - пропустить
call :ask 12
if "%ANSWER%"=="2" goto :models
call :ping
if defined LM_UP goto :server_ok
goto :server
:server_ok
echo       %GR%✓%N% Сервер готов: %LM_URL%

rem ─── 5. Модели ──────────────────────────────────────────────
:models
echo.
echo %CY%[5/5]%N% %B%Модели нейросети%N%
if defined LMS goto :model_check
echo       %YE%!%N% Помощник LM Studio не найден - проверить модели сам не могу.
echo         Убедитесь в LM Studio, что скачана модель %B%%MODEL%%N%.
goto :finish
:model_check
"%LMS%" ls 2>nul | findstr /i /c:"%MODEL%" >nul && goto :model_have
echo       Модель %B%%MODEL%%N% ещё не скачана %DIM%(около 7 ГБ)%N%.
echo       %B%1%N% - скачать сейчас    %B%2%N% - пропустить, скачаю потом
call :ask 12
if "%ANSWER%"=="2" goto :embed
echo       Скачиваю... %DIM%Это надолго - от 5 минут до часа, смотря какой интернет.%N%
"%LMS%" get "%MODEL_GET%" -y
"%LMS%" ls 2>nul | findstr /i /c:"%MODEL%" >nul || goto :model_fail
:model_have
echo       %GR%✓%N% Модель %MODEL% скачана.
goto :embed
:model_fail
echo       %RE%✗ Модель не скачалась.%N% Проверьте интернет и свободное место на диске.
echo       %B%1%N% - попробовать снова    %B%2%N% - пропустить
call :ask 12
if "%ANSWER%"=="2" goto :embed
goto :model_check

:embed
"%LMS%" ls 2>nul | findstr /i /c:"%EMBED%" >nul && goto :embed_have
echo       Маленькая модель для подбора иконок по смыслу ещё не скачана %DIM%(84 МБ)%N%.
echo       %B%1%N% - скачать %DIM%(рекомендую)%N%    %B%2%N% - пропустить: иконки будут искаться по словам
call :ask 12
if "%ANSWER%"=="2" goto :load
"%LMS%" get "%EMBED_GET%" -y
"%LMS%" ls 2>nul | findstr /i /c:"%EMBED%" >nul && goto :embed_have
echo       %YE%!%N% Не скачалась - иконки будут искаться по словам.
goto :load
:embed_have
echo       %GR%✓%N% Модель для иконок на месте.

:load
echo       Загружаю модели в видеокарту...
"%LMS%" ps 2>nul | findstr /i /c:"%MODEL%" >nul || "%LMS%" load "%MODEL%" --gpu max --context-length 8192 -y >nul 2>nul
"%LMS%" ps 2>nul | findstr /i /c:"%EMBED%" >nul || "%LMS%" load "%EMBED%" -y >nul 2>nul
"%LMS%" ps 2>nul | findstr /i /c:"%MODEL%" >nul && goto :load_ok
echo       %YE%!%N% Модель пока не загрузилась - start.bat попробует ещё раз при запуске.
goto :finish
:load_ok
echo       %GR%✓%N% Нейросеть загружена и готова к работе.

rem ─── Готово ─────────────────────────────────────────────────
:finish
if not exist "apps\api\.env" copy /y "apps\api\.env.example" "apps\api\.env" >nul
rem отметка «мастер пройден» и выбранный режим - start.bat больше не будет задавать вопросов
>".first-run-done" echo %SETUP_MODE%
echo.
echo %GR%   ╔════════════════════════════════════════════════════╗%N%
echo %GR%   ║%N%  %B%✓ Первый запуск пройден!%N%                           %GR%║%N%
echo %GR%   ╚════════════════════════════════════════════════════╝%N%
echo.
echo   Дальше всегда запускайте %B%start.bat%N% - он сам всё проверит,
echo   обновит Салфетку и откроет её в браузере. Вопросов больше не будет.
if "%SETUP_MODE%"=="cloud" echo   В браузере откроется окно «Нейросеть» - вставьте туда ключ OpenRouter, инструкция там же.
echo.
echo   Запустить Салфетку сейчас?   %B%1%N% - да    %B%2%N% - нет
call :ask 12
if "%ANSWER%"=="2" goto :later
rem start.bat без call: этот мастер завершается, обычный запуск начинается с начала
endlocal & set "NF_SETUP=%SETUP_MODE%" & "%~dp0start.bat"

:later
echo.
echo   %DIM%Хорошо. Когда захотите - запустите start.bat.%N%
pause
exit /b 0

:bye
echo.
echo   %DIM%Хорошо. Когда будете готовы - запустите «Первый запуск.bat» снова, начнём с этого же места.%N%
pause
exit /b 0

rem ─── Помощники ──────────────────────────────────────────────
rem Вопрос с ответом-цифрой: %1 - допустимые цифры, ответ - в ANSWER.
rem Обычно - одно нажатие (choice). Если клавиатура недоступна (например, ответы поданы из файла) -
rem ввод цифры с Enter и проверка; на неверный ответ переспрашиваем, а не выбираем за человека.
:ask
set "ANSWER="
set "ASK_TRIES=0"
if defined NF_ANSWERS goto :ask_scripted
if defined NF_ASK_LINE goto :ask_line
choice /c %~1 /n >nul 2>nul
if errorlevel 255 goto :ask_line
if errorlevel 1 set "ANSWER=%errorlevel%"
if defined ANSWER exit /b 0
:ask_line
set /a ASK_TRIES+=1
if %ASK_TRIES% gtr 5 (
  echo       %RE%Ответа нет - выхожу. Запустите мастер снова.%N%
  pause
  exit 1
)
set "ANSWER="
set /p "ANSWER=      Ваш ответ - цифра и Enter: "
if not defined ANSWER goto :ask_line
echo %~1| findstr /c:"%ANSWER:~0,1%" >nul || goto :ask_line
set "ANSWER=%ANSWER:~0,1%"
exit /b 0
rem для проверки мастера: ответы заранее, через пробел - NF_ANSWERS="1 2"
:ask_scripted
for /f "tokens=1*" %%a in ("%NF_ANSWERS%") do (
  set "ANSWER=%%a"
  set "NF_ANSWERS=%%b"
)
echo       %DIM%ответ: %ANSWER%%N%
exit /b 0

:find_node
set "NODE_OK="
where node >nul 2>nul || if exist "%ProgramFiles%\nodejs\node.exe" set "PATH=%ProgramFiles%\nodejs;%PATH%"
where node >nul 2>nul || exit /b 0
for /f "delims=" %%v in ('node -v') do set "NODEV=%%v"
set "NODE_OK=1"
exit /b 0

rem Помощник lms: в PATH, затем в обычных папках LM Studio (появляется после первого открытия программы).
rem Сама программа: обычные папки, затем запись в списке установленных программ Windows.
:find_lms
set "LMS="
for %%p in (lms.exe) do set "LMS=%%~$PATH:p"
if not defined LMS if exist "%USERPROFILE%\.lmstudio\bin\lms.exe" set "LMS=%USERPROFILE%\.lmstudio\bin\lms.exe"
if not defined LMS if exist "%USERPROFILE%\.cache\lm-studio\bin\lms.exe" set "LMS=%USERPROFILE%\.cache\lm-studio\bin\lms.exe"
set "LMAPP="
if exist "%LOCALAPPDATA%\Programs\LM Studio\LM Studio.exe" set "LMAPP=%LOCALAPPDATA%\Programs\LM Studio\LM Studio.exe"
if exist "%ProgramFiles%\LM Studio\LM Studio.exe" set "LMAPP=%ProgramFiles%\LM Studio\LM Studio.exe"
if defined LMAPP exit /b 0
if defined NF_TEST_NO_REG exit /b 0
rem ...и в списке установленных программ Windows. Команда PowerShell закодирована (-EncodedCommand),
rem чтобы cmd не трогал в ней символы | и кавычки. Что внутри:
rem   $p = Get-ItemProperty 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\*','HKLM:\Software\Microsoft\Windows\CurrentVersion\Uninstall\*' -ErrorAction SilentlyContinue | Where-Object { $_.DisplayName -like 'LM Studio*' } | Select-Object -First 1; if ($p.DisplayIcon) { ($p.DisplayIcon -split ',')[0].Trim([char]34) }
for /f "usebackq delims=" %%i in (`powershell -NoProfile -NonInteractive -EncodedCommand JABwACAAPQAgAEcAZQB0AC0ASQB0AGUAbQBQAHIAbwBwAGUAcgB0AHkAIAAnAEgASwBDAFUAOgBcAFMAbwBmAHQAdwBhAHIAZQBcAE0AaQBjAHIAbwBzAG8AZgB0AFwAVwBpAG4AZABvAHcAcwBcAEMAdQByAHIAZQBuAHQAVgBlAHIAcwBpAG8AbgBcAFUAbgBpAG4AcwB0AGEAbABsAFwAKgAnACwAJwBIAEsATABNADoAXABTAG8AZgB0AHcAYQByAGUAXABNAGkAYwByAG8AcwBvAGYAdABcAFcAaQBuAGQAbwB3AHMAXABDAHUAcgByAGUAbgB0AFYAZQByAHMAaQBvAG4AXABVAG4AaQBuAHMAdABhAGwAbABcACoAJwAgAC0ARQByAHIAbwByAEEAYwB0AGkAbwBuACAAUwBpAGwAZQBuAHQAbAB5AEMAbwBuAHQAaQBuAHUAZQAgAHwAIABXAGgAZQByAGUALQBPAGIAagBlAGMAdAAgAHsAIAAkAF8ALgBEAGkAcwBwAGwAYQB5AE4AYQBtAGUAIAAtAGwAaQBrAGUAIAAnAEwATQAgAFMAdAB1AGQAaQBvACoAJwAgAH0AIAB8ACAAUwBlAGwAZQBjAHQALQBPAGIAagBlAGMAdAAgAC0ARgBpAHIAcwB0ACAAMQA7ACAAaQBmACAAKAAkAHAALgBEAGkAcwBwAGwAYQB5AEkAYwBvAG4AKQAgAHsAIAAoACQAcAAuAEQAaQBzAHAAbABhAHkASQBjAG8AbgAgAC0AcwBwAGwAaQB0ACAAJwAsACcAKQBbADAAXQAuAFQAcgBpAG0AKABbAGMAaABhAHIAXQAzADQAKQAgAH0A 2^>nul`) do set "LMAPP=%%i"
if defined LMAPP if not exist "%LMAPP%" set "LMAPP="
exit /b 0

rem Пауза «нажмите любую клавишу»; при ответах из файла (NF_ASK_LINE) - строкой, чтобы не съесть весь ввод
:wait
if defined NF_ANSWERS exit /b 0
if defined NF_ASK_LINE (
  set /p "=" <nul
  set /p "NF_DUMMY="
  exit /b 0
)
pause >nul
exit /b 0

rem Отвечает ли сервер LM Studio
:ping
set "LM_UP="
curl -sf -m 3 -o nul "%LM_URL%/v1/models" >nul 2>nul && set "LM_UP=1"
exit /b 0
