@echo off
setlocal enabledelayedexpansion
title Foreigners Studio - Installer

echo.
echo ===========================================================
echo    Foreigners Studio - Windows Installer
echo ===========================================================
echo.

cd /d "%~dp0"

echo Removing Windows web quarantine flags...
for /R "%~dp0" %%f in (*.exe *.msi *.dll *.zip *.ps1 *.bat *.cer) do (
    powershell -NoProfile -ExecutionPolicy Bypass -Command "Unblock-File -LiteralPath '%%f' -ErrorAction SilentlyContinue" 2>nul
)

echo Running Foreigners Studio installer...
echo.
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0install-windows.ps1" %*
set "EXIT_CODE=%ERRORLEVEL%"

if %EXIT_CODE% neq 0 (
    echo.
    echo [INFO] Setup completed with code %EXIT_CODE%.
    echo.
    echo If Windows shows a SmartScreen warning when running the app:
    echo   1. Click "More info"
    echo   2. Click "Run anyway"
    echo   The warning stops after the first successful launch.
    echo.
    if "%~1"=="" pause
    exit /b 0
)

echo.
echo Installation complete!
exit /b 0
