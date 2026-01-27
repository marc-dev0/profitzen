-- Check user and store association
SELECT u."Id", u."Email", u."StoreId" as LegacyStoreId
FROM identity."AspNetUsers" u
WHERE u."Email" = 'tiendita3@gmail.com';

-- Check UserStores table
SELECT us."StoresId", us."UsersId", s."Name"
FROM identity."UserStores" us
JOIN identity."AspNetUsers" u ON us."UsersId" = u."Id"
JOIN identity."Stores" s ON us."StoresId" = s."Id"
WHERE u."Email" = 'tiendita3@gmail.com';

-- Check all stores
SELECT * FROM identity."Stores";
