@echo off
setlocal enabledelayedexpansion
title Foreigners Studio - Windows Secure Installer

echo ==========================================================
echo    Foreigners Studio - Windows Secure Installer
echo ==========================================================
echo Initializing environment and eliminating SmartScreen blocks...
echo.

cd /d "%~dp0"

:: Execute the PowerShell installer with execution policy bypass
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0install-windows.ps1" %*
set "EXIT_CODE=%ERRORLEVEL%"

if %EXIT_CODE% neq 0 (
    echo.
    echo [ERROR] Installation or certificate trust configuration failed with code %EXIT_CODE%.
    if "%~1"=="" pause
    exit /b %EXIT_CODE%
)

echo.
echo Process complete.
exit /b 0
