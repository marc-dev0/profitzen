-- Script para debug del TenantId

-- Ver el TenantId del usuario actual
SELECT "Id", "Email", "TenantId"
FROM identity."Users"
ORDER BY "CreatedAt" DESC
LIMIT 5;

-- Ver el TenantId de las series
SELECT "SeriesCode", "DocumentTypeName", "TenantId", "StoreId"
FROM master_data."DocumentSeries"
ORDER BY "DocumentType", "SeriesCode";

-- Ver si coinciden (IMPORTANTE)
SELECT
    'Usuario TenantId:' as tipo,
    u."TenantId" as tenant_id
FROM identity."Users" u
LIMIT 1

UNION ALL

SELECT
    'Serie TenantId:' as tipo,
    ds."TenantId" as tenant_id
FROM master_data."DocumentSeries" ds
LIMIT 1;
