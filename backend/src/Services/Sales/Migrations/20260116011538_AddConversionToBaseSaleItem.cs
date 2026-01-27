using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Profitzen.Sales.Migrations
{
    /// <inheritdoc />
    public partial class AddConversionToBaseSaleItem : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "ConversionToBase",
                schema: "sales",
                table: "SaleItems",
                type: "numeric(18,6)",
                precision: 18,
                scale: 6,
                nullable: false,
                defaultValue: 1m);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ConversionToBase",
                schema: "sales",
                table: "SaleItems");
        }
    }
}
