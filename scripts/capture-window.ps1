# Снимок одного окна по заголовку (для справки: окна LM Studio).
# Снимается только это окно, а не весь экран.
# Пример: powershell -ExecutionPolicy Bypass -File scripts/capture-window.ps1 -Title "LM Studio" -Out apps/web/public/help/lm-1.png
param(
  [Parameter(Mandatory = $true)][string]$Title,
  [Parameter(Mandatory = $true)][string]$Out
)

Add-Type -AssemblyName System.Drawing
Add-Type @"
using System;
using System.Runtime.InteropServices;
public static class Win {
  [StructLayout(LayoutKind.Sequential)] public struct RECT { public int Left, Top, Right, Bottom; }
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr h, out RECT r);
  [DllImport("user32.dll")] public static extern bool PrintWindow(IntPtr h, IntPtr hdc, uint flags);
  [DllImport("user32.dll")] public static extern bool IsIconic(IntPtr h);
  [DllImport("user32.dll")] public static extern bool SetProcessDPIAware();
}
"@
[Win]::SetProcessDPIAware() | Out-Null

$proc = Get-Process | Where-Object { $_.MainWindowHandle -ne 0 -and $_.MainWindowTitle -like "*$Title*" } | Select-Object -First 1
if (-not $proc) { Write-Output "NOT_FOUND"; exit 2 }
$h = $proc.MainWindowHandle
if ([Win]::IsIconic($h)) { Write-Output "MINIMIZED"; exit 3 }

$r = New-Object Win+RECT
[Win]::GetWindowRect($h, [ref]$r) | Out-Null
$w = $r.Right - $r.Left; $hgt = $r.Bottom - $r.Top
$bmp = New-Object System.Drawing.Bitmap $w, $hgt
$g = [System.Drawing.Graphics]::FromImage($bmp)
$hdc = $g.GetHdc()
# 2 = PW_RENDERFULLCONTENT: нужно для окон на Electron/Chromium, иначе получается чёрный прямоугольник
[Win]::PrintWindow($h, $hdc, 2) | Out-Null
$g.ReleaseHdc($hdc); $g.Dispose()
$full = Resolve-Path -LiteralPath (Split-Path -Parent $Out) | Select-Object -ExpandProperty Path
$path = Join-Path $full (Split-Path -Leaf $Out)
$bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
$bmp.Dispose()
Write-Output "OK $w x $hgt -> $path ($($proc.MainWindowTitle))"
