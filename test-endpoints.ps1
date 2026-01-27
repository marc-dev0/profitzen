Write-Host "Testing Profitzen API Endpoints..." -ForegroundColor Green

$baseUrl = "http://localhost:8000"

Write-Host "`n1. Testing API Gateway Health..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/health" -Method GET
    Write-Host "✅ API Gateway: $($response.status)" -ForegroundColor Green
    Write-Host "   Service: $($response.service)" -ForegroundColor Cyan
    Write-Host "   Version: $($response.version)" -ForegroundColor Cyan
} catch {
    Write-Host "❌ API Gateway not responding" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n2. Testing Identity Service Health..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/auth/health" -Method GET
    Write-Host "✅ Identity Service: $($response.status)" -ForegroundColor Green
    Write-Host "   Service: $($response.service)" -ForegroundColor Cyan
    Write-Host "   Version: $($response.version)" -ForegroundColor Cyan
} catch {
    Write-Host "❌ Identity Service not responding" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n3. Testing Login with Demo User..." -ForegroundColor Yellow
try {
    $loginData = @{
        email = "admin1@profitzen.com"
        password = "password123"
    }

    $response = Invoke-RestMethod -Uri "$baseUrl/api/auth/login" -Method POST -Body ($loginData | ConvertTo-Json) -ContentType "application/json"
    Write-Host "✅ Login successful!" -ForegroundColor Green
    Write-Host "   User: $($response.user.fullName)" -ForegroundColor Cyan
    Write-Host "   Store: $($response.user.store.name)" -ForegroundColor Cyan
    Write-Host "   Role: $($response.user.role)" -ForegroundColor Cyan
    Write-Host "   Token expires: $($response.expiresAt)" -ForegroundColor Cyan

    $token = $response.token

    Write-Host "`n4. Testing Protected Endpoint..." -ForegroundColor Yellow
    $headers = @{
        "Authorization" = "Bearer $token"
    }

    $userInfo = Invoke-RestMethod -Uri "$baseUrl/api/auth/me" -Method GET -Headers $headers
    Write-Host "✅ Protected endpoint working!" -ForegroundColor Green
    Write-Host "   User ID: $($userInfo.id)" -ForegroundColor Cyan
    Write-Host "   Email: $($userInfo.email)" -ForegroundColor Cyan
    Write-Host "   Store ID: $($userInfo.store.id)" -ForegroundColor Cyan

} catch {
    Write-Host "❌ Login failed" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n5. Testing Invalid Login..." -ForegroundColor Yellow
try {
    $invalidLogin = @{
        email = "admin1@profitzen.com"
        password = "wrongpassword"
    }

    $response = Invoke-RestMethod -Uri "$baseUrl/api/auth/login" -Method POST -Body ($invalidLogin | ConvertTo-Json) -ContentType "application/json"
    Write-Host "❌ Security issue: Invalid login succeeded!" -ForegroundColor Red
} catch {
    Write-Host "✅ Security working: Invalid login rejected" -ForegroundColor Green
}

Write-Host "`n🎉 API Testing Complete!" -ForegroundColor Green
Write-Host "`nDemo Users Created:" -ForegroundColor Yellow
Write-Host "   Email: admin1@profitzen.com | Password: password123 | Store: Tienda Hermano 1" -ForegroundColor Cyan
Write-Host "   Email: admin2@profitzen.com | Password: password123 | Store: Tienda Hermano 2" -ForegroundColor Cyan