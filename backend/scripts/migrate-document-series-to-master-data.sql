-- Script para migrar DocumentSeries de inventory a master_data
-- Ejecutar después de crear el schema master_data

-- Copiar datos de inventory.DocumentSeries a master_data.DocumentSeries
INSERT INTO master_data."DocumentSeries"
("Id", "SeriesCode", "DocumentType", "DocumentTypeName", "CurrentNumber", "StoreId", "TenantId", "IsActive", "IsDefault", "CreatedAt", "UpdatedAt", "DeletedAt")
SELECT
    "Id",
    "SeriesCode",
    "DocumentType",
    "DocumentTypeName",
    "CurrentNumber",
    "StoreId",
    "TenantId",
    "IsActive",
    "IsDefault",
    "CreatedAt",
    "UpdatedAt",
    "DeletedAt"
FROM inventory."DocumentSeries"
ON CONFLICT ("SeriesCode", "TenantId") DO NOTHING;

-- Verificar datos migrados
SELECT
    "SeriesCode",
    "DocumentTypeName",
    "CurrentNumber",
    "TenantId"
FROM master_data."DocumentSeries"
ORDER BY "DocumentType", "SeriesCode";

-- OPCIONAL: Eliminar tabla antigua de inventory (ejecutar solo después de verificar)
-- DROP TABLE inventory."DocumentSeries";


6ca745b2-e9c8-46b5-a31a-045de00e2281