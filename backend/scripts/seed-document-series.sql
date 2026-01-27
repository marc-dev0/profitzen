-- Script para crear series de documentos SUNAT por defecto
-- Se ejecuta después de crear un tenant y una tienda

-- Variables a reemplazar:
-- {tenant_id} - ID del tenant
-- {store_id} - ID de la tienda

-- FACTURAS (Tipo 01)
INSERT INTO inventory."DocumentSeries"
("Id", "SeriesCode", "DocumentType", "DocumentTypeName", "CurrentNumber", "StoreId", "TenantId", "IsActive", "IsDefault", "CreatedAt", "UpdatedAt", "DeletedAt")
VALUES
(gen_random_uuid(), 'F001', '01', 'Factura', 0, '{store_id}', '{tenant_id}', true, true, NOW(), NOW(), NULL);

-- BOLETAS DE VENTA (Tipo 03)
INSERT INTO inventory."DocumentSeries"
("Id", "SeriesCode", "DocumentType", "DocumentTypeName", "CurrentNumber", "StoreId", "TenantId", "IsActive", "IsDefault", "CreatedAt", "UpdatedAt", "DeletedAt")
VALUES
(gen_random_uuid(), 'B001', '03', 'Boleta de Venta', 0, '{store_id}', '{tenant_id}', true, true, NOW(), NOW(), NULL);

-- NOTAS DE CRÉDITO (Tipo 07)
INSERT INTO inventory."DocumentSeries"
("Id", "SeriesCode", "DocumentType", "DocumentTypeName", "CurrentNumber", "StoreId", "TenantId", "IsActive", "IsDefault", "CreatedAt", "UpdatedAt", "DeletedAt")
VALUES
(gen_random_uuid(), 'FC01', '07', 'Nota de Crédito', 0, '{store_id}', '{tenant_id}', true, true, NOW(), NOW(), NULL);

-- GUÍAS DE REMISIÓN (Tipo 09)
INSERT INTO inventory."DocumentSeries"
("Id", "SeriesCode", "DocumentType", "DocumentTypeName", "CurrentNumber", "StoreId", "TenantId", "IsActive", "IsDefault", "CreatedAt", "UpdatedAt", "DeletedAt")
VALUES
(gen_random_uuid(), 'T001', '09', 'Guía de Remisión', 0, '{store_id}', '{tenant_id}', true, true, NOW(), NOW(), NULL);

-- Verificar series creadas
SELECT "SeriesCode", "DocumentTypeName", "CurrentNumber", "IsActive", "IsDefault"
FROM inventory."DocumentSeries"
WHERE "TenantId" = '{tenant_id}' AND "StoreId" = '{store_id}';
