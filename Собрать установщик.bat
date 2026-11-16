@echo off
chcp 65001 >nul
title Салфетка — сборка установщика
cd /d "%~dp0"

echo.
echo   Салфетка — сборка Salfetka-Setup.exe
echo   ────────────────────────────────────
echo.

REM Проверка типов перед сборкой: лучше упасть здесь, чем выпустить битый установщик
echo   [1/2] Проверка типов...
call npm run typecheck
if errorlevel 1 (
  echo.
  echo   ОШИБКА: проверка типов не прошла — установщик не собран.
  pause
  exit /b 1
)

echo.
echo   [2/2] Сборка установщика Inno Setup...
node scripts\build-installer.mjs
if errorlevel 1 (
  echo.
  echo   ОШИБКА: сборка не удалась. Если Inno Setup не установлен:
  echo   winget install JRSoftware.InnoSetup
  pause
  exit /b 1
)

echo.
echo   Готово! Файл лежит в installer\Output\
explorer installer\Output
pause
