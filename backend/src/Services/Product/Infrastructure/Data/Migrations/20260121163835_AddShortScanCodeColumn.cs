using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Profitzen.Product.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddShortScanCodeColumn : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ShortScanCode",
                schema: "product",
                table: "products",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ShortScanCode",
                schema: "product",
                table: "products");
        }
    }
}
