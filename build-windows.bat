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

echo [3/4] Building release binary...
call npm run tauri build -- --no-bundle
if %ERRORLEVEL% neq 0 (
  echo Falling back to cargo build --release...
  pushd src-tauri
  cargo build --release
  popd
)

echo [4/4] Copying release artifacts to Application\Windows...
call node copy-release.js

echo ==========================================================
echo   BUILD COMPLETE: foreigners_studio.exe is in Windows\
echo ==========================================================
