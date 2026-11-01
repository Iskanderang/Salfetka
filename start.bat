@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0"
title Салфетка - превращаем текст в схемы

rem ─── Настройки ──────────────────────────────────────────────
rem Модель из LM Studio. Поменяли модель - поменяйте и в apps\api\.env
set "MODEL=google/gemma-4-12b-qat"
rem Модель для подбора иконок по смыслу (84 МБ)
set "EMBED=text-embedding-nomic-embed-text-v1.5"
set "WEB_PORT=5173"
rem ────────────────────────────────────────────────────────────

rem Цвета для консоли (ANSI)
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
echo %MA%   ║%N%  %B%С А Л Ф Е Т К А%N%                                    %MA%║%N%
echo %MA%   ║%N%  текст → инфографика. Без подписки, SMS и облаков.  %MA%║%N%
echo %MA%   ║%N%  %DIM%Работает на вашей видеокарте, а не на чужой.%N%       %MA%║%N%
echo %MA%   ╚════════════════════════════════════════════════════╝%N%
echo.
echo %DIM%   Сейчас я проверю, что всё на месте, разбужу нейросеть
echo    и открою сервис в браузере. Займёт от 10 секунд до минуты.%N%
echo.

rem ─── 1. Node.js ─────────────────────────────────────────────
echo %CY%[1/5]%N% %B%Ищу Node.js%N% - движок, на котором крутится сайт...
where node >nul 2>nul || goto :no_node
for /f "delims=" %%v in ('node -v') do set "NODEV=%%v"
echo       %GR%✓%N% Нашёлся, версия %NODEV%. Живой, тёплый, дышит.
echo.

rem ─── 2. LM Studio ───────────────────────────────────────────
echo %CY%[2/5]%N% %B%Стучусь в LM Studio%N% - там живёт нейросеть...
where lms >nul 2>nul || goto :no_lms
lms server start >nul 2>nul
echo       %GR%✓%N% Сервер нейросети на порту 1234. Проснулся, ворчит, но работает.
echo.

rem ─── 3. Модель ──────────────────────────────────────────────
echo %CY%[3/5]%N% %B%Проверяю, загружена ли модель%N% %DIM%%MODEL%%N%
lms ps 2>nul | findstr /i /c:"%MODEL%" >nul && goto :model_ready
echo       Модель спит. Заливаю ~7 ГБ мозгов в видеокарту.
echo       %DIM%Видеокарта слегка нервничает, вентиляторы делают вид, что всё под контролем.%N%
echo.
lms load "%MODEL%" --gpu max --context-length 8192 -y
if errorlevel 1 goto :model_fail
echo.
echo       %GR%✓%N% Модель загружена. IQ видеокарты временно повышен.
goto :model_done
:model_ready
echo       %GR%✓%N% Модель уже в памяти и разминаться не нужно.
:model_done
rem Вторая, крошечная модель подбирает иконки по смыслу
lms ps 2>nul | findstr /i /c:"%EMBED%" >nul && goto :embed_ready
lms load "%EMBED%" -y >nul 2>nul
if errorlevel 1 (
  echo       %YE%!%N% Модель для иконок не загрузилась - иконки будут искаться по словам, а не по смыслу.
  goto :embed_done
)
:embed_ready
echo       %GR%✓%N% Подборщик иконок на месте: знает 1500 картинок и понимает, что «деньги» - это монетки.
:embed_done
echo.
goto :deps

:no_lms
echo       %YE%!%N% Не нашёл консольную утилиту LM Studio %DIM%(lms)%N%.
echo       %YE%  Откройте LM Studio вручную: загрузите модель и включите сервер%N%
echo       %YE%  (вкладка Developer → Start Server). Я пока продолжу без неё.%N%
echo.
goto :deps

:model_fail
echo       %RE%✗ Модель не загрузилась.%N% Возможно, у неё другое имя.
echo         Список моделей: %B%lms ls%N%. Имя поменяйте в начале start.bat и в apps\api\.env
echo         Продолжаю, но без модели схемы рисоваться не будут.
echo.

