$repoRoot = Split-Path -Parent $PSScriptRoot
$stateDir = Join-Path $repoRoot ".autopush"
$stdoutLog = Join-Path $stateDir "autopush.stdout.log"
$stderrLog = Join-Path $stateDir "autopush.stderr.log"

New-Item -ItemType Directory -Path $stateDir -Force | Out-Null

Start-Process `
  -FilePath "node" `
  -ArgumentList "scripts/auto-push.js" `
  -WorkingDirectory $repoRoot `
  -WindowStyle Hidden `
  -RedirectStandardOutput $stdoutLog `
  -RedirectStandardError $stderrLog
