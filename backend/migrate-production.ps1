Write-Host "Running EF Core Migrations - PRODUCTION Environment" -ForegroundColor Red
Write-Host "====================================================" -ForegroundColor Red
Write-Host ""
Write-Host "WARNING: This will modify the production database!" -ForegroundColor Red
Write-Host ""

$confirmation = Read-Host "Are you sure you want to migrate PRODUCTION database? (yes/no)"
if ($confirmation -ne "yes") {
    Write-Host "Cancelled." -ForegroundColor Yellow
    exit
}

$env:ASPNETCORE_ENVIRONMENT = "Production"

$services = @(
    @{Name="Identity"; Path="src\Services\Identity"},
    @{Name="Inventory"; Path="src\Services\Inventory"},
    @{Name="Sales"; Path="src\Services\Sales"},
    @{Name="Customer"; Path="src\Services\Customer"},
    @{Name="Analytics"; Path="src\Services\Analytics"}
)

foreach ($service in $services) {
    Write-Host "Migrating $($service.Name)..." -ForegroundColor Yellow

    Set-Location $service.Path

    dotnet ef database update

    if ($LASTEXITCODE -eq 0) {
        Write-Host "$($service.Name) migrated successfully!" -ForegroundColor Green
    } else {
        Write-Host "$($service.Name) migration failed!" -ForegroundColor Red
    }

    Set-Location ..\..\..\
    Write-Host ""
}

Write-Host "All migrations completed for PRODUCTION environment!" -ForegroundColor Green
Write-Host "Database: profitzen_prod" -ForegroundColor Yellow
