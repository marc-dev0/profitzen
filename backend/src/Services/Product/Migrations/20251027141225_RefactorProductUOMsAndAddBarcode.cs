using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Profitzen.Product.Migrations
{
    /// <inheritdoc />
    public partial class RefactorProductUOMsAndAddBarcode : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_products_unit_of_measures_PurchaseUOMId",
                schema: "product",
                table: "products");

            migrationBuilder.DropForeignKey(
                name: "FK_products_unit_of_measures_SaleUOMId",
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
                name: "PurchaseUOMId",
                schema: "product",
                table: "products");

            migrationBuilder.DropColumn(
                name: "SaleUOMId",
                schema: "product",
                table: "products");

            migrationBuilder.AddColumn<string>(
                name: "Barcode",
                schema: "product",
                table: "products",
                type: "character varying(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.CreateTable(
                name: "product_purchase_uoms",
                schema: "product",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ProductId = table.Column<Guid>(type: "uuid", nullable: false),
                    UOMId = table.Column<Guid>(type: "uuid", nullable: false),
                    ConversionToBase = table.Column<decimal>(type: "numeric(18,6)", precision: 18, scale: 6, nullable: false),
                    IsDefault = table.Column<bool>(type: "boolean", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    DeletedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_product_purchase_uoms", x => x.Id);
                    table.ForeignKey(
                        name: "FK_product_purchase_uoms_products_ProductId",
                        column: x => x.ProductId,
                        principalSchema: "product",
                        principalTable: "products",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_product_purchase_uoms_unit_of_measures_UOMId",
                        column: x => x.UOMId,
                        principalSchema: "product",
                        principalTable: "unit_of_measures",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "product_sale_uoms",
                schema: "product",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ProductId = table.Column<Guid>(type: "uuid", nullable: false),
                    UOMId = table.Column<Guid>(type: "uuid", nullable: false),
                    ConversionToBase = table.Column<decimal>(type: "numeric(18,6)", precision: 18, scale: 6, nullable: false),
                    Price = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    IsDefault = table.Column<bool>(type: "boolean", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    DeletedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_product_sale_uoms", x => x.Id);
                    table.ForeignKey(
                        name: "FK_product_sale_uoms_products_ProductId",
                        column: x => x.ProductId,
                        principalSchema: "product",
                        principalTable: "products",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_product_sale_uoms_unit_of_measures_UOMId",
                        column: x => x.UOMId,
                        principalSchema: "product",
                        principalTable: "unit_of_measures",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_products_Barcode",
                schema: "product",
                table: "products",
                column: "Barcode");

            migrationBuilder.CreateIndex(
                name: "IX_product_purchase_uoms_IsActive",
                schema: "product",
                table: "product_purchase_uoms",
                column: "IsActive");

            migrationBuilder.CreateIndex(
                name: "IX_product_purchase_uoms_IsDefault",
                schema: "product",
                table: "product_purchase_uoms",
                column: "IsDefault");

            migrationBuilder.CreateIndex(
                name: "IX_product_purchase_uoms_ProductId",
                schema: "product",
                table: "product_purchase_uoms",
                column: "ProductId");

            migrationBuilder.CreateIndex(
                name: "IX_product_purchase_uoms_ProductId_UOMId",
                schema: "product",
                table: "product_purchase_uoms",
                columns: new[] { "ProductId", "UOMId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_product_purchase_uoms_UOMId",
                schema: "product",
                table: "product_purchase_uoms",
                column: "UOMId");

            migrationBuilder.CreateIndex(
                name: "IX_product_sale_uoms_IsActive",
                schema: "product",
                table: "product_sale_uoms",
                column: "IsActive");

            migrationBuilder.CreateIndex(
                name: "IX_product_sale_uoms_IsDefault",
                schema: "product",
                table: "product_sale_uoms",
                column: "IsDefault");

            migrationBuilder.CreateIndex(
                name: "IX_product_sale_uoms_ProductId",
                schema: "product",
                table: "product_sale_uoms",
                column: "ProductId");

            migrationBuilder.CreateIndex(
                name: "IX_product_sale_uoms_ProductId_UOMId",
                schema: "product",
                table: "product_sale_uoms",
                columns: new[] { "ProductId", "UOMId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_product_sale_uoms_UOMId",
                schema: "product",
                table: "product_sale_uoms",
                column: "UOMId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "product_purchase_uoms",
                schema: "product");

            migrationBuilder.DropTable(
                name: "product_sale_uoms",
                schema: "product");

            migrationBuilder.DropIndex(
                name: "IX_products_Barcode",
                schema: "product",
                table: "products");

            migrationBuilder.DropColumn(
                name: "Barcode",
                schema: "product",
                table: "products");

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
    }
}
