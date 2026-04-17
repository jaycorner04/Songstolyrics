$repoRoot = Split-Path -Parent $PSScriptRoot
$stateDir = Join-Path $repoRoot ".live-debug"
$pidFile = Join-Path $stateDir "live-debug.pid"

if (-not (Test-Path $pidFile)) {
  Write-Output "live debug tunnel is not running."
  exit 0
}

$pid = Get-Content -Path $pidFile | Select-Object -First 1

if ($pid) {
  Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
}

Remove-Item -Path $pidFile -Force -ErrorAction SilentlyContinue
Write-Output "live debug tunnel stopped."
