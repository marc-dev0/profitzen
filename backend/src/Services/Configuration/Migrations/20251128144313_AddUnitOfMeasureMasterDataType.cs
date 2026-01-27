using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Profitzen.Configuration.Migrations
{
    /// <inheritdoc />
    public partial class AddUnitOfMeasureMasterDataType : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
                INSERT INTO master_data.""MasterDataTypes"" (""Id"", ""Code"", ""Name"", ""Description"", ""AllowHierarchy"", ""IsActive"", ""CreatedAt"", ""UpdatedAt"")
                VALUES (gen_random_uuid(), 'UOM', 'Unidad de Medida', 'Unidades de medida para productos', false, true, NOW(), NOW())
                ON CONFLICT (""Code"") DO NOTHING;

                INSERT INTO master_data.""MasterDataValues"" (""Id"", ""TypeCode"", ""Code"", ""Name"", ""Description"", ""Metadata"", ""TenantId"", ""DisplayOrder"", ""IsActive"", ""CreatedAt"", ""UpdatedAt"")
                VALUES
                (gen_random_uuid(), 'UOM', 'UND', 'Unidad', '', '{""type"": ""Discrete""}', 'system', 1, true, NOW(), NOW()),
                (gen_random_uuid(), 'UOM', 'PZA', 'Pieza', '', '{""type"": ""Discrete""}', 'system', 2, true, NOW(), NOW()),
                (gen_random_uuid(), 'UOM', 'DOC', 'Docena', '', '{""type"": ""Discrete""}', 'system', 3, true, NOW(), NOW()),
                (gen_random_uuid(), 'UOM', 'GRU', 'Gruesa', '', '{""type"": ""Discrete""}', 'system', 4, true, NOW(), NOW()),
                (gen_random_uuid(), 'UOM', 'CJA', 'Caja', '', '{""type"": ""Discrete""}', 'system', 5, true, NOW(), NOW()),
                (gen_random_uuid(), 'UOM', 'PAQ', 'Paquete', '', '{""type"": ""Discrete""}', 'system', 6, true, NOW(), NOW()),
                (gen_random_uuid(), 'UOM', 'FAR', 'Fardo', '', '{""type"": ""Discrete""}', 'system', 7, true, NOW(), NOW()),
                (gen_random_uuid(), 'UOM', 'BOL', 'Bolsa', '', '{""type"": ""Discrete""}', 'system', 8, true, NOW(), NOW()),
                (gen_random_uuid(), 'UOM', 'ROL', 'Rollo', '', '{""type"": ""Discrete""}', 'system', 9, true, NOW(), NOW()),
                (gen_random_uuid(), 'UOM', 'PLT', 'Pallet', '', '{""type"": ""Discrete""}', 'system', 10, true, NOW(), NOW()),
                (gen_random_uuid(), 'UOM', 'PAR', 'Par', '', '{""type"": ""Discrete""}', 'system', 11, true, NOW(), NOW()),
                (gen_random_uuid(), 'UOM', 'SET', 'Set', '', '{""type"": ""Discrete""}', 'system', 12, true, NOW(), NOW()),
                (gen_random_uuid(), 'UOM', 'PACK', 'Pack', '', '{""type"": ""Discrete""}', 'system', 13, true, NOW(), NOW()),
                (gen_random_uuid(), 'UOM', 'KG', 'Kilogramo', '', '{""type"": ""Weight""}', 'system', 14, true, NOW(), NOW()),
                (gen_random_uuid(), 'UOM', 'GR', 'Gramo', '', '{""type"": ""Weight""}', 'system', 15, true, NOW(), NOW()),
                (gen_random_uuid(), 'UOM', 'MG', 'Miligramo', '', '{""type"": ""Weight""}', 'system', 16, true, NOW(), NOW()),
                (gen_random_uuid(), 'UOM', 'TON', 'Tonelada', '', '{""type"": ""Weight""}', 'system', 17, true, NOW(), NOW()),
                (gen_random_uuid(), 'UOM', 'LB', 'Libra', '', '{""type"": ""Weight""}', 'system', 18, true, NOW(), NOW()),
                (gen_random_uuid(), 'UOM', 'OZ', 'Onza', '', '{""type"": ""Weight""}', 'system', 19, true, NOW(), NOW()),
                (gen_random_uuid(), 'UOM', 'LT', 'Litro', '', '{""type"": ""Volume""}', 'system', 20, true, NOW(), NOW()),
                (gen_random_uuid(), 'UOM', 'ML', 'Mililitro', '', '{""type"": ""Volume""}', 'system', 21, true, NOW(), NOW()),
                (gen_random_uuid(), 'UOM', 'GAL', 'Galón', '', '{""type"": ""Volume""}', 'system', 22, true, NOW(), NOW()),
                (gen_random_uuid(), 'UOM', 'M3', 'Metro cúbico', '', '{""type"": ""Volume""}', 'system', 23, true, NOW(), NOW()),
                (gen_random_uuid(), 'UOM', 'M', 'Metro', '', '{""type"": ""Length""}', 'system', 24, true, NOW(), NOW()),
                (gen_random_uuid(), 'UOM', 'CM', 'Centímetro', '', '{""type"": ""Length""}', 'system', 25, true, NOW(), NOW()),
                (gen_random_uuid(), 'UOM', 'MM', 'Milímetro', '', '{""type"": ""Length""}', 'system', 26, true, NOW(), NOW()),
                (gen_random_uuid(), 'UOM', 'IN', 'Pulgada', '', '{""type"": ""Length""}', 'system', 27, true, NOW(), NOW()),
                (gen_random_uuid(), 'UOM', 'FT', 'Pie', '', '{""type"": ""Length""}', 'system', 28, true, NOW(), NOW()),
                (gen_random_uuid(), 'UOM', 'YD', 'Yarda', '', '{""type"": ""Length""}', 'system', 29, true, NOW(), NOW()),
                (gen_random_uuid(), 'UOM', 'M2', 'Metro cuadrado', '', '{""type"": ""Area""}', 'system', 30, true, NOW(), NOW())
                ON CONFLICT (""TypeCode"", ""Code"", ""TenantId"") DO NOTHING;
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DeleteData(
                table: "master_data_values",
                keyColumn: "type_code",
                keyValue: "UOM"
            );

            migrationBuilder.DeleteData(
                table: "master_data_types",
                keyColumn: "code",
                keyValue: "UOM"
            );
        }
    }
}
