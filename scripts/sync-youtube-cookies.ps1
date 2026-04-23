param(
  [string]$CookieSourcePath = "",
  [string]$RemoteHost = "15.206.23.118",
  [string]$RemoteUser = "ec2-user",
  [string]$RemoteAppDir = "/home/ec2-user/Songstolyrics",
  [string]$VerifyUrl = "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$defaultKeyPath = Join-Path $env:USERPROFILE "Downloads\song-to-lyrics-key.pem"
$sshKeyPath = if ($env:SONG_TO_LYRICS_SSH_KEY_PATH) { $env:SONG_TO_LYRICS_SSH_KEY_PATH } else { $defaultKeyPath }
$sshExe = Join-Path $env:WINDIR "System32\OpenSSH\ssh.exe"
$scpExe = Join-Path $env:WINDIR "System32\OpenSSH\scp.exe"
$remoteCookiePath = "$RemoteAppDir/runtime/youtube-cookies.txt"

function Resolve-CookieSourcePath {
  param([string]$RequestedPath)

  $candidatePaths = New-Object System.Collections.Generic.List[string]
  if ($RequestedPath) {
    $candidatePaths.Add($RequestedPath)
  }

  $candidatePaths.Add((Join-Path $repoRoot "runtime\youtube-cookies.txt"))
  $candidatePaths.Add((Join-Path $env:USERPROFILE "Downloads\cookies.txt"))
  $candidatePaths.Add((Join-Path $env:USERPROFILE "Downloads\youtube-cookies.txt"))

  $downloadMatches = Get-ChildItem (Join-Path $env:USERPROFILE "Downloads") -Filter "*cookies*.txt" -ErrorAction SilentlyContinue |
    Sort-Object LastWriteTime -Descending

  foreach ($match in $downloadMatches) {
    $candidatePaths.Add($match.FullName)
  }

  $resolved = New-Object System.Collections.Generic.List[string]
  $seen = @{}

  foreach ($candidate in $candidatePaths) {
    if (-not $candidate -or -not (Test-Path -LiteralPath $candidate)) {
      continue
    }

    $resolvedPath = (Resolve-Path -LiteralPath $candidate).Path
    if ($seen.ContainsKey($resolvedPath)) {
      continue
    }

    $seen[$resolvedPath] = $true
    $resolved.Add($resolvedPath)
  }

  if (-not $resolved.Count) {
    throw "No cookie file was found. Put a YouTube cookies export in Downloads or pass -CookieSourcePath."
  }

  return $resolved
}

function Invoke-SshCommand {
  param([string]$Command)

  & $sshExe -o StrictHostKeyChecking=accept-new -i $sshKeyPath "$RemoteUser@$RemoteHost" $Command
}

function Test-VerificationOutput {
  param([string[]]$Lines)

  $joinedOutput = ($Lines -join "`n")
  $invalidPatterns = @(
    "cookies are no longer valid",
    "Sign in to confirm",
    "There are no video formats",
    "HTTP Error 403",
    "Requested format is not available"
  )

  foreach ($pattern in $invalidPatterns) {
    if ($joinedOutput -match [Regex]::Escape($pattern)) {
      return $false
    }
  }

  return ($joinedOutput -match "\[info\]" -or $joinedOutput -match "Downloading webpage")
}

if (-not (Test-Path -LiteralPath $sshExe)) {
  throw "OpenSSH client not found at $sshExe"
}

if (-not (Test-Path -LiteralPath $scpExe)) {
  throw "SCP client not found at $scpExe"
}

if (-not (Test-Path -LiteralPath $sshKeyPath)) {
  throw "SSH key not found at $sshKeyPath"
}

$resolvedCookieSourcePaths = Resolve-CookieSourcePath -RequestedPath $CookieSourcePath
$verifiedCookiePath = $null

foreach ($candidatePath in $resolvedCookieSourcePaths) {
  $cookieFile = Get-Item -LiteralPath $candidatePath

  if ($cookieFile.Length -le 0) {
    continue
  }

  Write-Output "Uploading cookie file candidate: $candidatePath"
  & $scpExe -o StrictHostKeyChecking=accept-new -i $sshKeyPath $candidatePath "${RemoteUser}@${RemoteHost}:${remoteCookiePath}" | Out-Null

  Write-Output "Verifying candidate on server..."
  $verificationLines = @(Invoke-SshCommand "sudo docker exec song-to-lyrics /opt/venv/bin/python -m yt_dlp --cookies /data/youtube-cookies.txt --skip-download '$VerifyUrl' 2>&1 | head -20")
  $verificationLines | ForEach-Object { Write-Output $_ }

  if (Test-VerificationOutput -Lines $verificationLines) {
    $verifiedCookiePath = $candidatePath
    break
  }

  Write-Output "Candidate was uploaded but did not verify cleanly. Trying the next cookie file..."
}

if (-not $verifiedCookiePath) {
  throw "No valid cookie file verified successfully. Export fresh YouTube cookies and rerun the sync."
}

Write-Output "Verified cookie source: $verifiedCookiePath"
Invoke-SshCommand "ls -l '$remoteCookiePath'"
Write-Output "Cookie sync complete."
