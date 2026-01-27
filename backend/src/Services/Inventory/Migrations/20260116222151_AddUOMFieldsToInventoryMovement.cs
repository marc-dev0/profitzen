using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Profitzen.Inventory.Migrations
{
    /// <inheritdoc />
    public partial class AddUOMFieldsToInventoryMovement : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "ConversionFactor",
                schema: "inventory",
                table: "InventoryMovements",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "OriginalQuantity",
                schema: "inventory",
                table: "InventoryMovements",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "UOMCode",
                schema: "inventory",
                table: "InventoryMovements",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "UOMId",
                schema: "inventory",
                table: "InventoryMovements",
                type: "uuid",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ConversionFactor",
                schema: "inventory",
                table: "InventoryMovements");

            migrationBuilder.DropColumn(
                name: "OriginalQuantity",
                schema: "inventory",
                table: "InventoryMovements");

            migrationBuilder.DropColumn(
                name: "UOMCode",
                schema: "inventory",
                table: "InventoryMovements");

            migrationBuilder.DropColumn(
                name: "UOMId",
                schema: "inventory",
                table: "InventoryMovements");
        }
    }
}
