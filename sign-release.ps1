# Script to sign release binaries with Authenticode and DigiCert timestamping
[CmdletBinding()]
param(
    [string]$DistDir = "",
    [string]$CertPath = "",
    [string]$CertPassword = "ForeignersStudio",
    [string]$TimestampServer = "http://timestamp.digicert.com"
)

$ErrorActionPreference = "Stop"

if (-not $DistDir) {
    $DistDir = Join-Path $PSScriptRoot "dist-release"
}
if (-not $CertPath) {
    $CertPath = Join-Path $PSScriptRoot "certs\ForeignersStudio.pfx"
}

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "      Foreigners Studio - Windows Authenticode Signer     " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "Target directory: $DistDir"

# Find or import certificate
$cert = Get-ChildItem -Path Cert:\CurrentUser\My -CodeSigningCert -ErrorAction SilentlyContinue | Where-Object { $_.Subject -match "Foreigners Studio" } | Select-Object -First 1

if (-not $cert) {
    if (Test-Path $CertPath) {
        Write-Host "Importing certificate from $CertPath to Cert:\CurrentUser\My..."
        $secPassword = ConvertTo-SecureString -String $CertPassword -Force -AsPlainText
        $cert = Import-PfxCertificate -FilePath $CertPath -CertStoreLocation "Cert:\CurrentUser\My" -Password $secPassword
    } else {
        throw "Could not find Foreigners Studio certificate in store or at $CertPath"
    }
}

Write-Host "Using Certificate:"
Write-Host "  Thumbprint: $($cert.Thumbprint)"
Write-Host "  Subject:    $($cert.Subject)"
Write-Host "  Issuer:     $($cert.Issuer)"

$targets = Get-ChildItem -Path $DistDir -File | Where-Object { $_.Extension -in @(".exe", ".msi") }

foreach ($fileItem in $targets) {
    $filePath = $fileItem.FullName
    Write-Host "`nSigning: $filePath"
    try {
        $sig = Set-AuthenticodeSignature -FilePath $filePath -Certificate $cert -HashAlgorithm SHA256 -TimestampServer $TimestampServer
        $color = "Yellow"
        if ($sig.Status -eq "Valid") { $color = "Green" }
        Write-Host "  Status:        $($sig.Status)" -ForegroundColor $color
        Write-Host "  StatusMessage: $($sig.StatusMessage)"
        if ($sig.TimeStamperCertificate) {
            Write-Host "  TimeStamper:   $($sig.TimeStamperCertificate.Subject)"
        }
    } catch {
        Write-Warning "Failed to sign with timestamp server '$TimestampServer': $_"
        Write-Host "Attempting fallback signing without timestamp..."
        $sig = Set-AuthenticodeSignature -FilePath $filePath -Certificate $cert -HashAlgorithm SHA256
        $color = "Yellow"
        if ($sig.Status -eq "Valid") { $color = "Green" }
        Write-Host "  Status:        $($sig.Status)" -ForegroundColor $color
        Write-Host "  StatusMessage: $($sig.StatusMessage)"
    }
}

# Update zip bundle if present
$zipPath = Join-Path $DistDir "Foreigners_Studio_Windows_x64.zip"
$signedExe = Join-Path $DistDir "foreigners_studio.exe"
if ((Test-Path $zipPath) -and (Test-Path $signedExe)) {
    Write-Host "`nUpdating Windows Portable ZIP bundle with signed binary and installer scripts..."
    $tempBase = [System.IO.Path]::GetTempPath()
    $randomId = [System.Guid]::NewGuid().ToString("N")
    $stagingDir = Join-Path $tempBase ("fs_win_bundle_" + $randomId)
    [System.IO.Directory]::CreateDirectory($stagingDir) | Out-Null
    try {
        Copy-Item -Path $signedExe -Destination (Join-Path $stagingDir "foreigners_studio.exe") -Force
        $dllSrc = Join-Path $DistDir "WebView2Loader.dll"
        if (Test-Path $dllSrc) {
            Copy-Item -Path $dllSrc -Destination (Join-Path $stagingDir "WebView2Loader.dll") -Force
        }
        $batSrc = Join-Path $PSScriptRoot "Install-ForeignersStudio.bat"
        if (Test-Path $batSrc) {
            Copy-Item -Path $batSrc -Destination (Join-Path $stagingDir "Install-ForeignersStudio.bat") -Force
        }
        $psSrc = Join-Path $PSScriptRoot "install-windows.ps1"
        if (Test-Path $psSrc) {
            Copy-Item -Path $psSrc -Destination (Join-Path $stagingDir "install-windows.ps1") -Force
        }
        $cerSrc = Join-Path $PSScriptRoot "certs\ForeignersStudio.cer"
        if (Test-Path $cerSrc) {
            $stagingCerts = Join-Path $stagingDir "certs"
            [System.IO.Directory]::CreateDirectory($stagingCerts) | Out-Null
            Copy-Item -Path $cerSrc -Destination (Join-Path $stagingCerts "ForeignersStudio.cer") -Force
            Copy-Item -Path $cerSrc -Destination (Join-Path $stagingDir "ForeignersStudio.cer") -Force
        }

        Remove-Item -Path $zipPath -Force
        Add-Type -AssemblyName System.IO.Compression.FileSystem
        [System.IO.Compression.ZipFile]::CreateFromDirectory($stagingDir, $zipPath)
        Write-Host "[OK] Windows Portable ZIP bundle updated successfully -> $zipPath" -ForegroundColor Green
    } finally {
        if ([System.IO.Directory]::Exists($stagingDir)) {
            try { [System.IO.Directory]::Delete($stagingDir, $true) } catch {}
        }
    }
}

# Copy installer scripts and certificate into dist-release for distribution
Write-Host "`nDeploying installer helper scripts to $DistDir..."
$auxFiles = @(
    @{ Src = (Join-Path $PSScriptRoot "certs\ForeignersStudio.cer"); Dest = (Join-Path $DistDir "ForeignersStudio.cer") },
    @{ Src = (Join-Path $PSScriptRoot "Install-ForeignersStudio.bat"); Dest = (Join-Path $DistDir "Install-ForeignersStudio.bat") },
    @{ Src = (Join-Path $PSScriptRoot "install-windows.ps1"); Dest = (Join-Path $DistDir "install-windows.ps1") }
)
foreach ($aux in $auxFiles) {
    if (Test-Path $aux.Src) {
        Copy-Item -Path $aux.Src -Destination $aux.Dest -Force
        Write-Host "  [OK] Copied $(Split-Path $aux.Src -Leaf) -> $DistDir" -ForegroundColor Green
    }
}

Write-Host "`n=== Verification Summary ==="
foreach ($target in $targets) {
    $filePath = Join-Path $DistDir $target
    if (Test-Path $filePath) {
        $sig = Get-AuthenticodeSignature -FilePath $filePath
        Write-Host "$target -> Status: $($sig.Status) | Signer: $($sig.SignerCertificate.Subject)"
    }
}
Write-Host "`nSigning operations completed successfully." -ForegroundColor Green
