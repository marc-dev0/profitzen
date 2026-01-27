Write-Host "Setting up Profitzen development environment..." -ForegroundColor Green

Set-Location ..

if (-not (Test-Path ".env")) {
    Write-Host "Creating .env file from template..." -ForegroundColor Yellow
    Copy-Item ".env.example" ".env"
}

Write-Host "Starting development containers..." -ForegroundColor Green
docker-compose -f docker-compose.dev.yml up --build -d postgres redis

Write-Host "Waiting for PostgreSQL to be ready..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

Write-Host "Building shared libraries..." -ForegroundColor Green
dotnet build backend/src/Shared/Profitzen.Common/Profitzen.Common.csproj

Write-Host "Development environment ready!" -ForegroundColor Green
Write-Host "Database: localhost:5432" -ForegroundColor Cyan
Write-Host "Redis: localhost:6379" -ForegroundColor Cyan
Write-Host "" -ForegroundColor White
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Build Identity Service: dotnet build backend/src/Services/Identity/" -ForegroundColor White
Write-Host "2. Start services: docker-compose -f docker-compose.dev.yml up --build" -ForegroundColor White
Write-Host "3. Frontend: cd frontend && npm run dev" -ForegroundColor White