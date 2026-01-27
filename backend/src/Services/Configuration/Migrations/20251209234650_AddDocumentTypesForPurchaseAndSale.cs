using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Profitzen.Configuration.Migrations
{
    /// <inheritdoc />
    public partial class AddDocumentTypesForPurchaseAndSale : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
                INSERT INTO master_data.""MasterDataTypes"" (""Id"", ""Code"", ""Name"", ""Description"", ""AllowHierarchy"", ""IsActive"", ""CreatedAt"", ""UpdatedAt"")
                VALUES
                (gen_random_uuid(), 'DOC_TYPE_PURCHASE', 'Tipos de Documento de Compra', 'Tipos de comprobantes de compra según normativa peruana (SUNAT)', false, true, NOW(), NOW()),
                (gen_random_uuid(), 'DOC_TYPE_SALE', 'Tipos de Documento de Venta', 'Tipos de comprobantes de venta según normativa peruana (SUNAT)', false, true, NOW(), NOW())
                ON CONFLICT (""Code"") DO NOTHING;

                INSERT INTO master_data.""MasterDataValues"" (""Id"", ""TypeCode"", ""Code"", ""Name"", ""Description"", ""Metadata"", ""TenantId"", ""DisplayOrder"", ""IsActive"", ""CreatedAt"", ""UpdatedAt"")
                VALUES
                (gen_random_uuid(), 'DOC_TYPE_PURCHASE', '01', 'Factura', 'Factura electrónica o física', '{}', 'system', 1, true, NOW(), NOW()),
                (gen_random_uuid(), 'DOC_TYPE_PURCHASE', '03', 'Boleta de Venta', 'Boleta de venta electrónica o física', '{}', 'system', 2, true, NOW(), NOW()),
                (gen_random_uuid(), 'DOC_TYPE_PURCHASE', '00', 'Ticket/Nota Simple', 'Comprobante no fiscal - Ticket o nota simple', '{}', 'system', 3, true, NOW(), NOW()),
                (gen_random_uuid(), 'DOC_TYPE_PURCHASE', '99', 'Sin Comprobante', 'Compra sin comprobante de pago', '{}', 'system', 4, true, NOW(), NOW()),
                (gen_random_uuid(), 'DOC_TYPE_SALE', '01', 'Factura', 'Factura electrónica o física', '{}', 'system', 1, true, NOW(), NOW()),
                (gen_random_uuid(), 'DOC_TYPE_SALE', '03', 'Boleta de Venta', 'Boleta de venta electrónica o física', '{}', 'system', 2, true, NOW(), NOW()),
                (gen_random_uuid(), 'DOC_TYPE_SALE', 'NV', 'Nota de Venta', 'Nota de venta interna (sin valor tributario)', '{}', 'system', 3, true, NOW(), NOW())
                ON CONFLICT (""TypeCode"", ""Code"", ""TenantId"") DO NOTHING;
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
                DELETE FROM master_data.""MasterDataValues"" WHERE ""TypeCode"" IN ('DOC_TYPE_PURCHASE', 'DOC_TYPE_SALE') AND ""TenantId"" = 'system';
                DELETE FROM master_data.""MasterDataTypes"" WHERE ""Code"" IN ('DOC_TYPE_PURCHASE', 'DOC_TYPE_SALE');
            ");
        }
    }
}
