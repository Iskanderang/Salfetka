$ErrorActionPreference='Stop'
$root=Split-Path -Parent $PSScriptRoot
$folder=Join-Path $root ('docs\installer-check\worker-tests\'+[Guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Force -Path $folder|Out-Null
$worker=Join-Path $root 'installer\setup-worker.ps1'
foreach($name in @('setup-worker.ps1','setup-wizard.ps1')){
  $tokens=$null;$parseErrors=$null
  [Management.Automation.Language.Parser]::ParseFile((Join-Path $root ('installer\'+$name)),[ref]$tokens,[ref]$parseErrors)|Out-Null
  if($parseErrors){throw ($parseErrors|Out-String)}
}
$fixture=Join-Path $folder 'fresh-app'
New-Item -ItemType Directory -Force -Path (Join-Path $fixture 'apps\api')|Out-Null
Copy-Item -LiteralPath (Join-Path $root 'apps\api\.env.example') -Destination (Join-Path $fixture 'apps\api\.env.example') -Force
$checks=@()
foreach($simulation in @($false,$true)){
  $status=Join-Path $folder ('denied-'+$simulation+'.json')
  $arguments=@('-NoProfile','-ExecutionPolicy','Bypass','-File',$worker,'-AppDir',$fixture,'-Task','Automatic','-StatusFile',$status)
  if($simulation){$arguments+='-Simulation'}
  & powershell.exe @arguments
  $result=[IO.File]::ReadAllText($status)|ConvertFrom-Json
  if($LASTEXITCODE -ne 1 -or $result.state -ne 'error' -or $result.detail -notlike '*согласия*'){throw 'Automatic consent guard failed'}
  if(Test-Path -LiteralPath (Join-Path $fixture '.first-run-done')){throw 'Denied installation modified setup marker'}
  $checks+='Automatic installation denied without consent (simulation='+$simulation+')'
}
foreach($task in @('Prepare','Cloud','Manual','Automatic')){
  $status=Join-Path $folder ($task+'.json')
  $arguments=@('-NoProfile','-ExecutionPolicy','Bypass','-File',$worker,'-AppDir',$fixture,'-Task',$task,'-StatusFile',$status,'-Simulation')
  if($task -eq 'Automatic'){$arguments+='-Consent'}
  & powershell.exe @arguments
  $result=[IO.File]::ReadAllText($status)|ConvertFrom-Json
  if($LASTEXITCODE -ne 0 -or $result.state -ne 'done'){throw ('Simulation failed: '+$task)}
  if(Test-Path -LiteralPath (Join-Path $fixture '.first-run-done')){throw 'Simulation wrote setup marker'}
  $checks+='Worker completion protocol: '+$task
}
$status=Join-Path $folder 'cloud-finalize.json'
& powershell.exe -NoProfile -ExecutionPolicy Bypass -File $worker -AppDir $fixture -Task Cloud -StatusFile $status
if($LASTEXITCODE -ne 0 -or (Get-Content -LiteralPath (Join-Path $fixture '.first-run-done') -Raw) -ne 'cloud'){throw 'Cloud configuration failed'}
if(!(Test-Path -LiteralPath (Join-Path $fixture 'apps\api\.env'))){throw 'Default config missing'}
$checks+='Cloud mode saves correct marker and default config in isolated fixture'
$checks|Set-Content -LiteralPath (Join-Path $folder 'results.txt') -Encoding UTF8
$checks
