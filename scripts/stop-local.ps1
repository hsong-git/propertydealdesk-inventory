$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$runtimeDir = Join-Path $projectRoot ".runtime"
$pidFile = Join-Path $runtimeDir "inventory-catalogue.pid"
$vitePidFile = Join-Path $runtimeDir "inventory-catalogue-vite.pid"
$pagesPort = 5277

function Stop-Tracked([string]$pidPath) {
    if (-not (Test-Path -LiteralPath $pidPath)) { return }
    $savedPid = (Get-Content -LiteralPath $pidPath -Raw).Trim()
    if ($savedPid -match '^\d+$') {
        $processInfo = Get-CimInstance Win32_Process -Filter "ProcessId = $savedPid" -ErrorAction SilentlyContinue
        if ($null -ne $processInfo) { Stop-Process -Id ([int]$savedPid) -Force -ErrorAction SilentlyContinue }
    }
    Remove-Item -LiteralPath $pidPath -Force -ErrorAction SilentlyContinue
}

$hadTracked = (Test-Path -LiteralPath $pidFile) -or (Test-Path -LiteralPath $vitePidFile)
Stop-Tracked $pidFile
Stop-Tracked $vitePidFile

$listener = Get-NetTCPConnection -State Listen -LocalPort $pagesPort -ErrorAction SilentlyContinue | Select-Object -First 1
if ($null -ne $listener) {
    Write-Host "Port $pagesPort is still used by PID $($listener.OwningProcess). No untracked process was stopped." -ForegroundColor Yellow
    exit 1
}

if ($hadTracked) { Write-Host "Inventory Catalogue stopped successfully." -ForegroundColor Green }
else { Write-Host "Inventory Catalogue is not running." -ForegroundColor Yellow }
