$repoRoot = Split-Path -Parent $PSScriptRoot
$stateDir = Join-Path $repoRoot ".live-debug"
$pidFile = Join-Path $stateDir "live-debug.pid"
$watchdogPidFile = Join-Path $stateDir "live-debug-watchdog.pid"
$localPort = if ($env:LIVE_DEBUG_LOCAL_PORT) { [int]$env:LIVE_DEBUG_LOCAL_PORT } else { 3000 }
$remotePort = if ($env:LIVE_DEBUG_REMOTE_PORT) { [int]$env:LIVE_DEBUG_REMOTE_PORT } else { 3000 }
$remoteUser = if ($env:LIVE_DEBUG_REMOTE_USER) { $env:LIVE_DEBUG_REMOTE_USER } else { "ec2-user" }
$remoteAddress = if ($env:LIVE_DEBUG_REMOTE_HOST) { $env:LIVE_DEBUG_REMOTE_HOST } else { "3.110.128.0" }
$tunnelSpec = "${localPort}:127.0.0.1:${remotePort}"
$remoteHost = "${remoteUser}@${remoteAddress}"

function Get-ListeningProcessIds([int]$Port) {
  try {
    return @(Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction Stop | Select-Object -ExpandProperty OwningProcess -Unique)
  } catch {
    return @()
  }
}

function Get-ProcessCommandLine([int]$ProcessId) {
  try {
    return (Get-CimInstance Win32_Process -Filter "ProcessId = $ProcessId" -ErrorAction Stop).CommandLine
  } catch {
    return ""
  }
}

if (-not (Test-Path $pidFile)) {
  foreach ($listenerPid in (Get-ListeningProcessIds -Port $localPort)) {
    $process = Get-Process -Id $listenerPid -ErrorAction SilentlyContinue
    $commandLine = Get-ProcessCommandLine -ProcessId $listenerPid

    if ($process -and $process.ProcessName -eq "ssh" -and $commandLine -like "*$tunnelSpec*" -and $commandLine -like "*$remoteHost*") {
      Stop-Process -Id $listenerPid -Force -ErrorAction SilentlyContinue
      Write-Output "live debug tunnel stopped."
      exit 0
    }
  }

  Write-Output "live debug tunnel is not running."
  exit 0
}

$tunnelPid = Get-Content -Path $pidFile | Select-Object -First 1

if ($tunnelPid) {
  Stop-Process -Id $tunnelPid -Force -ErrorAction SilentlyContinue
}

Remove-Item -Path $pidFile -Force -ErrorAction SilentlyContinue

if (Test-Path $watchdogPidFile) {
  $watchdogPid = Get-Content -Path $watchdogPidFile | Select-Object -First 1

  if ($watchdogPid) {
    Stop-Process -Id $watchdogPid -Force -ErrorAction SilentlyContinue
  }

  Remove-Item -Path $watchdogPidFile -Force -ErrorAction SilentlyContinue
}

Write-Output "live debug tunnel stopped."
