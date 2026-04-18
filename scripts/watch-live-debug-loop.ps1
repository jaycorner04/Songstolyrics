$repoRoot = Split-Path -Parent $PSScriptRoot
$startScript = Join-Path $PSScriptRoot "start-live-debug-tunnel.ps1"
$stopScript = Join-Path $PSScriptRoot "stop-live-debug-tunnel.ps1"
$intervalSeconds = 6
$localPort = if ($env:LIVE_DEBUG_LOCAL_PORT) { [int]$env:LIVE_DEBUG_LOCAL_PORT } else { 3000 }
$expectedRuntimeRoot = if ($env:LIVE_DEBUG_EXPECT_RUNTIME_ROOT) {
  $env:LIVE_DEBUG_EXPECT_RUNTIME_ROOT
} else {
  "/data"
}
$healthUrl = "http://127.0.0.1:$localPort/api/health"

function Test-LiveDebugHealth() {
  try {
    $response = Invoke-WebRequest -UseBasicParsing -Uri $healthUrl -TimeoutSec 4
    $escapedRuntimeRoot = [Regex]::Escape($expectedRuntimeRoot.Replace("\", "/"))
    return $response.Content -match ('"runtimeRoot":"{0}"' -f $escapedRuntimeRoot)
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
