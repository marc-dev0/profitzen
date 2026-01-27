-- Script para crear series de documentos SUNAT en el ambiente DEMO
-- Ejecutar este script después de iniciar el sistema con start-demo.ps1
-- Reemplazar los valores de tenant_id y store_id según corresponda

-- Para obtener los IDs necesarios, ejecutar primero:
-- SELECT id, name FROM identity."Tenants" LIMIT 1;
-- SELECT id, name FROM identity."Stores" LIMIT 1;

-- Ejemplo con IDs de demostración (REEMPLAZAR CON LOS VALORES REALES)
DO $$
DECLARE
    v_tenant_id VARCHAR(450);
    v_store_id UUID;
BEGIN
    -- Obtener el primer tenant y store disponibles
    SELECT "Id" INTO v_tenant_id FROM identity."Tenants" LIMIT 1;
    SELECT "Id" INTO v_store_id FROM identity."Stores" LIMIT 1;

    -- Verificar que existen
    IF v_tenant_id IS NULL THEN
        RAISE EXCEPTION 'No se encontró ningún tenant. Crear uno primero.';
    END IF;

    IF v_store_id IS NULL THEN
        RAISE EXCEPTION 'No se encontró ninguna tienda. Crear una primero.';
    END IF;

    -- Limpiar series existentes para este tenant/store (opcional)
    DELETE FROM inventory."DocumentSeries"
    WHERE "TenantId" = v_tenant_id AND "StoreId" = v_store_id;

    -- FACTURAS (Tipo 01)
    INSERT INTO inventory."DocumentSeries"
    ("Id", "SeriesCode", "DocumentType", "DocumentTypeName", "CurrentNumber", "StoreId", "TenantId", "IsActive", "IsDefault", "CreatedAt", "UpdatedAt", "DeletedAt")
    VALUES
    (gen_random_uuid(), 'F001', '01', 'Factura', 0, v_store_id, v_tenant_id, true, true, NOW(), NOW(), NULL);

    -- BOLETAS DE VENTA (Tipo 03)
    INSERT INTO inventory."DocumentSeries"
    ("Id", "SeriesCode", "DocumentType", "DocumentTypeName", "CurrentNumber", "StoreId", "TenantId", "IsActive", "IsDefault", "CreatedAt", "UpdatedAt", "DeletedAt")
    VALUES
    (gen_random_uuid(), 'B001', '03', 'Boleta de Venta', 0, v_store_id, v_tenant_id, true, true, NOW(), NOW(), NULL);

    -- NOTAS DE CRÉDITO (Tipo 07)
    INSERT INTO inventory."DocumentSeries"
    ("Id", "SeriesCode", "DocumentType", "DocumentTypeName", "CurrentNumber", "StoreId", "TenantId", "IsActive", "IsDefault", "CreatedAt", "UpdatedAt", "DeletedAt")
    VALUES
    (gen_random_uuid(), 'FC01', '07', 'Nota de Crédito', 0, v_store_id, v_tenant_id, true, true, NOW(), NOW(), NULL);

    -- GUÍAS DE REMISIÓN (Tipo 09)
    INSERT INTO inventory."DocumentSeries"
    ("Id", "SeriesCode", "DocumentType", "DocumentTypeName", "CurrentNumber", "StoreId", "TenantId", "IsActive", "IsDefault", "CreatedAt", "UpdatedAt", "DeletedAt")
    VALUES
    (gen_random_uuid(), 'T001', '09', 'Guía de Remisión', 0, v_store_id, v_tenant_id, true, true, NOW(), NOW(), NULL);

    -- Mostrar series creadas
    RAISE NOTICE 'Series de documentos creadas exitosamente para Tenant: % y Store: %', v_tenant_id, v_store_id;

    -- Verificar series creadas
    RAISE NOTICE '-------------------------------------------';
    RAISE NOTICE 'Series creadas:';
    PERFORM 1 FROM inventory."DocumentSeries"
    WHERE "TenantId" = v_tenant_id AND "StoreId" = v_store_id;
END $$;

-- Consultar series creadas
SELECT
    "SeriesCode",
    "DocumentTypeName",
    "CurrentNumber",
    "IsActive",
    "IsDefault",
    "CreatedAt"
FROM inventory."DocumentSeries"
ORDER BY "DocumentType", "SeriesCode";
