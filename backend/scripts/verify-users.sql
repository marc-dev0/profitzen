-- Script para verificar usuarios y sus contraseñas
-- Ejecutar en PostgreSQL

-- Ver todos los usuarios
SELECT 
    "Id",
    "Email",
    "UserName",
    "IsActive",
    "EmailConfirmed",
    "TenantId",
    "StoreId",
    "Role"
FROM identity."AspNetUsers"
ORDER BY "Email";

-- Ver tokens de reset de contraseña
SELECT 
    "Id",
    "UserId",
    "Token",
    "ExpiresAt",
    "IsUsed",
    "CreatedAt"
FROM identity."PasswordResetTokens"
ORDER BY "CreatedAt" DESC
LIMIT 10;

-- Para resetear manualmente la contraseña de un usuario a "Admin123!"
-- Primero, obtén el hash de la contraseña de un usuario que funciona:
-- SELECT "PasswordHash" FROM identity."AspNetUsers" WHERE "Email" = 'admin@profitzen.com';

-- Luego, copia ese hash a otro usuario:
-- UPDATE identity."AspNetUsers" 
-- SET "PasswordHash" = 'HASH_AQUI'
-- WHERE "Email" = 'm.rojascoraje@gmail.com';
