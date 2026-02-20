using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Profitzen.Inventory.Migrations
{
    /// <inheritdoc />
    public partial class AddInventoryBatches : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "InventoryBatches",
                schema: "inventory",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ProductId = table.Column<Guid>(type: "uuid", nullable: false),
                    StoreId = table.Column<Guid>(type: "uuid", nullable: false),
                    BatchNumber = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    ExpirationDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    Quantity = table.Column<decimal>(type: "numeric(18,6)", precision: 18, scale: 6, nullable: false),
                    RemainingQuantity = table.Column<decimal>(type: "numeric(18,6)", precision: 18, scale: 6, nullable: false),
                    ReceivedDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    SupplierId = table.Column<Guid>(type: "uuid", nullable: true),
                    UnitCost = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_InventoryBatches", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_InventoryBatches_ExpirationDate",
                schema: "inventory",
                table: "InventoryBatches",
                column: "ExpirationDate");

            migrationBuilder.CreateIndex(
                name: "IX_InventoryBatches_IsActive",
                schema: "inventory",
                table: "InventoryBatches",
                column: "IsActive");

            migrationBuilder.CreateIndex(
                name: "IX_InventoryBatches_ProductId",
                schema: "inventory",
                table: "InventoryBatches",
                column: "ProductId");

            migrationBuilder.CreateIndex(
                name: "IX_InventoryBatches_ProductId_StoreId_IsActive_RemainingQuanti~",
                schema: "inventory",
                table: "InventoryBatches",
                columns: new[] { "ProductId", "StoreId", "IsActive", "RemainingQuantity" });

            migrationBuilder.CreateIndex(
                name: "IX_InventoryBatches_StoreId",
                schema: "inventory",
                table: "InventoryBatches",
                column: "StoreId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "InventoryBatches",
                schema: "inventory");
        }
    }
}
