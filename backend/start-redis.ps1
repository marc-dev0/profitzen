# Start Redis using Docker
# This is required for the PaymentMethods service to cache sale calculations

Write-Host "Starting Redis..." -ForegroundColor Cyan

# Check if Docker is running
try {
    docker ps | Out-Null
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Docker is not running. Please start Docker Desktop first." -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "Docker is not installed or not in PATH." -ForegroundColor Red
    exit 1
}

# Check if redis container already exists
$existingContainer = docker ps -a --filter "name=profitzen-redis" --format "{{.Names}}"

if ($existingContainer) {
    Write-Host "Redis container already exists. Starting it..." -ForegroundColor Yellow
    docker start profitzen-redis
} else {
    Write-Host "Creating new Redis container..." -ForegroundColor Green
    docker run -d `
        --name profitzen-redis `
        -p 6379:6379 `
        redis:latest
}

if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Redis is running on localhost:6379" -ForegroundColor Green
} else {
    Write-Host "✗ Failed to start Redis" -ForegroundColor Red
    exit 1
}
