$repoRoot = Split-Path -Parent $PSScriptRoot
$pidFile = Join-Path $repoRoot ".autopush\\auto-push.pid"

if (-not (Test-Path $pidFile)) {
  Write-Output "auto-push watcher is not running."
  exit 0
}

$pid = Get-Content -Path $pidFile | Select-Object -First 1

if ($pid) {
  Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
}

Remove-Item -Path $pidFile -Force -ErrorAction SilentlyContinue
Write-Output "auto-push watcher stopped."
