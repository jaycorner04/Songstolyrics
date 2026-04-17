$repoRoot = Split-Path -Parent $PSScriptRoot
$stateDir = Join-Path $repoRoot ".live-debug"
$pidFile = Join-Path $stateDir "live-debug.pid"
$stdoutLog = Join-Path $stateDir "live-debug.stdout.log"
$stderrLog = Join-Path $stateDir "live-debug.stderr.log"
$sshExe = Join-Path $env:WINDIR "System32\OpenSSH\ssh.exe"
$sshKeyPath = Join-Path $env:USERPROFILE "Downloads\song-to-lyrics-key.pem"
$remoteHost = "ec2-user@3.110.128.0"
$localPort = 3000
$tunnelSpec = "${localPort}:127.0.0.1:3000"

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
    return $response.Content -match '"runtimeRoot":"\/data"'
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

throw "live debug tunnel started but the EC2 health check did not appear on localhost:$localPort yet. Check $stderrLog"
