$repoRoot = Split-Path -Parent $PSScriptRoot
$stateDir = Join-Path $repoRoot ".live-debug"
$pidFile = Join-Path $stateDir "live-debug-watchdog.pid"
$stdoutLog = Join-Path $stateDir "live-debug-watchdog.stdout.log"
$stderrLog = Join-Path $stateDir "live-debug-watchdog.stderr.log"
$watchdogScript = Join-Path $PSScriptRoot "watch-live-debug-loop.ps1"

New-Item -ItemType Directory -Path $stateDir -Force | Out-Null

if (Test-Path $pidFile) {
  $existingPid = Get-Content -Path $pidFile | Select-Object -First 1

  if ($existingPid) {
    $existingProcess = Get-Process -Id $existingPid -ErrorAction SilentlyContinue

    if ($existingProcess) {
      Write-Output "live debug watchdog is already running."
      exit 0
    }
  }

  Remove-Item -Path $pidFile -Force -ErrorAction SilentlyContinue
}

$process = Start-Process `
  -FilePath "powershell" `
  -ArgumentList @(
    "-ExecutionPolicy",
    "Bypass",
    "-File",
    $watchdogScript
  ) `
  -WorkingDirectory $repoRoot `
  -WindowStyle Hidden `
  -RedirectStandardOutput $stdoutLog `
  -RedirectStandardError $stderrLog `
  -PassThru

Set-Content -Path $pidFile -Value $process.Id -Encoding ascii
Write-Output "live debug watchdog started."
