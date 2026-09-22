param(
    [switch]$Commit
)

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

Write-Host "=== Seed Peserta Asli POSGA ===" -ForegroundColor Cyan

$SeedFile = Join-Path $PSScriptRoot "seed-peserta-asli.json"
$Runner   = Join-Path $PSScriptRoot "src\db\seed-peserta-asli.ts"
$Database = Join-Path $PSScriptRoot "data\posga.db"

if (-not (Test-Path $SeedFile)) {
    throw "File seed-peserta-asli.json tidak ditemukan di root project."
}

if (-not (Test-Path $Runner)) {
    throw "Runner src\db\seed-peserta-asli.ts tidak ditemukan."
}

if (-not (Test-Path $Database)) {
    throw "Database data\posga.db tidak ditemukan."
}

if (-not (Test-Path ".\node_modules")) {
    Write-Host "node_modules belum ada. Menjalankan npm install..." -ForegroundColor Yellow
    npm install

    if ($LASTEXITCODE -ne 0) {
        throw "npm install gagal."
    }
}

$env:POSGA_SEED_FILE = $SeedFile
$env:POSGA_DB_PATH   = $Database

if ($Commit) {
    Write-Host "Mode: COMMIT" -ForegroundColor Yellow
    npx tsx ".\src\db\seed-peserta-asli.ts" --commit
}
else {
    Write-Host "Mode: DRY RUN (database tidak diubah)" -ForegroundColor Green
    npx tsx ".\src\db\seed-peserta-asli.ts"
}

if ($LASTEXITCODE -ne 0) {
    throw "Proses seed gagal."
}

Write-Host ""
Write-Host "Proses selesai." -ForegroundColor Green
