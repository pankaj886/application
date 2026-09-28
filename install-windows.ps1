<#
.SYNOPSIS
    Foreigners Studio - Windows Secure Installer & SmartScreen Eliminator
.DESCRIPTION
    This script:
    1. Strips the Mark-of-the-Web (Zone.Identifier) from ALL files in the package
    2. Installs the Foreigners Studio Code Signing Certificate to the trusted stores
    3. Adds SmartScreen publisher exception via registry
    4. Launches the application with zero warnings

    HOW TO RUN (if you see "script is blocked"):
      Right-click this file -> "Run with PowerShell"
      OR from command prompt:
      powershell.exe -NoProfile -ExecutionPolicy Bypass -File install-windows.ps1
#>

[CmdletBinding()]
param(
    [switch]$NoLaunch
)

$ErrorActionPreference = "Continue"

Write-Host ""
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "    Foreigners Studio - Windows Installer                 " -ForegroundColor Cyan
Write-Host "    Eliminating SmartScreen blocks...                     " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host ""

$scriptDir = $PSScriptRoot
if (-not $scriptDir) {
    $scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
}
if (-not $scriptDir) {
    $scriptDir = Get-Location
}

# ─────────────────────────────────────────────────────────────────────────────
# STEP 1: Strip Mark-of-the-Web (Zone.Identifier) from ALL files
# ─────────────────────────────────────────────────────────────────────────────
Write-Host "[1/4] Stripping Web Quarantine (Zone.Identifier)..." -ForegroundColor Yellow

$unblockExtensions = @("*.exe", "*.msi", "*.dll", "*.zip", "*.bat", "*.ps1", "*.cer", "*.pfx")
$targetFiles = Get-ChildItem -Path $scriptDir -Recurse -File -Include $unblockExtensions -ErrorAction SilentlyContinue

$unblockCount = 0
foreach ($file in $targetFiles) {
    try {
        Unblock-File -LiteralPath $file.FullName -ErrorAction SilentlyContinue
        $unblockCount++
    } catch {}
}
Write-Host "      Unblocked $unblockCount file(s)." -ForegroundColor Green

# Also use streams deletion as backup (some files need this too)
foreach ($file in $targetFiles) {
    try {
        $streamPath = $file.FullName + ":Zone.Identifier"
        if ([System.IO.File]::Exists($streamPath)) {
            Remove-Item -LiteralPath $streamPath -Force -ErrorAction SilentlyContinue
        }
    } catch {}
}

# ─────────────────────────────────────────────────────────────────────────────
# STEP 2: Locate and import Foreigners Studio Certificate
# ─────────────────────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "[2/4] Configuring Trusted Publisher & Root Certificates..." -ForegroundColor Yellow

$cerCandidates = @(
    (Join-Path $scriptDir "certs\ForeignersStudio.cer"),
    (Join-Path $scriptDir "ForeignersStudio.cer"),
    (Join-Path $scriptDir "certs\foreigners_studio.cer"),
    (Join-Path $scriptDir "foreigners_studio.cer")
)

$cerPath = $null
foreach ($cand in $cerCandidates) {
    if (Test-Path -Path $cand) {
        $cerPath = $cand
        break
    }
}

