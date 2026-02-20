using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Profitzen.Product.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddUOMSortOrder : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "SortOrder",
                schema: "product",
                table: "product_sale_uoms",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "SortOrder",
                schema: "product",
                table: "product_purchase_uoms",
                type: "integer",
                nullable: false,
                defaultValue: 0);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "SortOrder",
                schema: "product",
                table: "product_sale_uoms");

            migrationBuilder.DropColumn(
                name: "SortOrder",
                schema: "product",
                table: "product_purchase_uoms");
        }
    }
}
