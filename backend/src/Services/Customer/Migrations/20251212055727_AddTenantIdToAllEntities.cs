using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Profitzen.Customer.Migrations
{
    /// <inheritdoc />
    public partial class AddTenantIdToAllEntities : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "TenantId",
                schema: "customer",
                table: "Purchases",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "TenantId",
                schema: "customer",
                table: "Credits",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "TenantId",
                schema: "customer",
                table: "CreditPayments",
                type: "text",
                nullable: false,
                defaultValue: "");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "TenantId",
                schema: "customer",
                table: "Purchases");

            migrationBuilder.DropColumn(
                name: "TenantId",
                schema: "customer",
                table: "Credits");

            migrationBuilder.DropColumn(
                name: "TenantId",
                schema: "customer",
                table: "CreditPayments");
        }
    }
}
