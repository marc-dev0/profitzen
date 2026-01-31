# Profitzen - Guía de Despliegue Simplificada (VPS)

Esta guía detalla el proceso para actualizar la aplicación en el servidor VPS. 

**Nota:** Gracias a la configuración automática de Profitzen, las bases de datos se actualizan solas al iniciar los servicios.

## Configuración de Entornos

El proyecto usa **archivos `.env` separados** para cada entorno:
- `.env.prod` - Configuración de Producción
- `.env.demo` - Configuración de Demo

Cada archivo contiene variables de entorno como contraseñas de base de datos, claves API, y contraseñas de Seq.

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
docker-compose -f docker-compose.demo.yml --env-file .env.demo up -d --build
```

#### Para ambiente PRODUCCIÓN:
```bash
docker-compose -f docker-compose.prod.yml --env-file .env.prod up -d --build
```

**Importante:** Siempre usa el flag `--env-file` correspondiente para asegurar que se usen las variables correctas.

## Verificación

### Ver logs de servicios
```bash
# Ver logs de un servicio específico
docker logs profitzen-product-service-demo-1
docker logs profitzen-product-service-1

# Ver logs en tiempo real
docker logs -f profitzen-product-service-1
```

### Acceder a Seq (Logs Centralizados)

Seq está disponible en el servidor en los siguientes puertos:
- **Producción:** Puerto 5340 (UI) y 5344 (Ingestion)
- **Demo:** Puerto 5342 (UI) y 5343 (Ingestion)

#### Acceso mediante túnel SSH:

**Para Seq de Producción:**
```bash
ssh -L 5340:127.0.0.1:5340 root@76.13.106.53
```
Luego accede a: `http://localhost:5340`

**Para Seq de Demo:**
```bash
ssh -L 5350:127.0.0.1:5342 root@76.13.106.53
```
Luego accede a: `http://localhost:5350`

**Credenciales de Seq:**
- Usuario: `admin`
- Contraseña: La definida en `SEQ_ADMIN_PASSWORD` en el archivo `.env.prod` o `.env.demo` correspondiente

**Nota:** Puedes tener ambos túneles abiertos simultáneamente en terminales diferentes para monitorear ambos entornos.

## Comandos Útiles

### Reiniciar un servicio específico
```bash
# Producción
docker-compose -f docker-compose.prod.yml --env-file .env.prod restart product-service

# Demo
docker-compose -f docker-compose.demo.yml --env-file .env.demo restart product-service-demo
```

### Ver estado de contenedores
```bash
docker ps
```

### Detener todos los servicios
```bash
# Producción
docker-compose -f docker-compose.prod.yml --env-file .env.prod down

# Demo
docker-compose -f docker-compose.demo.yml --env-file .env.demo down
```

## Resetear Contraseña de Seq

Si necesitas resetear la contraseña de Seq, elimina el volumen y recrea el contenedor:

```bash
# Para Seq de Demo
docker-compose -f docker-compose.demo.yml --env-file .env.demo stop seq-demo
docker-compose -f docker-compose.demo.yml --env-file .env.demo rm -f seq-demo
docker volume rm profitzen_seq_demo_data
docker-compose -f docker-compose.demo.yml --env-file .env.demo up -d seq-demo

# Para Seq de Producción
docker-compose -f docker-compose.prod.yml --env-file .env.prod stop seq
docker-compose -f docker-compose.prod.yml --env-file .env.prod rm -f seq
docker volume rm profitzen_seq_prod_data
docker-compose -f docker-compose.prod.yml --env-file .env.prod up -d seq
```

**ADVERTENCIA:** Esto eliminará todos los logs históricos de Seq.

---
*Manual actualizado el 31 de Enero, 2026.*
