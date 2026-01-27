-- Script para corregir el TenantId de las series SUNAT
-- Este script actualiza las series para que usen el mismo TenantId que el usuario actual

DO $$
DECLARE
    v_user_tenant_id VARCHAR(450);
BEGIN
    -- Obtener el TenantId del primer usuario
    SELECT "TenantId" INTO v_user_tenant_id
    FROM identity."Users"
    ORDER BY "CreatedAt" DESC
    LIMIT 1;

    -- Mostrar el TenantId que se va a usar
    RAISE NOTICE 'TenantId del usuario: %', v_user_tenant_id;

    -- Actualizar todas las series para que usen el mismo TenantId
    UPDATE master_data."DocumentSeries"
    SET "TenantId" = v_user_tenant_id,
        "UpdatedAt" = NOW()
    WHERE "TenantId" != v_user_tenant_id OR "TenantId" IS NULL;

    -- Mostrar cuántas series se actualizaron
    RAISE NOTICE 'Series actualizadas exitosamente';

END $$;

-- Verificar las series actualizadas
SELECT
    "SeriesCode",
    "DocumentTypeName",
    "TenantId",
    "IsActive",
    "IsDefault"
FROM master_data."DocumentSeries"
ORDER BY "DocumentType", "SeriesCode";
