using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Profitzen.Sales.Migrations
{
    /// <inheritdoc />
    public partial class UpdateSalesTableForDocuments : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "DocumentNumber",
                schema: "sales",
                table: "Sales",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "DocumentSeries",
                schema: "sales",
                table: "Sales",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "DocumentType",
                schema: "sales",
                table: "Sales",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "DocumentNumber",
                schema: "sales",
                table: "Sales");

            migrationBuilder.DropColumn(
                name: "DocumentSeries",
                schema: "sales",
                table: "Sales");

            migrationBuilder.DropColumn(
                name: "DocumentType",
                schema: "sales",
                table: "Sales");
        }
    }
}
