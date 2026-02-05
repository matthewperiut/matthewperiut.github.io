$ErrorActionPreference = "Stop"

$Version = "0.1.0"
$BaseUrl = "https://matthewperiut.github.io/babric2ornithe"

Write-Host "Installing babric2ornithe v$Version..."

$Arch = switch ([System.Runtime.InteropServices.RuntimeInformation]::ProcessArchitecture) {
    "X64"  { "x86_64" }
    "Arm64" { "arm64" }
    default {
        Write-Error "Unsupported architecture: $_. babric2ornithe is available for x86_64 and arm64."
        exit 1
    }
}

$Binary = "babric2ornithe-windows-${Arch}.exe"
$Url = "${BaseUrl}/bin/${Binary}"

$InstallDir = "$env:LOCALAPPDATA\babric2ornithe"
New-Item -ItemType Directory -Force -Path $InstallDir | Out-Null

$DestPath = Join-Path $InstallDir "babric2ornithe.exe"

Write-Host "Downloading ${Binary}..."
Invoke-WebRequest -Uri $Url -OutFile $DestPath -UseBasicParsing

# Save source URL for remote manifest lookups
$ConfigDir = "$env:LOCALAPPDATA\babric2ornithe"
[System.IO.File]::WriteAllText((Join-Path $ConfigDir "source_url"), $BaseUrl)

$UserPath = [Environment]::GetEnvironmentVariable("Path", "User")
if ($UserPath -notlike "*$InstallDir*") {
    [Environment]::SetEnvironmentVariable("Path", "$UserPath;$InstallDir", "User")
    Write-Host ""
    Write-Host "Added $InstallDir to your PATH. Restart your terminal for this to take effect."
}

Write-Host ""
Write-Host "Installed babric2ornithe v$Version to $DestPath"
Write-Host "Run 'babric2ornithe --help' to get started."
