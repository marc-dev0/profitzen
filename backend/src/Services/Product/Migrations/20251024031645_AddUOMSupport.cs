using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Profitzen.Product.Migrations
{
    /// <inheritdoc />
    public partial class AddUOMSupport : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "AllowFractional",
                schema: "product",
                table: "products",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<Guid>(
                name: "BaseUOMId",
                schema: "product",
                table: "products",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.AddColumn<Guid>(
                name: "PurchaseUOMId",
                schema: "product",
                table: "products",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.AddColumn<Guid>(
                name: "SaleUOMId",
                schema: "product",
                table: "products",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.CreateTable(
                name: "unit_of_measures",
                schema: "product",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Code = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    Name = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Type = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    DeletedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_unit_of_measures", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "product_uom_conversions",
                schema: "product",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ProductId = table.Column<Guid>(type: "uuid", nullable: false),
                    FromUOMId = table.Column<Guid>(type: "uuid", nullable: false),
                    ToUOMId = table.Column<Guid>(type: "uuid", nullable: false),
                    ConversionFactor = table.Column<decimal>(type: "numeric(18,6)", precision: 18, scale: 6, nullable: false),
                    IsDefault = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    DeletedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_product_uom_conversions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_product_uom_conversions_products_ProductId",
                        column: x => x.ProductId,
                        principalSchema: "product",
                        principalTable: "products",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_product_uom_conversions_unit_of_measures_FromUOMId",
                        column: x => x.FromUOMId,
                        principalSchema: "product",
                        principalTable: "unit_of_measures",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_product_uom_conversions_unit_of_measures_ToUOMId",
                        column: x => x.ToUOMId,
                        principalSchema: "product",
                        principalTable: "unit_of_measures",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_products_BaseUOMId",
                schema: "product",
                table: "products",
                column: "BaseUOMId");

            migrationBuilder.CreateIndex(
                name: "IX_products_PurchaseUOMId",
                schema: "product",
                table: "products",
                column: "PurchaseUOMId");

            migrationBuilder.CreateIndex(
                name: "IX_products_SaleUOMId",
                schema: "product",
                table: "products",
                column: "SaleUOMId");

            migrationBuilder.CreateIndex(
                name: "IX_product_uom_conversions_FromUOMId",
                schema: "product",
                table: "product_uom_conversions",
                column: "FromUOMId");

            migrationBuilder.CreateIndex(
                name: "IX_product_uom_conversions_ProductId",
                schema: "product",
                table: "product_uom_conversions",
                column: "ProductId");

            migrationBuilder.CreateIndex(
                name: "IX_product_uom_conversions_ProductId_FromUOMId_ToUOMId",
                schema: "product",
                table: "product_uom_conversions",
                columns: new[] { "ProductId", "FromUOMId", "ToUOMId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_product_uom_conversions_ToUOMId",
                schema: "product",
                table: "product_uom_conversions",
                column: "ToUOMId");

            migrationBuilder.CreateIndex(
                name: "IX_unit_of_measures_Code",
                schema: "product",
                table: "unit_of_measures",
                column: "Code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_unit_of_measures_Type",
                schema: "product",
                table: "unit_of_measures",
                column: "Type");

            // Seed common UOMs
            var now = DateTime.UtcNow;
            var unitUOMId = Guid.Parse("10000000-0000-0000-0000-000000000001");
            var cajaUOMId = Guid.Parse("10000000-0000-0000-0000-000000000002");
            var paqueteUOMId = Guid.Parse("10000000-0000-0000-0000-000000000003");
            var docenaUOMId = Guid.Parse("10000000-0000-0000-0000-000000000004");
            var kgUOMId = Guid.Parse("10000000-0000-0000-0000-000000000005");
            var grUOMId = Guid.Parse("10000000-0000-0000-0000-000000000006");
            var litroUOMId = Guid.Parse("10000000-0000-0000-0000-000000000007");
            var mlUOMId = Guid.Parse("10000000-0000-0000-0000-000000000008");

            migrationBuilder.InsertData(
                schema: "product",
                table: "unit_of_measures",
                columns: new[] { "Id", "Code", "Name", "Type", "IsActive", "CreatedAt", "UpdatedAt" },
                values: new object[,]
                {
                    { unitUOMId, "UND", "Unidad", "Discrete", true, now, now },
                    { cajaUOMId, "CJA", "Caja", "Discrete", true, now, now },
                    { paqueteUOMId, "PAQ", "Paquete", "Discrete", true, now, now },
                    { docenaUOMId, "DOC", "Docena", "Discrete", true, now, now },
                    { kgUOMId, "KG", "Kilogramo", "Weight", true, now, now },
                    { grUOMId, "GR", "Gramo", "Weight", true, now, now },
                    { litroUOMId, "LT", "Litro", "Volume", true, now, now },
                    { mlUOMId, "ML", "Mililitro", "Volume", true, now, now }
                });

            // Update existing products to use "Unidad" as default UOM
            migrationBuilder.Sql($@"
                UPDATE product.products
                SET ""BaseUOMId"" = '{unitUOMId}',
                    ""PurchaseUOMId"" = '{unitUOMId}',
                    ""SaleUOMId"" = '{unitUOMId}'
                WHERE ""BaseUOMId"" = '00000000-0000-0000-0000-000000000000'
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
                name: "FK_products_unit_of_measures_PurchaseUOMId",
                schema: "product",
                table: "products",
                column: "PurchaseUOMId",
                principalSchema: "product",
                principalTable: "unit_of_measures",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_products_unit_of_measures_SaleUOMId",
                schema: "product",
                table: "products",
                column: "SaleUOMId",
                principalSchema: "product",
                principalTable: "unit_of_measures",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_products_unit_of_measures_BaseUOMId",
                schema: "product",
                table: "products");

            migrationBuilder.DropForeignKey(
                name: "FK_products_unit_of_measures_PurchaseUOMId",
                schema: "product",
                table: "products");

            migrationBuilder.DropForeignKey(
                name: "FK_products_unit_of_measures_SaleUOMId",
                schema: "product",
                table: "products");

            migrationBuilder.DropTable(
                name: "product_uom_conversions",
                schema: "product");

            migrationBuilder.DropTable(
                name: "unit_of_measures",
                schema: "product");

            migrationBuilder.DropIndex(
                name: "IX_products_BaseUOMId",
                schema: "product",
                table: "products");

            migrationBuilder.DropIndex(
                name: "IX_products_PurchaseUOMId",
                schema: "product",
                table: "products");

            migrationBuilder.DropIndex(
                name: "IX_products_SaleUOMId",
                schema: "product",
                table: "products");

            migrationBuilder.DropColumn(
                name: "AllowFractional",
                schema: "product",
                table: "products");

            migrationBuilder.DropColumn(
                name: "BaseUOMId",
                schema: "product",
                table: "products");

            migrationBuilder.DropColumn(
                name: "PurchaseUOMId",
                schema: "product",
                table: "products");

            migrationBuilder.DropColumn(
                name: "SaleUOMId",
                schema: "product",
                table: "products");
        }
    }
}
