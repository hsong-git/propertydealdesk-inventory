$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$runtimeDir = Join-Path $projectRoot ".runtime"
$pidFile = Join-Path $runtimeDir "inventory-catalogue.pid"
$outputLog = Join-Path $runtimeDir "inventory-catalogue.log"
$errorLog = Join-Path $runtimeDir "inventory-catalogue-error.log"
$wranglerScript = Join-Path $projectRoot "node_modules\wrangler\bin\wrangler.js"
$bundledNode = "C:\Users\onghu\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
$pagesPort = 5277
$url = "http://127.0.0.1:$pagesPort/"

New-Item -ItemType Directory -Path $runtimeDir -Force | Out-Null

if (Test-Path -LiteralPath $pidFile) {
    $savedPid = (Get-Content -LiteralPath $pidFile -Raw).Trim()
    if ($savedPid -match '^\d+$' -and (Get-Process -Id ([int]$savedPid) -ErrorAction SilentlyContinue)) {
        Write-Host "Inventory Catalogue is already running (PID $savedPid)." -ForegroundColor Yellow
        Write-Host $url
        exit 0
    }
    Remove-Item -LiteralPath $pidFile -Force -ErrorAction SilentlyContinue
}

$listener = Get-NetTCPConnection -State Listen -LocalPort $pagesPort -ErrorAction SilentlyContinue | Select-Object -First 1
if ($null -ne $listener) {
    Write-Host "Port $pagesPort is already used by another process (PID $($listener.OwningProcess))." -ForegroundColor Red
    exit 1
}

$nodePath = if (Test-Path -LiteralPath $bundledNode) { $bundledNode } else { (Get-Command node.exe -ErrorAction Stop).Source }
$npmCommand = Get-Command npm.cmd -ErrorAction SilentlyContinue
if ($null -eq $npmCommand) { throw "Node.js and npm are required." }

if (-not (Test-Path -LiteralPath $wranglerScript)) {
    Write-Host "Project dependencies are missing. Running npm install..." -ForegroundColor Cyan
    Push-Location $projectRoot
    try { & $npmCommand.Source install; if ($LASTEXITCODE -ne 0) { throw "npm install failed with exit code $LASTEXITCODE." } }
    finally { Pop-Location }
}

if (-not (Test-Path -LiteralPath $wranglerScript)) { throw "Wrangler is missing after npm install." }

Write-Host "Checking local requirements database migrations..." -ForegroundColor Cyan
& $nodePath $wranglerScript d1 migrations apply propertydealdesk-requirements --local --persist-to .runtime\wrangler
if ($LASTEXITCODE -ne 0) { throw "Local D1 migration check failed with exit code $LASTEXITCODE." }

Write-Host "Building the current frontend before starting local Pages Dev..." -ForegroundColor Cyan
Push-Location $projectRoot
try { & $npmCommand.Source run build; if ($LASTEXITCODE -ne 0) { throw "npm run build failed with exit code $LASTEXITCODE." } }
finally { Pop-Location }

Remove-Item -LiteralPath $outputLog, $errorLog -Force -ErrorAction SilentlyContinue
$pages = Start-Process -FilePath $nodePath -ArgumentList @($wranglerScript, "pages", "dev", "dist", "--port", "$pagesPort", "--persist-to", ".runtime\wrangler", "--compatibility-date", "2026-07-31", "--show-interactive-dev-session", "false") -WorkingDirectory $projectRoot -WindowStyle Hidden -RedirectStandardOutput $outputLog -RedirectStandardError $errorLog -PassThru
Set-Content -LiteralPath $pidFile -Value $pages.Id -Encoding ascii

$ready = $false
for ($attempt = 0; $attempt -lt 60; $attempt++) {
    Start-Sleep -Milliseconds 250
    if ($pages.HasExited) { break }
    try { if ((Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 2).StatusCode -eq 200) { $ready = $true; break } }
    catch { }
}

if (-not $ready) {
    if (-not $pages.HasExited) { Stop-Process -Id $pages.Id -Force -ErrorAction SilentlyContinue }
    Remove-Item -LiteralPath $pidFile -Force -ErrorAction SilentlyContinue
    Write-Host "Inventory Catalogue did not become ready at $url" -ForegroundColor Red
    if (Test-Path -LiteralPath $errorLog) { Get-Content -LiteralPath $errorLog -Tail 30 }
    exit 1
}

Write-Host "Inventory Catalogue started successfully with local Pages Functions (PID $($pages.Id))." -ForegroundColor Green
Write-Host $url
Write-Host "Local D1 binding: REQUIREMENTS_DB"
