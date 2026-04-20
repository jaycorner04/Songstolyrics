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

  $candidatePaths = @()
  if ($RequestedPath) {
    $candidatePaths += $RequestedPath
  }

  $candidatePaths += @(
    (Join-Path $env:USERPROFILE "Downloads\cookies.txt"),
    (Join-Path $env:USERPROFILE "Downloads\youtube-cookies.txt"),
    (Join-Path $repoRoot "runtime\youtube-cookies.txt")
  )

  foreach ($candidate in $candidatePaths) {
    if ($candidate -and (Test-Path -LiteralPath $candidate)) {
      return (Resolve-Path -LiteralPath $candidate).Path
    }
  }

  $downloadMatches = Get-ChildItem (Join-Path $env:USERPROFILE "Downloads") -Filter "*cookies*.txt" -ErrorAction SilentlyContinue |
    Sort-Object LastWriteTime -Descending

  if ($downloadMatches) {
    return $downloadMatches[0].FullName
  }

  throw "No cookie file was found. Put a YouTube cookies export in Downloads or pass -CookieSourcePath."
}

function Invoke-SshCommand {
  param([string]$Command)

  & $sshExe -o StrictHostKeyChecking=accept-new -i $sshKeyPath "$RemoteUser@$RemoteHost" $Command
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

$resolvedCookieSourcePath = Resolve-CookieSourcePath -RequestedPath $CookieSourcePath
$cookieFile = Get-Item -LiteralPath $resolvedCookieSourcePath

if ($cookieFile.Length -le 0) {
  throw "Cookie file is empty: $resolvedCookieSourcePath"
}

Write-Output "Uploading cookie file: $resolvedCookieSourcePath"

& $scpExe -o StrictHostKeyChecking=accept-new -i $sshKeyPath $resolvedCookieSourcePath "${RemoteUser}@${RemoteHost}:${remoteCookiePath}"

Write-Output "Verifying cookie file on server..."
Invoke-SshCommand "ls -l '$remoteCookiePath'"

Write-Output "Running yt-dlp verification inside the live container..."
Invoke-SshCommand "sudo docker exec song-to-lyrics /opt/venv/bin/python -m yt_dlp --cookies /data/youtube-cookies.txt --skip-download '$VerifyUrl' 2>&1 | head -20"

Write-Output "Cookie sync complete."
