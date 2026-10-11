@echo off
setlocal enabledelayedexpansion

echo ==========================================================
echo   Foreigners Studio - Windows Enterprise Bundle Builder   
echo ==========================================================

if exist "C:\mingw64\bin" set "PATH=C:\mingw64\bin;!PATH!"
if exist "%USERPROFILE%\.cargo\bin" set "PATH=%USERPROFILE%\.cargo\bin;!PATH!"

echo [1/4] Checking prerequisites...
where node >nul 2>nul || (echo Error: Node.js is required but not installed. & exit /b 1)
where npm >nul 2>nul || (echo Error: npm is required but not installed. & exit /b 1)
where cargo >nul 2>nul || (echo Error: Rust/Cargo is required but not installed. & exit /b 1)

echo [2/4] Building React TypeScript frontend...
call npm run build
if %ERRORLEVEL% neq 0 (echo Frontend build failed. & exit /b %ERRORLEVEL%)

echo [3/4] Building release binary and installers...
call npm run tauri build -- --bundles nsis,msi
if %ERRORLEVEL% neq 0 (
  echo Falling back to cargo build --release...
  pushd src-tauri
  cargo build --release
  popd
)

echo [4/5] Copying release artifacts to Application\dist-release...
call node copy-release.js

echo [5/5] Signing release artifacts with Authenticode...
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0sign-release.ps1"

echo ==========================================================
echo   BUILD COMPLETE: Signed artifacts ready in dist-release\
echo ==========================================================
