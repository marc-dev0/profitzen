using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Profitzen.Inventory.Migrations
{
    /// <inheritdoc />
    public partial class AddDocumentTypeToPurchases : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "DocumentType",
                schema: "inventory",
                table: "Purchases",
                type: "text",
                nullable: false,
                defaultValue: "");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "DocumentType",
                schema: "inventory",
                table: "Purchases");
        }
    }
}
