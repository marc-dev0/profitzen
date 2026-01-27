Write-Host "Starting Profitzen - PRODUCTION Environment" -ForegroundColor Red
Write-Host "=============================================" -ForegroundColor Red
Write-Host ""
Write-Host "WARNING: Production mode - No demo data will be created!" -ForegroundColor Red
Write-Host ""

$env:ASPNETCORE_ENVIRONMENT = "Production"

Write-Host "Environment: $env:ASPNETCORE_ENVIRONMENT" -ForegroundColor Yellow
Write-Host "Database: profitzen_prod" -ForegroundColor Yellow
Write-Host ""

$confirmation = Read-Host "Are you sure you want to start in PRODUCTION mode? (yes/no)"
if ($confirmation -ne "yes") {
    Write-Host "Cancelled." -ForegroundColor Yellow
    exit
}

Write-Host ""
Write-Host "Starting services..." -ForegroundColor Green
Write-Host ""

$services = @(
    @{Name="Identity"; Port=5000; Path="src\Services\Identity"},
    @{Name="Inventory"; Port=5001; Path="src\Services\Inventory"},
    @{Name="Sales"; Port=5002; Path="src\Services\Sales"},
    @{Name="Customer"; Port=5003; Path="src\Services\Customer"},
    @{Name="Analytics"; Port=5004; Path="src\Services\Analytics"},
    @{Name="API Gateway"; Port=8000; Path="src\ApiGateway"}
)

foreach ($service in $services) {
    Write-Host "Starting $($service.Name) on port $($service.Port)..." -ForegroundColor Cyan

    Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$($service.Path)'; `$env:ASPNETCORE_ENVIRONMENT='Production'; dotnet run"

    Start-Sleep -Seconds 2
}

Write-Host ""
Write-Host "All services started in PRODUCTION mode!" -ForegroundColor Green
Write-Host ""
Write-Host "Service URLs:" -ForegroundColor Yellow
Write-Host "  Identity    -> http://localhost:5000" -ForegroundColor White
Write-Host "  Inventory   -> http://localhost:5001" -ForegroundColor White
Write-Host "  Sales       -> http://localhost:5002" -ForegroundColor White
Write-Host "  Customer    -> http://localhost:5003" -ForegroundColor White
Write-Host "  Analytics   -> http://localhost:5004" -ForegroundColor White
Write-Host "  API Gateway -> http://localhost:8000" -ForegroundColor Cyan
Write-Host ""
Write-Host "Database: profitzen_prod" -ForegroundColor Yellow
Write-Host ""
Write-Host "PRODUCTION mode: Users will start with empty data." -ForegroundColor Red