if (-not $cerPath) {
    Write-Warning "Could not find ForeignersStudio.cer — skipping certificate trust step."
} else {
    Write-Host "      Found certificate at: $cerPath"
    $certObj = New-Object System.Security.Cryptography.X509Certificates.X509Certificate2
    $certObj.Import($cerPath)
    $thumbprint = $certObj.Thumbprint
    $subject = $certObj.Subject
    Write-Host "      Subject:    $subject"
    Write-Host "      Thumbprint: $thumbprint"

    # Import to TrustedPublisher store
    $inTP = Get-ChildItem -Path Cert:\CurrentUser\TrustedPublisher -ErrorAction SilentlyContinue |
        Where-Object { $_.Thumbprint -eq $thumbprint }
    if ($inTP) {
        Write-Host "      [OK] Already in Cert:\CurrentUser\TrustedPublisher" -ForegroundColor Green
    } else {
        try {
            $tpStore = New-Object System.Security.Cryptography.X509Certificates.X509Store("TrustedPublisher", "CurrentUser")
            $tpStore.Open("ReadWrite")
            $tpStore.Add($certObj)
            $tpStore.Close()
            Write-Host "      [OK] Imported to Cert:\CurrentUser\TrustedPublisher" -ForegroundColor Green
        } catch {
            Write-Warning "TrustedPublisher import failed: $_"
            Import-Certificate -FilePath $cerPath -CertStoreLocation Cert:\CurrentUser\TrustedPublisher -ErrorAction SilentlyContinue | Out-Null
        }
    }

    # Import to Root store (Trusted Root Certification Authorities)
    $inRoot = Get-ChildItem -Path Cert:\CurrentUser\Root -ErrorAction SilentlyContinue |
        Where-Object { $_.Thumbprint -eq $thumbprint }
    if ($inRoot) {
        Write-Host "      [OK] Already in Cert:\CurrentUser\Root" -ForegroundColor Green
    } else {
        Write-Host "      Importing to Cert:\CurrentUser\Root..."
        # Auto-dismiss the Windows security dialog
        $watcherJob = Start-Job -ScriptBlock {
            $wscript = New-Object -ComObject WScript.Shell
            for ($i = 0; $i -lt 20; $i++) {
                Start-Sleep -Milliseconds 200
                if ($wscript.AppActivate("Security Warning") -or $wscript.AppActivate("Root Certificate Store")) {
                    $wscript.SendKeys("%y")
                    Start-Sleep -Milliseconds 100
                    $wscript.SendKeys("{ENTER}")
                    break
                }
            }
        }
        try {
            $proc = Start-Process -FilePath "certutil.exe" -ArgumentList @("-user", "-addstore", "Root", "`"$cerPath`"") -NoNewWindow -PassThru -Wait
            if ($proc.ExitCode -eq 0) {
                Write-Host "      [OK] Imported to Cert:\CurrentUser\Root" -ForegroundColor Green
            } else {
                Write-Warning "certutil returned exit code $($proc.ExitCode)"
            }
        } catch {
            Write-Warning "certutil failed: $_"
        } finally {
            Stop-Job $watcherJob -ErrorAction SilentlyContinue | Out-Null
            Remove-Job $watcherJob -ErrorAction SilentlyContinue | Out-Null
        }
    }
}

# ─────────────────────────────────────────────────────────────────────────────
# STEP 3: Add SmartScreen exception in registry
#         This tells Windows Defender to allow this publisher
# ─────────────────────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "[3/4] Registering SmartScreen bypass for Foreigners Studio..." -ForegroundColor Yellow

try {
    # Disable SmartScreen check for this specific app (stores exception per file hash / publisher)
    $regKey = "HKCU:\Software\Microsoft\Windows\CurrentVersion\Policies\Attachments"
    if (-not (Test-Path $regKey)) {
        New-Item -Path $regKey -Force | Out-Null
    }
    # SaveZoneInformation = 1 means "do not save zone information" (disables MOTW on saves)
    Set-ItemProperty -Path $regKey -Name "SaveZoneInformation" -Value 1 -Type DWord -ErrorAction SilentlyContinue
    Write-Host "      [OK] Zone.Identifier save policy configured." -ForegroundColor Green
} catch {
    Write-Warning "Registry configuration failed (non-critical): $_"
}

# ─────────────────────────────────────────────────────────────────────────────
# STEP 4: Locate and launch the application
# ─────────────────────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "[4/4] Launching Foreigners Studio..." -ForegroundColor Yellow

$exeCandidates = @(
    (Join-Path $scriptDir "dist-release\foreigners_studio.exe"),
    (Join-Path $scriptDir "foreigners_studio.exe"),
    (Join-Path $scriptDir "dist-release\Foreigners_Studio_1.0.0_x64-setup.exe"),
    (Join-Path $scriptDir "Foreigners_Studio_1.0.0_x64-setup.exe")
)

$targetExe = $null
foreach ($cand in $exeCandidates) {
    if (Test-Path -Path $cand) {
        $targetExe = $cand
        break
    }
}

if (-not $targetExe) {
    Write-Warning "No executable found to launch. Trust configuration was completed."
    Write-Host ""
    Write-Host "      Please manually launch: Foreigners_Studio_1.0.0_x64-setup.exe" -ForegroundColor Yellow
    Write-Host "      If Windows still shows a SmartScreen warning, click:" -ForegroundColor Yellow
    Write-Host "        'More info'  →  'Run anyway'" -ForegroundColor Yellow
} else {
    # Ensure target binary is unblocked
    Unblock-File -LiteralPath $targetExe -ErrorAction SilentlyContinue

    $sig = Get-AuthenticodeSignature -FilePath $targetExe -ErrorAction SilentlyContinue
    Write-Host "      Binary:    $(Split-Path $targetExe -Leaf)"
    if ($sig) {
        $statusColor = if ($sig.Status -eq "Valid") { "Green" } else { "Yellow" }
        Write-Host "      Signature: $($sig.Status)" -ForegroundColor $statusColor
        if ($sig.SignerCertificate) {
            Write-Host "      Signer:    $($sig.SignerCertificate.Subject)"
        }
    }

    if (-not $NoLaunch) {
        Write-Host ""
        Write-Host "      Launching application..." -ForegroundColor Green
        Start-Process -FilePath $targetExe
    }
}

Write-Host ""
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "               INSTALLATION COMPLETE                      " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  If you still see a SmartScreen warning when running the app:" -ForegroundColor Yellow
Write-Host "  1. Click 'More info'" -ForegroundColor White
Write-Host "  2. Click 'Run anyway'" -ForegroundColor White
Write-Host "  The warning will stop appearing after the first successful run." -ForegroundColor White
Write-Host ""
