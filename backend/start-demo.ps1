Write-Host "Starting Profitzen - DEMO Environment" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$env:ASPNETCORE_ENVIRONMENT = "Demo"

Write-Host "Stopping any running dotnet processes..." -ForegroundColor Yellow
$dotnetProcesses = Get-Process dotnet -ErrorAction SilentlyContinue
if ($dotnetProcesses) {
    Write-Host "Found $($dotnetProcesses.Count) dotnet process(es). Stopping..." -ForegroundColor Yellow
    $dotnetProcesses | Stop-Process -Force
    Start-Sleep -Seconds 2
    Write-Host "All dotnet processes stopped." -ForegroundColor Green
} else {
    Write-Host "No dotnet processes found." -ForegroundColor Green
}
Write-Host ""

Write-Host "Environment: $env:ASPNETCORE_ENVIRONMENT" -ForegroundColor Yellow
Write-Host "Database: profitzen_demo" -ForegroundColor Yellow
Write-Host ""
Write-Host "Building solution..." -ForegroundColor Green
dotnet build
Write-Host ""

Write-Host "Starting services..." -ForegroundColor Green
Write-Host ""

$services = @(
    @{Name="Identity"; Port=5000; Path="src\Services\Identity"},
    @{Name="Inventory"; Port=5001; Path="src\Services\Inventory"},
    @{Name="Sales"; Port=5002; Path="src\Services\Sales"},
    @{Name="Product"; Port=5005; Path="src\Services\Product"},
    @{Name="Customer"; Port=5006; Path="src\Services\Customer"},
    @{Name="Configuration"; Port=5007; Path="src\Services\Configuration"},
    @{Name="Analytics"; Port=5004; Path="src\Services\Analytics"},
    @{Name="API Gateway"; Port=8000; Path="src\ApiGateway"}
)

foreach ($service in $services) {
    Write-Host "Starting $($service.Name) on port $($service.Port)..." -ForegroundColor Cyan

    Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$($service.Path)'; dotnet run --launch-profile Demo"

    Start-Sleep -Seconds 2
}

Write-Host ""
Write-Host "All services started in DEMO mode!" -ForegroundColor Green
Write-Host ""
Write-Host "Service URLs:" -ForegroundColor Yellow
Write-Host "  Identity       -> http://localhost:5000" -ForegroundColor White
Write-Host "  Inventory      -> http://localhost:5001" -ForegroundColor White
Write-Host "  Sales          -> http://localhost:5002" -ForegroundColor White
Write-Host "  Product        -> http://localhost:5005" -ForegroundColor White
Write-Host "  Customer       -> http://localhost:5006" -ForegroundColor White
Write-Host "  Configuration  -> http://localhost:5007" -ForegroundColor White
Write-Host "  API Gateway    -> http://localhost:8000" -ForegroundColor Cyan
Write-Host ""
Write-Host "Database: profitzen_demo" -ForegroundColor Yellow
Write-Host ""
Write-Host "DEMO mode: New users will automatically get sample data!" -ForegroundColor Green
