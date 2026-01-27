using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Profitzen.Product.Migrations
{
    /// <inheritdoc />
    public partial class MigrateToMasterDataUOMs : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
                CREATE TEMP TABLE uom_id_mapping (
                    old_id UUID,
                    new_id UUID,
                    code VARCHAR(10)
                );

                INSERT INTO uom_id_mapping (old_id, code, new_id)
                SELECT
                    old_uom.""Id"" as old_id,
                    old_uom.""Code"",
                    new_uom.""Id"" as new_id
                FROM product.unit_of_measures old_uom
                LEFT JOIN master_data.""MasterDataValues"" new_uom ON new_uom.""Code"" = old_uom.""Code"" AND new_uom.""TypeCode"" = 'UOM';
            ");

            migrationBuilder.DropForeignKey(
                name: "FK_products_unit_of_measures_BaseUOMId",
                schema: "product",
                table: "products");

            migrationBuilder.DropForeignKey(
                name: "FK_product_uom_conversions_unit_of_measures_FromUOMId",
                schema: "product",
                table: "product_uom_conversions");

            migrationBuilder.DropForeignKey(
                name: "FK_product_uom_conversions_unit_of_measures_ToUOMId",
                schema: "product",
                table: "product_uom_conversions");

            migrationBuilder.DropForeignKey(
                name: "FK_product_purchase_uoms_unit_of_measures_UOMId",
                schema: "product",
                table: "product_purchase_uoms");

            migrationBuilder.DropForeignKey(
                name: "FK_product_sale_uoms_unit_of_measures_UOMId",
                schema: "product",
                table: "product_sale_uoms");

            migrationBuilder.Sql(@"
                UPDATE product.products p
                SET ""BaseUOMId"" = m.new_id
                FROM uom_id_mapping m
                WHERE p.""BaseUOMId"" = m.old_id;

                UPDATE product.product_uom_conversions c
                SET ""FromUOMId"" = m.new_id
                FROM uom_id_mapping m
                WHERE c.""FromUOMId"" = m.old_id;

                UPDATE product.product_uom_conversions c
                SET ""ToUOMId"" = m.new_id
                FROM uom_id_mapping m
                WHERE c.""ToUOMId"" = m.old_id;

                UPDATE product.product_purchase_uoms pu
                SET ""UOMId"" = m.new_id
                FROM uom_id_mapping m
                WHERE pu.""UOMId"" = m.old_id;

                UPDATE product.product_sale_uoms su
                SET ""UOMId"" = m.new_id
                FROM uom_id_mapping m
                WHERE su.""UOMId"" = m.old_id;
            ");

            migrationBuilder.DropIndex(
                name: "IX_products_BaseUOMId",
                schema: "product",
                table: "products");

            migrationBuilder.DropIndex(
                name: "IX_product_uom_conversions_FromUOMId",
                schema: "product",
                table: "product_uom_conversions");

            migrationBuilder.DropIndex(
                name: "IX_product_uom_conversions_ToUOMId",
                schema: "product",
                table: "product_uom_conversions");

            migrationBuilder.DropIndex(
                name: "IX_product_purchase_uoms_UOMId",
                schema: "product",
                table: "product_purchase_uoms");

            migrationBuilder.DropIndex(
                name: "IX_product_sale_uoms_UOMId",
                schema: "product",
                table: "product_sale_uoms");

            migrationBuilder.DropTable(
                name: "unit_of_measures",
                schema: "product");

            migrationBuilder.CreateIndex(
                name: "IX_products_BaseUOMId",
                schema: "product",
                table: "products",
                column: "BaseUOMId");

            migrationBuilder.CreateIndex(
                name: "IX_product_uom_conversions_FromUOMId",
                schema: "product",
                table: "product_uom_conversions",
                column: "FromUOMId");

            migrationBuilder.CreateIndex(
                name: "IX_product_uom_conversions_ToUOMId",
                schema: "product",
                table: "product_uom_conversions",
                column: "ToUOMId");

            migrationBuilder.CreateIndex(
                name: "IX_product_purchase_uoms_UOMId",
                schema: "product",
                table: "product_purchase_uoms",
                column: "UOMId");

            migrationBuilder.CreateIndex(
                name: "IX_product_sale_uoms_UOMId",
                schema: "product",
                table: "product_sale_uoms",
                column: "UOMId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
                CREATE TABLE product.unit_of_measures (
                    ""Id"" UUID PRIMARY KEY,
                    ""Code"" VARCHAR(10) NOT NULL UNIQUE,
                    ""Name"" VARCHAR(50) NOT NULL,
                    ""Type"" VARCHAR(20) NOT NULL,
                    ""IsActive"" BOOLEAN NOT NULL DEFAULT true,
                    ""CreatedAt"" TIMESTAMP NOT NULL DEFAULT NOW(),
                    ""UpdatedAt"" TIMESTAMP NOT NULL DEFAULT NOW(),
                    ""DeletedAt"" TIMESTAMP NULL
                );

                INSERT INTO product.unit_of_measures (""Id"", ""Code"", ""Name"", ""Type"", ""IsActive"", ""CreatedAt"", ""UpdatedAt"")
                VALUES
                ('10000000-0000-0000-0000-000000000001', 'UND', 'Unidad', 'Discrete', true, NOW(), NOW()),
                ('10000000-0000-0000-0000-000000000002', 'CJA', 'Caja', 'Discrete', true, NOW(), NOW()),
                ('10000000-0000-0000-0000-000000000003', 'PAQ', 'Paquete', 'Discrete', true, NOW(), NOW()),
                ('10000000-0000-0000-0000-000000000004', 'DOC', 'Docena', 'Discrete', true, NOW(), NOW()),
                ('10000000-0000-0000-0000-000000000005', 'KG', 'Kilogramo', 'Weight', true, NOW(), NOW()),
                ('10000000-0000-0000-0000-000000000006', 'GR', 'Gramo', 'Weight', true, NOW(), NOW()),
                ('10000000-0000-0000-0000-000000000007', 'LT', 'Litro', 'Volume', true, NOW(), NOW()),
                ('10000000-0000-0000-0000-000000000008', 'ML', 'Mililitro', 'Volume', true, NOW(), NOW());
            ");

            migrationBuilder.AddForeignKey(
                name: "FK_products_unit_of_measures_BaseUOMId",
                schema: "product",
                table: "products",
                column: "BaseUOMId",
                principalSchema: "product",
                principalTable: "unit_of_measures",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_product_uom_conversions_unit_of_measures_FromUOMId",
                schema: "product",
                table: "product_uom_conversions",
                column: "FromUOMId",
                principalSchema: "product",
                principalTable: "unit_of_measures",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_product_uom_conversions_unit_of_measures_ToUOMId",
                schema: "product",
                table: "product_uom_conversions",
                column: "ToUOMId",
                principalSchema: "product",
                principalTable: "unit_of_measures",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_product_purchase_uoms_unit_of_measures_UOMId",
                schema: "product",
                table: "product_purchase_uoms",
                column: "UOMId",
                principalSchema: "product",
                principalTable: "unit_of_measures",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_product_sale_uoms_unit_of_measures_UOMId",
                schema: "product",
                table: "product_sale_uoms",
                column: "UOMId",
                principalSchema: "product",
                principalTable: "unit_of_measures",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }
    }
}
