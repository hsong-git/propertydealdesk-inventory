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
        $allProcesses = @(Get-CimInstance Win32_Process -ErrorAction SilentlyContinue)
        $tree = New-Object System.Collections.Generic.List[int]
        $tree.Add([int]$savedPid)
        for ($index = 0; $index -lt $tree.Count; $index++) {
            foreach ($child in $allProcesses | Where-Object { $_.ParentProcessId -eq $tree[$index] }) {
                if (-not $tree.Contains([int]$child.ProcessId)) { $tree.Add([int]$child.ProcessId) }
            }
        }
        for ($index = $tree.Count - 1; $index -ge 0; $index--) { Stop-Process -Id $tree[$index] -Force -ErrorAction SilentlyContinue }
    }
    Remove-Item -LiteralPath $pidPath -Force -ErrorAction SilentlyContinue
}

$hadTracked = (Test-Path -LiteralPath $pidFile) -or (Test-Path -LiteralPath $vitePidFile)
Stop-Tracked $pidFile
Stop-Tracked $vitePidFile

$listener = Get-NetTCPConnection -State Listen -LocalPort $pagesPort -ErrorAction SilentlyContinue | Select-Object -First 1
if ($null -ne $listener) {
    $listenerProcess = Get-Process -Id $listener.OwningProcess -ErrorAction SilentlyContinue
    if ($null -ne $listenerProcess -and $listenerProcess.Path -like "$projectRoot*") {
        Stop-Process -Id $listener.OwningProcess -Force -ErrorAction SilentlyContinue
    }
    else {
        Write-Host "Port $pagesPort is still used by unrelated PID $($listener.OwningProcess). It was not stopped." -ForegroundColor Yellow
        exit 1
    }
}

if ($hadTracked) { Write-Host "Inventory Catalogue stopped successfully." -ForegroundColor Green }
else { Write-Host "Inventory Catalogue is not running." -ForegroundColor Yellow }
