Write-Host "Running EF Core Migrations - DEMO Environment" -ForegroundColor Cyan
Write-Host "===============================================" -ForegroundColor Cyan
Write-Host ""

$env:ASPNETCORE_ENVIRONMENT = "Demo"

$services = @(
    @{Name="Identity"; Path="src\Services\Identity"},
    @{Name="Inventory"; Path="src\Services\Inventory"},
    @{Name="Sales"; Path="src\Services\Sales"},
    @{Name="Customer"; Path="src\Services\Customer"},
    @{Name="Analytics"; Path="src\Services\Analytics"},
    @{Name="Product"; Path="src\Services\Product"}
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

Write-Host "All migrations completed for DEMO environment!" -ForegroundColor Green
Write-Host "Database: profitzen_demo" -ForegroundColor Yellow
