$repoRoot = Split-Path -Parent $PSScriptRoot
$stateDir = Join-Path $repoRoot ".live-debug"
$pidFile = Join-Path $stateDir "live-debug.pid"
$stdoutLog = Join-Path $stateDir "live-debug.stdout.log"
$stderrLog = Join-Path $stateDir "live-debug.stderr.log"
$sshExe = Join-Path $env:WINDIR "System32\OpenSSH\ssh.exe"
$sshKeyPath = if ($env:LIVE_DEBUG_SSH_KEY_PATH) {
  $env:LIVE_DEBUG_SSH_KEY_PATH
} else {
  Join-Path $env:USERPROFILE "Downloads\song-to-lyrics-key.pem"
}
$remoteUser = if ($env:LIVE_DEBUG_REMOTE_USER) { $env:LIVE_DEBUG_REMOTE_USER } else { "ec2-user" }
$remoteAddress = if ($env:LIVE_DEBUG_REMOTE_HOST) { $env:LIVE_DEBUG_REMOTE_HOST } else { "15.206.23.118" }
$remoteHost = "${remoteUser}@${remoteAddress}"
$localPort = if ($env:LIVE_DEBUG_LOCAL_PORT) { [int]$env:LIVE_DEBUG_LOCAL_PORT } else { 3000 }
$remotePort = if ($env:LIVE_DEBUG_REMOTE_PORT) { [int]$env:LIVE_DEBUG_REMOTE_PORT } else { 3000 }
$expectedRuntimeRoot = if ($env:LIVE_DEBUG_EXPECT_RUNTIME_ROOT) {
  $env:LIVE_DEBUG_EXPECT_RUNTIME_ROOT
} else {
  "/data"
}
$sshConnectTimeoutSeconds = if ($env:LIVE_DEBUG_CONNECT_TIMEOUT_SECONDS) {
  [int]$env:LIVE_DEBUG_CONNECT_TIMEOUT_SECONDS
} else {
  8
}
$sshServerAliveIntervalSeconds = if ($env:LIVE_DEBUG_SERVER_ALIVE_INTERVAL_SECONDS) {
  [int]$env:LIVE_DEBUG_SERVER_ALIVE_INTERVAL_SECONDS
} else {
  15
}
$sshServerAliveCountMax = if ($env:LIVE_DEBUG_SERVER_ALIVE_COUNT_MAX) {
  [int]$env:LIVE_DEBUG_SERVER_ALIVE_COUNT_MAX
} else {
  3
}
$tunnelSpec = "${localPort}:127.0.0.1:${remotePort}"

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

function Test-LiveDebugHealth() {
  try {
    $response = Invoke-WebRequest -UseBasicParsing -Uri "http://127.0.0.1:$localPort/api/health" -TimeoutSec 4
    $escapedRuntimeRoot = [Regex]::Escape($expectedRuntimeRoot.Replace("\", "/"))
    return $response.Content -match ('"runtimeRoot":"{0}"' -f $escapedRuntimeRoot)
  } catch {
    return $false
  }
}

New-Item -ItemType Directory -Path $stateDir -Force | Out-Null

if (-not (Test-Path $sshExe)) {
  throw "OpenSSH client was not found at $sshExe"
}

if (-not (Test-Path $sshKeyPath)) {
  throw "SSH key was not found at $sshKeyPath"
}

if (Test-Path $pidFile) {
  $existingPid = Get-Content -Path $pidFile | Select-Object -First 1
  if ($existingPid) {
    $existingProcess = Get-Process -Id $existingPid -ErrorAction SilentlyContinue
    if ($existingProcess -and (Get-ListeningProcessIds -Port $localPort) -contains [int]$existingPid -and (Test-LiveDebugHealth)) {
      Write-Output "live debug tunnel is already running on localhost:$localPort"
      exit 0
    }
  }
  Remove-Item -Path $pidFile -Force -ErrorAction SilentlyContinue
}

$listenerPids = Get-ListeningProcessIds -Port $localPort

foreach ($listenerPid in $listenerPids) {
  $process = Get-Process -Id $listenerPid -ErrorAction SilentlyContinue
  $commandLine = Get-ProcessCommandLine -ProcessId $listenerPid

  if ($process -and $process.ProcessName -eq "ssh" -and $commandLine -like "*$tunnelSpec*" -and $commandLine -like "*$remoteHost*") {
    Set-Content -Path $pidFile -Value $listenerPid -Encoding ascii
    Write-Output "live debug tunnel is already running on localhost:$localPort"
    exit 0
  }

  if ($process -and $process.ProcessName -eq "node" -and $commandLine -like "*src/server.js*") {
    Stop-Process -Id $listenerPid -Force -ErrorAction SilentlyContinue
    Start-Sleep -Milliseconds 800
    continue
  }

  throw "localhost:$localPort is already in use by process $listenerPid ($($process.ProcessName)). Stop it first or run npm run live-debug:stop."
}

$process = Start-Process `
  -FilePath $sshExe `
  -ArgumentList @(
    "-N",
    "-L",
    $tunnelSpec,
    "-i",
    $sshKeyPath,
    "-o",
    "StrictHostKeyChecking=no",
    "-o",
    "ExitOnForwardFailure=yes",
    "-o",
    "ConnectTimeout=$sshConnectTimeoutSeconds",
    "-o",
    "ServerAliveInterval=$sshServerAliveIntervalSeconds",
    "-o",
    "ServerAliveCountMax=$sshServerAliveCountMax",
    $remoteHost
  ) `
  -WorkingDirectory $repoRoot `
  -WindowStyle Hidden `
  -RedirectStandardOutput $stdoutLog `
  -RedirectStandardError $stderrLog `
  -PassThru

Set-Content -Path $pidFile -Value $process.Id -Encoding ascii

for ($attempt = 0; $attempt -lt 12; $attempt += 1) {
  Start-Sleep -Milliseconds 500
  if (Test-LiveDebugHealth) {
    Write-Output "live debug tunnel is ready on http://localhost:$localPort"
    exit 0
  }
}

$activeProcess = Get-Process -Id $process.Id -ErrorAction SilentlyContinue
if ($activeProcess) {
  Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue
}

Remove-Item -Path $pidFile -Force -ErrorAction SilentlyContinue

$stderrTail = ""
if (Test-Path $stderrLog) {
  $stderrTail = (Get-Content -Path $stderrLog -Tail 20 -ErrorAction SilentlyContinue) -join [Environment]::NewLine
}

throw ("live debug tunnel started but the remote health check did not appear on localhost:{0} yet. " +
  "Target={1}, remote port={2}, expected runtime root={3}. Check {4}.{5}") -f `
  $localPort, `
  $remoteHost, `
  $remotePort, `
  $expectedRuntimeRoot, `
  $stderrLog, `
  $(if ($stderrTail) { [Environment]::NewLine + $stderrTail } else { "" })
