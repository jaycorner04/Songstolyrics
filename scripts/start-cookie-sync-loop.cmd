@echo off
setlocal
set SCRIPT_DIR=%~dp0
powershell.exe -WindowStyle Hidden -ExecutionPolicy Bypass -File "%SCRIPT_DIR%start-cookie-sync-loop.ps1" -CookieSourcePath "C:\Users\abhis\Downloads\cookies.txt"
