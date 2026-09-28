# Script to generate Foreigners Studio Code Signing Certificate
[CmdletBinding()]
param(
    [string]$Password = "ForeignersStudio"
)

$ErrorActionPreference = "Stop"

$subject = "CN=Foreigners Studio, O=Foreigners Studio"
$friendlyName = "Foreigners Studio Code Signing Certificate"
$certsDir = Join-Path -Path $PSScriptRoot -ChildPath "certs"

if (-not (Test-Path -Path $certsDir)) {
    New-Item -ItemType Directory -Path $certsDir -Force | Out-Null
}

Write-Host "Creating Code Signing Certificate for '$subject'..."

# Create Code Signing Certificate with EKU 1.3.6.1.5.5.7.3.3
# Using Type CodeSigningCert and explicit EKU extension
$cert = New-SelfSignedCertificate `
    -Type CodeSigningCert `
    -Subject $subject `
    -FriendlyName $friendlyName `
    -CertStoreLocation "Cert:\CurrentUser\My" `
    -KeyExportPolicy Exportable `
    -KeyAlgorithm RSA `
    -KeyLength 2048 `
    -HashAlgorithm SHA256 `
    -NotAfter (Get-Date).AddYears(10) `
    -TextExtension @("2.5.29.37={text}1.3.6.1.5.5.7.3.3")

Write-Host "Certificate created successfully:"
Write-Host "  Thumbprint: $($cert.Thumbprint)"
Write-Host "  Subject:    $($cert.Subject)"
Write-Host "  Issuer:     $($cert.Issuer)"
Write-Host "  NotAfter:   $($cert.NotAfter)"
Write-Host "  EKU:        $($cert.EnhancedKeyUsageList.Value -join ', ')"

# Export to .cer
$cerPath = Join-Path -Path $certsDir -ChildPath "ForeignersStudio.cer"
$cerBytes = $cert.Export([System.Security.Cryptography.X509Certificates.X509ContentType]::Cert)
[System.IO.File]::WriteAllBytes($cerPath, $cerBytes)
Write-Host "Exported CER to: $cerPath"

# Also export as foreigners_studio.cer for convenience
$cerLowerPath = Join-Path -Path $certsDir -ChildPath "foreigners_studio.cer"
[System.IO.File]::WriteAllBytes($cerLowerPath, $cerBytes)

# Export to .pfx with password
$pfxPath = Join-Path -Path $certsDir -ChildPath "ForeignersStudio.pfx"
$secPassword = ConvertTo-SecureString -String $Password -Force -AsPlainText
Export-PfxCertificate -Cert $cert -FilePath $pfxPath -Password $secPassword | Out-Null
Write-Host "Exported PFX to: $pfxPath"

# Also export as foreigners_studio.pfx for convenience
$pfxLowerPath = Join-Path -Path $certsDir -ChildPath "foreigners_studio.pfx"
Export-PfxCertificate -Cert $cert -FilePath $pfxLowerPath -Password $secPassword | Out-Null

Write-Host "Certificate generation and export complete."
