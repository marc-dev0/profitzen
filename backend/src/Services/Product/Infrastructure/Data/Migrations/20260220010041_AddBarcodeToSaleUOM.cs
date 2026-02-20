using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Profitzen.Product.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddBarcodeToSaleUOM : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Barcode",
                schema: "product",
                table: "product_sale_uoms",
                type: "character varying(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_product_sale_uoms_Barcode",
                schema: "product",
                table: "product_sale_uoms",
                column: "Barcode");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_product_sale_uoms_Barcode",
                schema: "product",
                table: "product_sale_uoms");

            migrationBuilder.DropColumn(
                name: "Barcode",
                schema: "product",
                table: "product_sale_uoms");
        }
    }
}
