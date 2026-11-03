@echo off
rem Автообновление Салфетки. Его запускает start.bat из временной копии:
rem если git pull поменяет сам start.bat, работающая копия не сломается.
rem %1 - папка проекта. Результат - в переменной NF_UPDATED:
rem   new      - скачана новая версия
rem   newdeps  - новая версия, и поменялись библиотеки (нужен npm install)
rem   same     - уже последняя версия
rem   fail     - не получилось (нет интернета или файлы меняли вручную) - работаем на текущей
rem   skip     - проект скачан не через git clone, обновлять нечем
set "NF_ROOT=%~1"
pushd "%NF_ROOT%"
set "NF_UPDATED=skip"
if not exist ".git" goto :done
where git >nul 2>nul || goto :done
git remote get-url origin >nul 2>nul || goto :done
for /f %%i in ('git rev-parse HEAD') do set "NF_OLD=%%i"
rem без интернета git не должен висеть долго
git -c http.lowSpeedLimit=1000 -c http.lowSpeedTime=15 pull --ff-only --quiet >nul 2>nul
if errorlevel 1 (
  set "NF_UPDATED=fail"
  goto :done
)
for /f %%i in ('git rev-parse HEAD') do set "NF_NEW=%%i"
set "NF_UPDATED=same"
if "%NF_OLD%"=="%NF_NEW%" goto :done
set "NF_UPDATED=new"
git diff --quiet %NF_OLD% %NF_NEW% -- package-lock.json || set "NF_UPDATED=newdeps"
:done
popd
rem для проверки: NF_UPDATE_ONLY=1 - только обновить и сообщить результат, сервис не запускать
if defined NF_UPDATE_ONLY (
  echo %NF_UPDATED%
  exit /b 0
)
rem запускаем свежий start.bat без call: эта копия завершается, новая начинает с начала
"%NF_ROOT%\start.bat"
