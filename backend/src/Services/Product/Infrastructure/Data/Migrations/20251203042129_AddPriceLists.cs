using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Profitzen.Product.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddPriceLists : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "price_lists",
                schema: "product",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Code = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Description = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    IsDefault = table.Column<bool>(type: "boolean", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    TenantId = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    DeletedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_price_lists", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "product_sale_uom_prices",
                schema: "product",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ProductSaleUOMId = table.Column<Guid>(type: "uuid", nullable: false),
                    PriceListId = table.Column<Guid>(type: "uuid", nullable: false),
                    Price = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    DeletedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_product_sale_uom_prices", x => x.Id);
                    table.ForeignKey(
                        name: "FK_product_sale_uom_prices_price_lists_PriceListId",
                        column: x => x.PriceListId,
                        principalSchema: "product",
                        principalTable: "price_lists",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_product_sale_uom_prices_product_sale_uoms_ProductSaleUOMId",
                        column: x => x.ProductSaleUOMId,
                        principalSchema: "product",
                        principalTable: "product_sale_uoms",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_price_lists_Code_TenantId",
                schema: "product",
                table: "price_lists",
                columns: new[] { "Code", "TenantId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_price_lists_IsActive",
                schema: "product",
                table: "price_lists",
                column: "IsActive");

            migrationBuilder.CreateIndex(
                name: "IX_price_lists_IsDefault",
                schema: "product",
                table: "price_lists",
                column: "IsDefault");

            migrationBuilder.CreateIndex(
                name: "IX_price_lists_TenantId",
                schema: "product",
                table: "price_lists",
                column: "TenantId");

            migrationBuilder.CreateIndex(
                name: "IX_product_sale_uom_prices_PriceListId",
                schema: "product",
                table: "product_sale_uom_prices",
                column: "PriceListId");

            migrationBuilder.CreateIndex(
                name: "IX_product_sale_uom_prices_ProductSaleUOMId",
                schema: "product",
                table: "product_sale_uom_prices",
                column: "ProductSaleUOMId");

            migrationBuilder.CreateIndex(
                name: "IX_product_sale_uom_prices_ProductSaleUOMId_PriceListId",
                schema: "product",
                table: "product_sale_uom_prices",
                columns: new[] { "ProductSaleUOMId", "PriceListId" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "product_sale_uom_prices",
                schema: "product");

            migrationBuilder.DropTable(
                name: "price_lists",
                schema: "product");
        }
    }
}
