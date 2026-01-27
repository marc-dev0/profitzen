-- Seed default price lists for DEMO tenant
-- This script should be run after AddPriceLists migration

DO $$
BEGIN
    -- Check if price lists already exist for DEMO tenant
    IF NOT EXISTS (SELECT 1 FROM product.price_lists WHERE "TenantId" = 'DEMO') THEN

        -- Insert Minorista (Retail) price list as default
        INSERT INTO product.price_lists
            ("Id", "Name", "Code", "Description", "IsDefault", "IsActive", "TenantId", "CreatedAt", "UpdatedAt")
        VALUES
            (gen_random_uuid(), 'Minorista', 'RETAIL', 'Precio de venta al por menor', true, true, 'DEMO', NOW(), NOW());

        -- Insert Mayorista (Wholesale) price list
        INSERT INTO product.price_lists
            ("Id", "Name", "Code", "Description", "IsDefault", "IsActive", "TenantId", "CreatedAt", "UpdatedAt")
        VALUES
            (gen_random_uuid(), 'Mayorista', 'WHOLESALE', 'Precio de venta al por mayor', false, true, 'DEMO', NOW(), NOW());

        -- Insert Distribuidor (Distributor) price list
        INSERT INTO product.price_lists
            ("Id", "Name", "Code", "Description", "IsDefault", "IsActive", "TenantId", "CreatedAt", "UpdatedAt")
        VALUES
            (gen_random_uuid(), 'Distribuidor', 'DISTRIBUTOR', 'Precio de venta para distribuidores', false, true, 'DEMO', NOW(), NOW());

        RAISE NOTICE 'Default price lists created for DEMO tenant';
    ELSE
        RAISE NOTICE 'Price lists already exist for DEMO tenant, skipping seed';
    END IF;
END $$;
