Write-Host "Testing Demo Environment - User Registration with Auto-Seeding" -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""

$registerUrl = "http://localhost:5000/api/auth/register"

$userData = @{
    email = "test@demo.com"
    password = "Test123!"
    fullName = "Usuario Demo"
    companyName = "Empresa Demo"
    storeName = "Tienda Demo"
} | ConvertTo-Json

Write-Host "Registering user..." -ForegroundColor Yellow
Write-Host "URL: $registerUrl" -ForegroundColor Gray
Write-Host "Data: $userData" -ForegroundColor Gray
Write-Host ""

try {
    $response = Invoke-RestMethod -Uri $registerUrl -Method Post -Body $userData -ContentType "application/json"

    Write-Host "SUCCESS! User registered" -ForegroundColor Green
    Write-Host ""
    Write-Host "Response:" -ForegroundColor Yellow
    $response | ConvertTo-Json -Depth 5

    Write-Host ""
    Write-Host "Now checking if demo data was seeded..." -ForegroundColor Yellow

    # Esperar un momento para que el seeding termine
    Start-Sleep -Seconds 3

    Write-Host ""
    Write-Host "Checking database for seeded data..." -ForegroundColor Yellow

    # Verificar categorías
    docker exec -i profitzen-postgres-1 psql -U postgres -d profitzen_demo -c "SELECT COUNT(*) as categories FROM inventory.""Categories"" WHERE ""TenantId"" = (SELECT ""Id"" FROM identity.""Tenants"" ORDER BY ""CreatedAt"" DESC LIMIT 1);"

    # Verificar productos
    docker exec -i profitzen-postgres-1 psql -U postgres -d profitzen_demo -c "SELECT COUNT(*) as products FROM inventory.""Products"" WHERE ""TenantId"" = (SELECT ""Id"" FROM identity.""Tenants"" ORDER BY ""CreatedAt"" DESC LIMIT 1);"

    # Verificar ventas
    docker exec -i profitzen-postgres-1 psql -U postgres -d profitzen_demo -c "SELECT COUNT(*) as sales FROM sales.""Sales"" WHERE ""TenantId"" = (SELECT ""Id"" FROM identity.""Tenants"" ORDER BY ""CreatedAt"" DESC LIMIT 1);"

    Write-Host ""
    Write-Host "Demo registration test COMPLETED!" -ForegroundColor Green
}
catch {
    Write-Host "ERROR: Registration failed" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red

    if ($_.ErrorDetails) {
        Write-Host ""
        Write-Host "Error Details:" -ForegroundColor Yellow
        Write-Host $_.ErrorDetails.Message -ForegroundColor Red
    }
}
