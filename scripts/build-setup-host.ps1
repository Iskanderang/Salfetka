$ErrorActionPreference='Stop'
$root=Split-Path -Parent $PSScriptRoot
$output=Join-Path $root 'installer\Salfetka.Setup.exe'
if(Test-Path -LiteralPath $output){Remove-Item -LiteralPath $output}
Add-Type -Path (Join-Path $root 'installer\SetupHost.cs') -ReferencedAssemblies @([System.Management.Automation.PowerShell].Assembly.Location,'System.Windows.Forms','System.Core') -OutputAssembly $output -OutputType WindowsApplication
Write-Output 'Built Salfetka.Setup.exe (.NET Framework + Windows PowerShell)'
