using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Profitzen.Sales.Migrations
{
    /// <inheritdoc />
    public partial class AddTenantIdToAllEntities : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "TenantId",
                schema: "sales",
                table: "Sales",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "TenantId",
                schema: "sales",
                table: "SaleItems",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "TenantId",
                schema: "sales",
                table: "Payments",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "TenantId",
                schema: "sales",
                table: "Customers",
                type: "text",
                nullable: false,
                defaultValue: "");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "TenantId",
                schema: "sales",
                table: "Sales");

            migrationBuilder.DropColumn(
                name: "TenantId",
                schema: "sales",
                table: "SaleItems");

            migrationBuilder.DropColumn(
                name: "TenantId",
                schema: "sales",
                table: "Payments");

            migrationBuilder.DropColumn(
                name: "TenantId",
                schema: "sales",
                table: "Customers");
        }
    }
}
