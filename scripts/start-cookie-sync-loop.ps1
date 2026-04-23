param(
  [string]$CookieSourcePath = "",
  [int]$IntervalHours = 6
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$stateDir = Join-Path $repoRoot ".cookie-sync"
$pidFile = Join-Path $stateDir "cookie-sync.pid"
$stdoutLog = Join-Path $stateDir "cookie-sync.stdout.log"
$stderrLog = Join-Path $stateDir "cookie-sync.stderr.log"
$syncScript = Join-Path $PSScriptRoot "sync-youtube-cookies.ps1"

function Process-Exists([int]$Pid) {
  try {
    Get-Process -Id $Pid -ErrorAction Stop | Out-Null
    return $true
  } catch {
    return $false
  }
}

New-Item -ItemType Directory -Path $stateDir -Force | Out-Null

if (Test-Path $pidFile) {
  $existingPid = Get-Content $pidFile -ErrorAction SilentlyContinue | Select-Object -First 1
  if ($existingPid -and (Process-Exists -Pid ([int]$existingPid))) {
    Write-Output "cookie sync loop is already running with pid $existingPid"
    exit 0
  }
}

Set-Content -Path $pidFile -Value $PID -Encoding ascii

try {
  while ($true) {
    $argumentText = "-ExecutionPolicy Bypass -File `"$syncScript`""
    if ($CookieSourcePath) {
      $argumentText += " -CookieSourcePath `"$CookieSourcePath`""
    }

    $process = Start-Process powershell.exe `
      -ArgumentList $argumentText `
      -NoNewWindow `
      -RedirectStandardOutput $stdoutLog `
      -RedirectStandardError $stderrLog `
      -PassThru `
      -Wait

    Start-Sleep -Seconds ([Math]::Max(3600, $IntervalHours * 3600))
  }
} finally {
  Remove-Item -Path $pidFile -Force -ErrorAction SilentlyContinue
}
