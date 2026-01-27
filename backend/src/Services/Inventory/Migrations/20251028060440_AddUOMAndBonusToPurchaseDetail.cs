using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Profitzen.Inventory.Migrations
{
    /// <inheritdoc />
    public partial class AddUOMAndBonusToPurchaseDetail : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<decimal>(
                name: "Quantity",
                schema: "inventory",
                table: "PurchaseDetails",
                type: "numeric(18,6)",
                precision: 18,
                scale: 6,
                nullable: false,
                oldClrType: typeof(int),
                oldType: "integer");

            migrationBuilder.AddColumn<decimal>(
                name: "BonusQuantity",
                schema: "inventory",
                table: "PurchaseDetails",
                type: "numeric(18,6)",
                precision: 18,
                scale: 6,
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "BonusUOMId",
                schema: "inventory",
                table: "PurchaseDetails",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "UOMId",
                schema: "inventory",
                table: "PurchaseDetails",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.CreateIndex(
                name: "IX_PurchaseDetails_UOMId",
                schema: "inventory",
                table: "PurchaseDetails",
                column: "UOMId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_PurchaseDetails_UOMId",
                schema: "inventory",
                table: "PurchaseDetails");

            migrationBuilder.DropColumn(
                name: "BonusQuantity",
                schema: "inventory",
                table: "PurchaseDetails");

            migrationBuilder.DropColumn(
                name: "BonusUOMId",
                schema: "inventory",
                table: "PurchaseDetails");

            migrationBuilder.DropColumn(
                name: "UOMId",
                schema: "inventory",
                table: "PurchaseDetails");

            migrationBuilder.AlterColumn<int>(
                name: "Quantity",
                schema: "inventory",
                table: "PurchaseDetails",
                type: "integer",
                nullable: false,
                oldClrType: typeof(decimal),
                oldType: "numeric(18,6)",
                oldPrecision: 18,
                oldScale: 6);
        }
    }
}
