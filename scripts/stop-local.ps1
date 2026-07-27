$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$runtimeDir = Join-Path $projectRoot ".runtime"
$pidFile = Join-Path $runtimeDir "inventory-catalogue.pid"
$viteScript = Join-Path $projectRoot "node_modules\vite\bin\vite.js"
$port = 5277

if (-not (Test-Path -LiteralPath $pidFile)) {
    $listener = Get-NetTCPConnection -State Listen -LocalPort $port -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($null -eq $listener) {
        Write-Host "Inventory Catalogue is not running." -ForegroundColor Yellow
        exit 0
    }

    Write-Host "Port $port is in use by PID $($listener.OwningProcess), but it was not started by the catalogue start script." -ForegroundColor Yellow
    Write-Host "No process was stopped."
    exit 1
}

$savedPid = (Get-Content -LiteralPath $pidFile -Raw).Trim()
if ($savedPid -notmatch '^\d+$') {
    Remove-Item -LiteralPath $pidFile -Force
    Write-Host "The catalogue PID file was invalid and has been removed. No process was stopped." -ForegroundColor Yellow
    exit 1
}

$processInfo = Get-CimInstance Win32_Process -Filter "ProcessId = $savedPid" -ErrorAction SilentlyContinue
if ($null -eq $processInfo) {
    Remove-Item -LiteralPath $pidFile -Force
    Write-Host "Inventory Catalogue was already stopped. The stale PID file was removed." -ForegroundColor Yellow
    exit 0
}

$expectedScript = [Regex]::Escape($viteScript)
$isTrackedVite = $processInfo.Name -eq "node.exe" -and
    $processInfo.CommandLine -match $expectedScript -and
    $processInfo.CommandLine -match "--port\s+$port(\s|$)"

if (-not $isTrackedVite) {
    Remove-Item -LiteralPath $pidFile -Force
    Write-Host "PID $savedPid is not this project's Vite server. No process was stopped." -ForegroundColor Red
    exit 1
}

Stop-Process -Id ([int]$savedPid) -Force
try {
    Wait-Process -Id ([int]$savedPid) -Timeout 10 -ErrorAction SilentlyContinue
}
finally {
    Remove-Item -LiteralPath $pidFile -Force -ErrorAction SilentlyContinue
}

$listener = Get-NetTCPConnection -State Listen -LocalPort $port -ErrorAction SilentlyContinue | Select-Object -First 1
if ($null -ne $listener) {
    Write-Host "The tracked catalogue process stopped, but port $port is now used by PID $($listener.OwningProcess)." -ForegroundColor Yellow
    exit 1
}

Write-Host "Inventory Catalogue stopped successfully." -ForegroundColor Green
exit 0
