Param(
    [switch]$NoCache
)

$ErrorActionPreference = 'Stop'

# In PowerShell 7+, native CLI stderr can be promoted to terminating errors.
# Disable that behavior so we can poll docker readiness safely.
if (Get-Variable -Name PSNativeCommandUseErrorActionPreference -ErrorAction SilentlyContinue) {
    $PSNativeCommandUseErrorActionPreference = $false
}

function Invoke-DockerChecked {
    Param(
        [Parameter(Mandatory = $true)]
        [string[]]$Args
    )

    & docker @Args
    if ($LASTEXITCODE -ne 0) {
        throw "docker $($Args -join ' ') failed with exit code $LASTEXITCODE"
    }
}

Write-Host "[1/6] Checking Docker CLI..."
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    throw "Docker CLI not found in PATH. Open Docker Desktop once, then rerun this script."
}

Write-Host "[2/6] Clearing lingering Docker Desktop processes..."
Get-Process -Name "com.docker.build" -ErrorAction SilentlyContinue | Stop-Process -Force
Get-Process -Name "Docker Desktop" -ErrorAction SilentlyContinue | Stop-Process -Force
Get-Process -Name "com.docker.backend" -ErrorAction SilentlyContinue | Stop-Process -Force
Get-Process -Name "wsl" -ErrorAction SilentlyContinue | Stop-Process -Force

# Ensure WSL VM is cleanly stopped to avoid Docker Desktop startup lock.
& $env:ComSpec /c "wsl --shutdown >nul 2>nul"

Write-Host "[3/6] Starting Docker Desktop..."
$dockerDesktopPath = "C:\Program Files\Docker\Docker\Docker Desktop.exe"
if (Test-Path $dockerDesktopPath) {
    Start-Process $dockerDesktopPath | Out-Null
} else {
    throw "Docker Desktop executable not found at '$dockerDesktopPath'."
}

Write-Host "[4/6] Waiting for Docker engine..."
$ready = $false
for ($i = 0; $i -lt 45; $i++) {
    & $env:ComSpec /c "docker info >nul 2>nul"
    if ($LASTEXITCODE -eq 0) {
        $ready = $true
        break
    }

    Start-Sleep -Seconds 2
}

if (-not $ready) {
    throw "Docker engine did not become ready. Open Docker Desktop UI and check status."
}

Write-Host "[5/6] Rebuilding and recreating frontend container..."
if ($NoCache) {
    Invoke-DockerChecked -Args @('compose', 'build', '--no-cache', 'frontend')
} else {
    Invoke-DockerChecked -Args @('compose', 'build', 'frontend')
}

Invoke-DockerChecked -Args @('compose', 'up', '-d', '--force-recreate', 'frontend')

Write-Host "[6/6] Verifying frontend command and logs..."
Invoke-DockerChecked -Args @('inspect', 'guts_frontend', '--format', '{{json .Config.Cmd}}')
Invoke-DockerChecked -Args @('compose', 'logs', '--no-color', '--tail', '80', 'frontend')

Write-Host "Done. Open http://localhost and hard-refresh (Ctrl+F5)."
