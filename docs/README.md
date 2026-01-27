# Profitzen - Sistema de Ventas para Tiendas Peruanas

Sistema de gestión de ventas optimizado para tiendas pequeñas y medianas de Perú. Diseñado para ser económico, fácil de usar y altamente escalable.

## Objetivo

Sistema para comerciantes peruanos:
- Control de inventario en tiempo real
- Análisis de rentabilidad por producto
- Procesamiento ágil de ventas
- Reportes automatizados
- Escalabilidad sin limitaciones técnicas

## Arquitectura

### Stack Open Source (VPS → Azure)
- **Frontend**: Next.js + TypeScript + Tailwind CSS
- **Backend**: .NET Core Microservices + PostgreSQL
- **Cache**: Redis 7
- **Proxy**: Nginx + SSL
- **Containerización**: Docker + Docker Compose

### Escalabilidad por Fases
1. **VPS 2GB** ($15/mes) → 2-10 tiendas
2. **Multi-VPS** ($50/mes) → 10-50 tiendas
3. **Azure Cloud** ($85/mes) → 50+ tiendas

## Documentación

- [`ARQUITECTURA_OPTIMIZADA.md`](./ARQUITECTURA_OPTIMIZADA.md) - Diseño técnico completo
- [`REQUISITOS.md`](./REQUISITOS.md) - Funcionalidades para tiendas peruanas
- [`DATABASE_SCHEMA.md`](./DATABASE_SCHEMA.md) - Estructura PostgreSQL optimizada
- [`MIGRACION_AZURE.md`](./MIGRACION_AZURE.md) - Path VPS → Azure
- [`ROADMAP_IMPLEMENTACION.md`](./ROADMAP_IMPLEMENTACION.md) - Timeline 6 semanas

## Quick Start

### Desarrollo Local
```bash
# Clonar repositorio
git clone https://github.com/tu-usuario/profitzen.git
cd profitzen

# Levantar stack completo
docker-compose up -d

# Frontend: http://localhost:3000
# Backend API: http://localhost:8000
# Docs API: http://localhost:8000/docs
```

### Producción VPS
```bash
# Setup inicial VPS
./deploy/setup-vps.sh

# Deploy aplicación
./deploy/deploy-prod.sh
```

## Features Core

### Punto de Venta (POS)
- Búsqueda rápida productos
- Múltiples métodos pago
- Boletas/Facturas PDF
- Descuentos y promociones

### Control Inventario
- Stock en tiempo real
- Alertas stock mínimo
- Movimientos detallados
- Valorización inventario

### Análisis Rentabilidad
- Top productos rentables
- Márgenes por categoría
- Productos sin rotación
- Comparación períodos

### Gestión Clientes
- Base datos clientes
- Historial compras
- Sistema créditos (fiado)
- Clientes frecuentes

## Pricing Target

- **Tienda Individual**: $20/mes
- **Multi-sucursal**: $35/mes
- **Enterprise**: $50/mes

Break-even: 5 tiendas → Profit margin 78%

## Roadmap

### Fase 1: MVP (6 semanas)
- Core POS system
- Inventario básico
- Reportes esenciales
- 2 hermanos beta testing

### Fase 2: Growth (3 meses)
- Onboarding automatizado
- Features avanzadas
- 10-15 tiendas

### Fase 3: Scale (6 meses)
- Azure migration
- Integración proveedores
- 50+ tiendas

## Team

- **Tech Lead**: 6 años experiencia
- **Beta Users**: 2 hermanos comerciantes
- **Target Market**: Tiendas peruanas pequeñas/medianas

## Support

- **Email**: support@profitzen.com
- **Docs**: https://docs.profitzen.com
- **Issues**: GitHub Issues