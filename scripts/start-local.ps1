$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$runtimeDir = Join-Path $projectRoot ".runtime"
$pidFile = Join-Path $runtimeDir "inventory-catalogue.pid"
$outputLog = Join-Path $runtimeDir "inventory-catalogue.log"
$errorLog = Join-Path $runtimeDir "inventory-catalogue-error.log"
$viteScript = Join-Path $projectRoot "node_modules\vite\bin\vite.js"
$port = 5277
$url = "http://127.0.0.1:$port/"

function Get-TrackedViteProcess {
    if (-not (Test-Path -LiteralPath $pidFile)) { return $null }

    $savedPid = (Get-Content -LiteralPath $pidFile -Raw).Trim()
    if ($savedPid -notmatch '^\d+$') { return $null }

    $processInfo = Get-CimInstance Win32_Process -Filter "ProcessId = $savedPid" -ErrorAction SilentlyContinue
    if ($null -eq $processInfo) { return $null }

    $expectedScript = [Regex]::Escape($viteScript)
    if ($processInfo.Name -eq "node.exe" -and
        $processInfo.CommandLine -match $expectedScript -and
        $processInfo.CommandLine -match "--port\s+$port(\s|$)") {
        return $processInfo
    }

    return $null
}

New-Item -ItemType Directory -Path $runtimeDir -Force | Out-Null

$trackedProcess = Get-TrackedViteProcess
if ($null -ne $trackedProcess) {
    Write-Host "Inventory Catalogue is already running (PID $($trackedProcess.ProcessId))." -ForegroundColor Yellow
    Write-Host $url
    exit 0
}

if (Test-Path -LiteralPath $pidFile) {
    Remove-Item -LiteralPath $pidFile -Force
}

$listener = Get-NetTCPConnection -State Listen -LocalPort $port -ErrorAction SilentlyContinue | Select-Object -First 1
if ($null -ne $listener) {
    Write-Host "Port $port is already used by another process (PID $($listener.OwningProcess))." -ForegroundColor Red
    Write-Host "The catalogue was not started and the other process was not changed."
    exit 1
}

$nodeCommand = Get-Command node.exe -ErrorAction SilentlyContinue
$npmCommand = Get-Command npm.cmd -ErrorAction SilentlyContinue
if ($null -eq $nodeCommand -or $null -eq $npmCommand) {
    Write-Host "Node.js and npm are required. Install Node.js 20 or newer, then try again." -ForegroundColor Red
    exit 1
}

if (-not (Test-Path -LiteralPath $viteScript)) {
    Write-Host "Project dependencies are missing. Running npm install..." -ForegroundColor Cyan
    Push-Location $projectRoot
    try {
        & $npmCommand.Source install
        if ($LASTEXITCODE -ne 0) {
            throw "npm install failed with exit code $LASTEXITCODE."
        }
    }
    finally {
        Pop-Location
    }
}

if (-not (Test-Path -LiteralPath $viteScript)) {
    Write-Host "Vite is still missing after npm install. Review the npm output above." -ForegroundColor Red
    exit 1
}

Remove-Item -LiteralPath $outputLog, $errorLog -Force -ErrorAction SilentlyContinue
$arguments = @($viteScript, "--host", "127.0.0.1", "--port", "$port", "--strictPort")
$process = Start-Process -FilePath $nodeCommand.Source `
    -ArgumentList $arguments `
    -WorkingDirectory $projectRoot `
    -WindowStyle Hidden `
    -RedirectStandardOutput $outputLog `
    -RedirectStandardError $errorLog `
    -PassThru

Set-Content -LiteralPath $pidFile -Value $process.Id -Encoding ascii

$ready = $false
for ($attempt = 0; $attempt -lt 30; $attempt++) {
    Start-Sleep -Milliseconds 250
    if ($process.HasExited) { break }
    try {
        $response = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 2
        if ($response.StatusCode -eq 200) {
            $ready = $true
            break
        }
    }
    catch {
        # Vite may still be starting.
    }
}

if (-not $ready) {
    if (-not $process.HasExited) {
        Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue
    }
    Remove-Item -LiteralPath $pidFile -Force -ErrorAction SilentlyContinue
    Write-Host "Inventory Catalogue did not become ready at $url" -ForegroundColor Red
    if (Test-Path -LiteralPath $errorLog) {
        Get-Content -LiteralPath $errorLog -Tail 20
    }
    exit 1
}

Write-Host "Inventory Catalogue started successfully (PID $($process.Id))." -ForegroundColor Green
Write-Host $url
Write-Host "Use 'Stop Inventory Catalogue.bat' to stop only this tracked server."
exit 0
