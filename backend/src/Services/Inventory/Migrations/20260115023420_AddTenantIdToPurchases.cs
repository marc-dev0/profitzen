using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Profitzen.Inventory.Migrations
{
    /// <inheritdoc />
    public partial class AddTenantIdToPurchases : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "TenantId",
                schema: "inventory",
                table: "StoreInventories",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "TenantId",
                schema: "inventory",
                table: "Purchases",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "TenantId",
                schema: "inventory",
                table: "PurchaseDetails",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "TenantId",
                schema: "inventory",
                table: "InventoryMovements",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "TenantId",
                schema: "inventory",
                table: "InventoryAdjustments",
                type: "text",
                nullable: false,
                defaultValue: "");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "TenantId",
                schema: "inventory",
                table: "StoreInventories");

            migrationBuilder.DropColumn(
                name: "TenantId",
                schema: "inventory",
                table: "Purchases");

            migrationBuilder.DropColumn(
                name: "TenantId",
                schema: "inventory",
                table: "PurchaseDetails");

            migrationBuilder.DropColumn(
                name: "TenantId",
                schema: "inventory",
                table: "InventoryMovements");

            migrationBuilder.DropColumn(
                name: "TenantId",
                schema: "inventory",
                table: "InventoryAdjustments");
        }
    }
}
