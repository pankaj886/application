!include "MUI2.nsh"
!include "FileFunc.nsh"

Name "Foreigners Studio"
OutFile "dist-release\Foreigners_Studio_1.1.6_x64-setup.exe"
InstallDir "$LOCALAPPDATA\Foreigners Studio"
RequestExecutionLevel user
SetCompressor /SOLID lzma

!define MUI_ICON "src-tauri\icons\icon.ico"
!define MUI_UNICON "src-tauri\icons\icon.ico"

!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_LANGUAGE "English"

Section "Install"
  ; Force terminate existing application and all child WebView2 processes
  nsExec::Exec 'taskkill /F /T /IM foreigners_studio.exe'
  nsExec::Exec 'taskkill /F /T /IM msedgewebview2.exe'
  Sleep 1500

  SetOutPath "$INSTDIR"

  ; Ensure old executable is removed before copying new one (retry loop + rename fallback)
  StrCpy $R0 0
  retry_delete:
    ClearErrors
    Delete "$INSTDIR\foreigners_studio.exe"
    IfErrors 0 delete_done
    ; If direct delete failed, attempt renaming out of the way
    Rename "$INSTDIR\foreigners_studio.exe" "$INSTDIR\foreigners_studio.exe.old"
    Delete "$INSTDIR\foreigners_studio.exe.old"
    IfFileExists "$INSTDIR\foreigners_studio.exe" 0 delete_done
    IntOp $R0 $R0 + 1
    IntCmp $R0 10 delete_done
    nsExec::Exec 'taskkill /F /T /IM foreigners_studio.exe'
    nsExec::Exec 'taskkill /F /T /IM msedgewebview2.exe'
    Sleep 500
    Goto retry_delete
  delete_done:

  File "dist-release\foreigners_studio.exe"
  File "dist-release\WebView2Loader.dll"

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
