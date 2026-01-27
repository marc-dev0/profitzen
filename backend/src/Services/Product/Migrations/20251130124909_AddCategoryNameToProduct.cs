using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Profitzen.Product.Migrations
{
    /// <inheritdoc />
    public partial class AddCategoryNameToProduct : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "CategoryName",
                schema: "product",
                table: "products",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "CategoryName",
                schema: "product",
                table: "products");
        }
    }
}