rem ─── 4. Зависимости ─────────────────────────────────────────
:deps
echo %CY%[4/5]%N% %B%Проверяю библиотеки проекта%N%...
if exist node_modules goto :deps_ok
echo       Первый запуск: скачиваю половину интернета %DIM%(для Node.js это нормально)%N%.
echo       %DIM%Минута-две. Можно сделать чай. Или сложить салфетку - мы же Салфетка.%N%
echo.
call npm install
if errorlevel 1 goto :npm_fail
:deps_ok
echo       %GR%✓%N% Всё на месте, ничего не потерялось.
echo.

rem ─── 5. Запуск ──────────────────────────────────────────────
echo %CY%[5/5]%N% %B%Запускаю сервис%N%...
netstat -ano | findstr /r /c:":%WEB_PORT% .*LISTENING" >nul && goto :already

set /a R=%RANDOM% %% 10
set "J0=Учу нейросеть рисовать стрелочки. Пока она рисует только кружочки."
set "J1=Объясняю модели, что «синергия» - это не пункт плана."
set "J2=Раскладываю ваши мысли по полочкам. Полочки из SVG, мысли ваши."
set "J3=Если что-то пойдёт не так - это фича. Если всё ок - тоже фича."
set "J4=Дизайнер устал и ушёл. Вместо него работают 12 миллиардов параметров."
set "J5=Конвертирую «ну короче» в «Этап 1: Анализ»."
set "J6=Никакие тексты не улетают в облако. Только в вашу видеокарту. Ей можно доверять."
set "J7=Рисую диаграммы быстрее, чем вы скажете «а можно ещё вариант?»."
set "J8=Стиль «Салфетка»: выглядит, будто вы рисовали на обеде. Но аккуратнее."
set "J9=Подбираю иконки по смыслу. Ракета для MVP - классика, не спорьте."
call set "JOKE=%%J%R%%%"

echo       %GR%✓%N% API нейросети:   %B%http://localhost:8787%N%
echo       %GR%✓%N% Сайт:            %B%http://localhost:%WEB_PORT%%N%  %DIM%(откроется сам через пару секунд)%N%
echo.
echo   %MA%»%N% %JOKE%
echo.
echo %DIM%   ─────────────────────────────────────────────────────────
echo    Как пользоваться:
echo      1. Вставьте текст слева
echo      2. Выделите кусок и нажмите «Визуализировать» (или Ctrl+Enter)
echo      3. Выберите стиль, раскладку и палитру
echo      4. Кликните по пункту на схеме - поменяйте текст, иконку или цвет
echo      5. «Скачать» - PNG, PNG без фона, сторис или SVG
echo.
echo    %YE%Не закрывайте это окно%DIM% - в нём работает сервис.
echo    Чтобы остановить: Ctrl+C, затем Y. Или просто закройте окно.
echo    Ниже будут технические логи. Их можно не читать, они скучные.
echo    ─────────────────────────────────────────────────────────%N%
echo.

if not defined NF_NO_BROWSER start "" /min cmd /c "%SystemRoot%\System32\timeout.exe /t 4 >nul & start http://localhost:%WEB_PORT%"
call npm run dev

echo.
echo %MA%   Сервис остановлен. Салфетка аккуратно сложена. До встречи!%N%
echo.
pause
exit /b 0

:already
echo       %YE%!%N% Сервис уже запущен (порт %WEB_PORT% занят). Второй раз не запускаю,
echo         а то они начнут спорить, кто главный. Открываю браузер.
if not defined NF_NO_BROWSER start http://localhost:%WEB_PORT%
echo.
%SystemRoot%\System32\timeout.exe /t 5
exit /b 0

:no_node
echo       %RE%✗ Node.js не найден.%N% Без него сайт не поедет, как машина без колёс.
echo         Скачайте LTS-версию: %B%https://nodejs.org%N%
echo         Установите и запустите этот файл снова.
echo.
pause
exit /b 1

:npm_fail
echo.
echo       %RE%✗ Библиотеки не установились.%N% Проверьте интернет и попробуйте снова.
echo         Если не поможет, удалите папку node_modules и запустите ещё раз.
echo.
pause
exit /b 1
