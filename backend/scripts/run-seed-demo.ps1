# Script para ejecutar seed de series SUNAT en profitzen_demo
# Debe ejecutarse desde la carpeta backend/scripts

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "  SEED: Series de Documentos SUNAT - DEMO" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""

# Configuración de PostgreSQL
$env:PGPASSWORD = "postgres"
$psqlPath = "C:\Program Files\PostgreSQL\16\bin\psql.exe"

if (-not (Test-Path $psqlPath)) {
    Write-Host "ERROR: No se encontró psql.exe en la ruta esperada" -ForegroundColor Red
    Write-Host "Ruta esperada: $psqlPath" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Por favor, ejecuta el script SQL manualmente usando DataGrip o pgAdmin:" -ForegroundColor Yellow
    Write-Host "  Archivo: backend/scripts/seed-document-series-demo.sql" -ForegroundColor Yellow
    Write-Host "  Database: profitzen_demo" -ForegroundColor Yellow
    exit 1
}

Write-Host "Conectando a profitzen_demo..." -ForegroundColor Yellow

# Ejecutar el script SQL
& $psqlPath -U postgres -d profitzen_demo -f "seed-document-series-demo.sql"

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "==================================================" -ForegroundColor Green
    Write-Host "  SEED COMPLETADO EXITOSAMENTE" -ForegroundColor Green
    Write-Host "==================================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Series creadas:" -ForegroundColor Cyan
    Write-Host "  - F001 (Factura)" -ForegroundColor White
    Write-Host "  - B001 (Boleta de Venta)" -ForegroundColor White
    Write-Host "  - FC01 (Nota de Crédito)" -ForegroundColor White
    Write-Host "  - T001 (Guía de Remisión)" -ForegroundColor White
} else {
    Write-Host ""
    Write-Host "ERROR: Falló la ejecución del script" -ForegroundColor Red
    Write-Host "Verifica que exista al menos un tenant y una tienda en la BD" -ForegroundColor Yellow
    exit 1
}

# Limpiar variable de entorno
$env:PGPASSWORD = $null
