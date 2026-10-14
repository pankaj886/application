!include "MUI2.nsh"
!include "FileFunc.nsh"

Name "Foreigners Studio"
OutFile "C:\Users\udayy\Documents\passport\Application\dist-release\Foreigners_Studio_1.0.88_x64-setup.exe"
InstallDir "$LOCALAPPDATA\Foreigners Studio"
RequestExecutionLevel user
SetCompressor /SOLID lzma

!define MUI_ICON "C:\Users\udayy\Documents\passport\Application\src-tauri\icons\icon.ico"
!define MUI_UNICON "C:\Users\udayy\Documents\passport\Application\src-tauri\icons\icon.ico"

!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_LANGUAGE "English"

Section "Install"
  ; Terminate any running instance of the application
  nsExec::Exec 'taskkill /F /IM foreigners_studio.exe'
  nsExec::Exec 'taskkill /F /IM msedgewebview2.exe'
  Sleep 1200

  SetOutPath "$INSTDIR"
  File "C:\Users\udayy\Documents\passport\Application\dist-release\foreigners_studio.exe"
  File "C:\Users\udayy\Documents\passport\Application\dist-release\WebView2Loader.dll"

  WriteUninstaller "$INSTDIR\uninstall.exe"
  CreateDirectory "$SMPROGRAMS"
  CreateShortcut "$SMPROGRAMS\Foreigners Studio.lnk" "$INSTDIR\foreigners_studio.exe" "" "$INSTDIR\foreigners_studio.exe" 0

  ; Open straight in interactive user session via Windows ShellExecute (guarantees visible desktop window)
  IfSilent skip_launch
  ExecShell "" "$INSTDIR\foreigners_studio.exe"
skip_launch:
SectionEnd

Section "Uninstall"
  Delete "$SMPROGRAMS\Foreigners Studio.lnk"
  Delete "$INSTDIR\foreigners_studio.exe"
  Delete "$INSTDIR\WebView2Loader.dll"
  Delete "$INSTDIR\uninstall.exe"
  RMDir "$INSTDIR"
SectionEnd
