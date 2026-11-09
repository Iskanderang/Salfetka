; Установщик Салфетки для тех, кому сложно ставить с GitHub вручную.
; Сам установщик маленький: он кладёт в папку скрипт install.ps1 и иконку, а install.ps1 скачивает
; свежую Салфетку с GitHub (через Git — с автообновлениями). Затем запускается мастер первого запуска.
; Сборка: node scripts/build-installer.mjs (нужен Inno Setup 6) → installer/Output/Salfetka-Setup-<версия>.exe

#ifndef AppVer
  #define AppVer "1.0.0"
#endif

[Setup]
AppId={{4E0862C5-1DC0-442A-93D8-907AC18AD8CE}
AppName=Салфетка
AppVersion={#AppVer}
AppVerName=Салфетка {#AppVer}
AppPublisher=Салфетка
AppPublisherURL=https://t.me/ii_eggs
AppSupportURL=https://github.com/Iskanderang/Salfetka
AppUpdatesURL=https://github.com/Iskanderang/Salfetka
; без прав администратора: всё ставится в папку пользователя
PrivilegesRequired=lowest
DefaultDirName={%USERPROFILE}\Salfetka
; если выбрать другую папку, внутри неё всё равно будет «Salfetka» — удаление не заденет чужие файлы
AppendDefaultDirName=yes
DisableProgramGroupPage=yes
LicenseFile=..\LICENSE
OutputDir=Output
OutputBaseFilename=Salfetka-Setup-{#AppVer}
SetupIconFile=salfetka.ico
UninstallDisplayIcon={app}\installer\salfetka.ico
UninstallDisplayName=Салфетка
WizardStyle=modern
Compression=lzma2
SolidCompression=yes

[Languages]
Name: "ru"; MessagesFile: "compiler:Languages\Russian.isl"

[CustomMessages]
ru.DesktopIcon=Ярлык «Салфетка» на рабочем столе
ru.RunWizard=Запустить мастер первого запуска (Node.js, библиотеки, нейросеть)
ru.DownloadFailed=Не удалось скачать Салфетку с GitHub. Проверьте интернет и запустите установщик ещё раз.

[Tasks]
Name: "desktopicon"; Description: "{cm:DesktopIcon}"

[Files]
Source: "install.ps1"; DestDir: "{app}\installer"; Flags: ignoreversion
Source: "salfetka.ico"; DestDir: "{app}\installer"; Flags: ignoreversion

[Icons]
Name: "{autoprograms}\Салфетка"; Filename: "{app}\start.bat"; WorkingDir: "{app}"; IconFilename: "{app}\installer\salfetka.ico"
Name: "{autoprograms}\Удалить Салфетку"; Filename: "{uninstallexe}"
Name: "{autodesktop}\Салфетка"; Filename: "{app}\start.bat"; WorkingDir: "{app}"; IconFilename: "{app}\installer\salfetka.ico"; Tasks: desktopicon

[Run]
Filename: "{app}\Первый запуск.bat"; WorkingDir: "{app}"; Description: "{cm:RunWizard}"; Flags: postinstall shellexec nowait skipifsilent; Check: AppReady

[UninstallDelete]
; скачанная Салфетка, библиотеки и настройки — вся папка
Type: filesandordirs; Name: "{app}"

[Code]
function AppReady: Boolean;
begin
  Result := FileExists(ExpandConstant('{app}\start.bat'));
end;

procedure CurStepChanged(CurStep: TSetupStep);
var
  Params: String;
  Code: Integer;
begin
  if CurStep = ssPostInstall then
  begin
    Params := '-NoProfile -ExecutionPolicy Bypass -File "' + ExpandConstant('{app}\installer\install.ps1') + '" -Dir "' + ExpandConstant('{app}') + '"';
    if WizardSilent then
      Params := Params + ' -Quiet';
    if (not Exec('powershell.exe', Params, '', SW_SHOW, ewWaitUntilTerminated, Code)) or (Code <> 0) then
      SuppressibleMsgBox(CustomMessage('DownloadFailed'), mbError, MB_OK, IDOK);
  end;
end;
