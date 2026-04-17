$repoRoot = Split-Path -Parent $PSScriptRoot
$startScript = Join-Path $PSScriptRoot "start-live-debug-tunnel.ps1"
$stopScript = Join-Path $PSScriptRoot "stop-live-debug-tunnel.ps1"
$intervalSeconds = 6
$healthUrl = "http://127.0.0.1:3000/api/health"

function Test-LiveDebugHealth() {
  try {
    $response = Invoke-WebRequest -UseBasicParsing -Uri $healthUrl -TimeoutSec 4
    return $response.Content -match '"runtimeRoot":"\/data"'
  } catch {
    return $false
  }
}

while ($true) {
  try {
    if (-not (Test-LiveDebugHealth)) {
      try {
        & $startScript | Out-Null
      } catch {
        try {
          & $stopScript | Out-Null
        } catch {}

        try {
          & $startScript | Out-Null
        } catch {}
      }
    }
  } catch {}

  Start-Sleep -Seconds $intervalSeconds
}
