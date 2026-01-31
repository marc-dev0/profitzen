# Scripts de Base de Datos

Este directorio contiene scripts SQL para inicializar y mantener la base de datos.

## seed-document-series.sql

Script template para crear series de documentos SUNAT. Usar este script cuando se crea un nuevo tenant o tienda en producción.

### Uso:

1. Reemplazar `{tenant_id}` con el UUID del tenant
2. Reemplazar `{store_id}` con el UUID de la tienda
3. Ejecutar el script en la base de datos correspondiente

```bash
psql -U postgres -d nombre_base_datos -f seed-document-series.sql
```

## seed-document-series-demo.sql

Script automático para crear series de documentos en el ambiente DEMO. Este script obtiene automáticamente el primer tenant y tienda disponibles.

### Uso:

1. Asegurarse de que el sistema está corriendo con `start-demo.ps1`
2. Verificar que existe al menos un tenant y una tienda
3. Ejecutar el script:

```bash
# Desde la raíz del proyecto backend
psql -U postgres -d profitzen_demo -f scripts/seed-document-series-demo.sql
```

O usando DataGrip/pgAdmin, abrir el archivo y ejecutar.

## Series SUNAT creadas por defecto

Cada script crea las siguientes series:

| Código Serie | Tipo SUNAT | Nombre Documento    | Número Inicial |
|--------------|------------|---------------------|----------------|
| F001         | 01         | Factura             | 0              |
| B001         | 03         | Boleta de Venta     | 0              |
| FC01         | 07         | Nota de Crédito     | 0              |
| T001         | 09         | Guía de Remisión    | 0              |

Todas las series se crean:
- **Activas** (`IsActive = true`)
- Como **serie por defecto** para su tipo de documento (`IsDefault = true`)
- Con número inicial en **0** (el primer documento será 00000001)

## Notas importantes

- Solo puede haber **una serie por defecto** por tipo de documento por tienda
- Los números correlativos **nunca se reinician**
- El formato final del documento es: `{SeriesCode}-{CurrentNumber:D8}`
  - Ejemplo: `F001-00000001`, `B001-00000523`
- Cumple con las normativas de SUNAT para numeración de comprobantes electrónicos
