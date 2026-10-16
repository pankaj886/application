@echo off
setlocal
cd /d "%~dp0"

:: If --verbose or -v is passed, run with visible output
if "%~1"=="--verbose" goto :VERBOSE
if "%~1"=="-v" goto :VERBOSE

:: Launch PowerShell completely hidden and exit immediately so no command prompt lingers
start "" /b powershell.exe -NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File "%~dp0install-windows.ps1" %*
exit /b 0

:VERBOSE
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0install-windows.ps1" %*
exit /b %ERRORLEVEL%
