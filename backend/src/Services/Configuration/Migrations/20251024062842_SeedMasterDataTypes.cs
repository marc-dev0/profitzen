using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Profitzen.Configuration.Migrations
{
    /// <inheritdoc />
    public partial class SeedMasterDataTypes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            var now = DateTime.UtcNow;

            // Seed MasterDataTypes
            migrationBuilder.Sql($@"
                INSERT INTO master_data.""MasterDataTypes"" (""Id"", ""Code"", ""Name"", ""Description"", ""AllowHierarchy"", ""IsActive"", ""CreatedAt"", ""UpdatedAt"")
                VALUES
                ('{Guid.NewGuid()}', 'CATEGORY', 'Categoría de Producto', 'Categorías para clasificar productos', true, true, '{now:O}', '{now:O}'),
                ('{Guid.NewGuid()}', 'SUBCATEGORY', 'Subcategoría', 'Subcategorías de productos (hija de CATEGORY)', false, true, '{now:O}', '{now:O}'),
                ('{Guid.NewGuid()}', 'BRAND', 'Marca', 'Marcas de productos', false, true, '{now:O}', '{now:O}'),
                ('{Guid.NewGuid()}', 'LOCATION', 'Ubicación', 'Ubicaciones físicas de almacén', true, true, '{now:O}', '{now:O}'),
                ('{Guid.NewGuid()}', 'PAYMENT_METHOD', 'Método de Pago', 'Formas de pago disponibles', false, true, '{now:O}', '{now:O}'),
                ('{Guid.NewGuid()}', 'CUSTOMER_TYPE', 'Tipo de Cliente', 'Clasificación de clientes', false, true, '{now:O}', '{now:O}');
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
                DELETE FROM master_data.""MasterDataTypes""
                WHERE ""Code"" IN ('CATEGORY', 'SUBCATEGORY', 'BRAND', 'LOCATION', 'PAYMENT_METHOD', 'CUSTOMER_TYPE');
            ");
        }
    }
}
