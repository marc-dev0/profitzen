# Profitzen - Guía de Despliegue y Mantenimiento (VPS)

Esta guía detalla el proceso para actualizar la aplicación en el servidor VPS, incluyendo la actualización de código y la migración de base de datos.

## 1. Actualización de Código
Para bajar los últimos cambios desde el repositorio de GitHub:

```bash
cd ~/profitzen
git pull origin master
```

## 2. Actualización de la Base de Datos (Migraciones)
Cuando se agregan nuevos campos o tablas (como el campo `PurchaseConversionMethod` en Productos), es necesario indicarle a la base de datos que actualice su estructura.

**IMPORTANTE:** En nuestro VPS, los contenedores se ejecutan sin el SDK de .NET por seguridad. Por lo tanto, las migraciones se ejecutan desde el host (servidor) donde sí tenemos instalada la herramienta `dotnet ef`.

### Para el ambiente DEMO:
```bash
cd ~/profitzen/backend/src/Services/Product
ASPNETCORE_ENVIRONMENT=Demo dotnet ef database update
```

### Para el ambiente PRODUCCIÓN:
```bash
cd ~/profitzen/backend/src/Services/Product
ASPNETCORE_ENVIRONMENT=Production dotnet ef database update
```

## 3. Reconstrucción y Recompilación (Docker)
Una vez actualizada la base de datos, debemos reconstruir las imágenes de Docker para que incluyan el nuevo código de las APIs y el Frontend.

### Ambiente DEMO:
```bash
cd ~/profitzen
docker-compose -f docker-compose.demo.yml up -d --build
```

### Ambiente PRODUCCIÓN:
```bash
cd ~/profitzen
docker-compose -f docker-compose.prod.yml up -d --build
```

## 4. Comandos Útiles de Monitoreo
Si algo no funciona, usa estos comandos para ver qué está pasando:

* **Ver estado de contenedores:** `docker ps`
* **Ver logs de un servicio (ej: productos):** `docker logs profitzen-product-service-1`
* **Ver logs en tiempo real:** `docker-compose -f docker-compose.prod.yml logs -f`

---
*Nota: Esta guía fue generada automáticamente tras la implementación de la persistencia de UOM.*
