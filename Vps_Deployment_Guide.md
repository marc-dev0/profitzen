# Profitzen - Guía de Despliegue Simplificada (VPS)

Esta guía detalla el proceso para actualizar la aplicación en el servidor VPS. 

**Nota:** Gracias a la configuración automática de Profitzen, las bases de datos se actualizan solas al iniciar los servicios.

## Pasos para Actualizar

### 1. Bajar los últimos cambios
```bash
cd ~/profitzen
git pull origin master
```

### 2. Actualizar y Reiniciar Servicios
Este comando compilará el nuevo código y aplicará automáticamente cualquier cambio pendiente en la base de datos (migraciones).

#### Para ambiente DEMO:
```bash
docker-compose -f docker-compose.demo.yml up -d --build
```

#### Para ambiente PRODUCCIÓN:
```bash
docker-compose -f docker-compose.prod.yml up -d --build
```

## Verificación
Para confirmar que todo subió correctamente, puedes ver los logs:
```bash
# Ver si hubo errores en las migraciones de productos
docker logs profitzen-product-service-demo-1
```

---
*Manual actualizado el 28 de Enero, 2026.*
