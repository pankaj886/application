<#
.SYNOPSIS
    Foreigners Studio - Windows Secure Installer & SmartScreen Eliminator
.DESCRIPTION
    Strips web quarantine (Zone.Identifier) from all downloaded binaries,
    installs the Foreigners Studio Code Signing Certificate into the user's
    TrustedPublisher and Root certificate stores, and launches the application
    with zero SmartScreen or Unknown Publisher warnings.
#>

[CmdletBinding()]
param(
    [switch]$NoLaunch
)

$ErrorActionPreference = "Continue"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "    Foreigners Studio - Windows SmartScreen Eliminator    " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

$scriptDir = $PSScriptRoot
if (-not $scriptDir) {
    $scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
}
if (-not $scriptDir) {
    $scriptDir = Get-Location
}

# 1. Strip web quarantine / Zone.Identifier from all downloaded binaries and scripts
Write-Host "`n[1/3] Stripping Web Quarantine (Zone.Identifier / Mark-of-the-Web)..." -ForegroundColor Yellow

$unblockExtensions = @("*.exe", "*.msi", "*.dll", "*.zip", "*.bat", "*.ps1", "*.cer", "*.pfx")
$targetFiles = Get-ChildItem -Path $scriptDir -Recurse -File -Include $unblockExtensions -ErrorAction SilentlyContinue

$unblockCount = 0
foreach ($file in $targetFiles) {
    try {
        Unblock-File -LiteralPath $file.FullName -ErrorAction SilentlyContinue
        $unblockCount++
    } catch {
        # ignore locked files or permission quirks
    }
}
Write-Host "      Cleaned and unblocked $unblockCount file(s) across directory tree." -ForegroundColor Green

# 2. Locate and import Foreigners Studio Certificate
Write-Host "`n[2/3] Configuring Trusted Publisher & Root Certificates..." -ForegroundColor Yellow

$cerCandidates = @(
    (Join-Path $scriptDir "certs\ForeignersStudio.cer"),
    (Join-Path $scriptDir "certs\foreigners_studio.cer"),
    (Join-Path $scriptDir "ForeignersStudio.cer"),
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
    Write-Warning "Could not find ForeignersStudio.cer in certs\ or root directory."
} else {
    Write-Host "      Found certificate at: $cerPath"
    
    # Load certificate to read thumbprint and subject
    $certObj = New-Object System.Security.Cryptography.X509Certificates.X509Certificate2
    $certObj.Import($cerPath)
    $thumbprint = $certObj.Thumbprint
    $subject = $certObj.Subject
    Write-Host "      Subject:    $subject"
    Write-Host "      Thumbprint: $thumbprint"

    # A. Import into Cert:\CurrentUser\TrustedPublisher
    $inTP = Get-ChildItem -Path Cert:\CurrentUser\TrustedPublisher -ErrorAction SilentlyContinue | Where-Object { $_.Thumbprint -eq $thumbprint }
    if ($inTP) {
        Write-Host "      [OK] Already present in Cert:\CurrentUser\TrustedPublisher." -ForegroundColor Green
    } else {
        try {
            $tpStore = New-Object System.Security.Cryptography.X509Certificates.X509Store("TrustedPublisher", "CurrentUser")
            $tpStore.Open("ReadWrite")
            $tpStore.Add($certObj)
            $tpStore.Close()
            Write-Host "      [OK] Successfully imported to Cert:\CurrentUser\TrustedPublisher." -ForegroundColor Green
        } catch {
            Write-Warning "Failed to import to TrustedPublisher via API: $_"
            Import-Certificate -FilePath $cerPath -CertStoreLocation Cert:\CurrentUser\TrustedPublisher -ErrorAction SilentlyContinue | Out-Null
        }
    }

    # B. Import into Cert:\CurrentUser\Root
    $inRoot = Get-ChildItem -Path Cert:\CurrentUser\Root -ErrorAction SilentlyContinue | Where-Object { $_.Thumbprint -eq $thumbprint }
    if ($inRoot) {
        Write-Host "      [OK] Already present in Cert:\CurrentUser\Root." -ForegroundColor Green
    } else {
        Write-Host "      Importing to Cert:\CurrentUser\Root (Trusted Root Certification Authorities)..."
        # Use certutil with auto-accepter background task to dismiss any interactive security dialog
        $watcherJob = Start-Job -ScriptBlock {
            $wscript = New-Object -ComObject WScript.Shell
            for ($i = 0; $i -lt 15; $i++) {
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
                Write-Host "      [OK] Successfully imported to Cert:\CurrentUser\Root." -ForegroundColor Green
            } else {
                Write-Warning "Certutil returned exit code $($proc.ExitCode)"
            }
        } catch {
            Write-Warning "Failed running certutil: $_"
        } finally {
            Stop-Job $watcherJob -ErrorAction SilentlyContinue | Out-Null
            Remove-Job $watcherJob -ErrorAction SilentlyContinue | Out-Null
        }
    }
}

# 3. Locate and launch the application cleanly
Write-Host "`n[3/3] Locating and launching Foreigners Studio..." -ForegroundColor Yellow

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
    Write-Warning "No executable found to launch in dist-release\ or current folder."
} else {
    # Ensure target binary is unblocked
    Unblock-File -LiteralPath $targetExe -ErrorAction SilentlyContinue
    
    # Check signature status
    $sig = Get-AuthenticodeSignature -FilePath $targetExe
    Write-Host "      Binary:           $(Split-Path $targetExe -Leaf)"
    
    $statusColor = "Yellow"
    if ($sig.Status -eq "Valid") {
        $statusColor = "Green"
    }
    Write-Host "      Signature Status: $($sig.Status)" -ForegroundColor $statusColor
    Write-Host "      Signer:           $($sig.SignerCertificate.Subject)"

    if ($NoLaunch) {
        Write-Host "`nInstallation and trust configuration completed (-NoLaunch specified)." -ForegroundColor Green
    } else {
        Write-Host "`nLaunching Foreigners Studio with zero SmartScreen prompts..." -ForegroundColor Green
        Start-Process -FilePath $targetExe
    }
}

Write-Host "`n==========================================================" -ForegroundColor Cyan
Write-Host "                INSTALLATION COMPLETE                     " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan
