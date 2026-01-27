using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Profitzen.Inventory.Migrations
{
    /// <inheritdoc />
    public partial class AddInventoryAdjustments : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "InventoryAdjustments",
                schema: "inventory",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    StoreInventoryId = table.Column<Guid>(type: "uuid", nullable: false),
                    AdjustmentType = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Quantity = table.Column<int>(type: "integer", nullable: false),
                    IsPositive = table.Column<bool>(type: "boolean", nullable: false),
                    PreviousStock = table.Column<int>(type: "integer", nullable: false),
                    NewStock = table.Column<int>(type: "integer", nullable: false),
                    Reason = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    AdjustmentDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    DeletedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_InventoryAdjustments", x => x.Id);
                    table.ForeignKey(
                        name: "FK_InventoryAdjustments_StoreInventories_StoreInventoryId",
                        column: x => x.StoreInventoryId,
                        principalSchema: "inventory",
                        principalTable: "StoreInventories",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_InventoryAdjustments_AdjustmentDate",
                schema: "inventory",
                table: "InventoryAdjustments",
                column: "AdjustmentDate");

            migrationBuilder.CreateIndex(
                name: "IX_InventoryAdjustments_AdjustmentType",
                schema: "inventory",
                table: "InventoryAdjustments",
                column: "AdjustmentType");

            migrationBuilder.CreateIndex(
                name: "IX_InventoryAdjustments_StoreInventoryId",
                schema: "inventory",
                table: "InventoryAdjustments",
                column: "StoreInventoryId");

            migrationBuilder.CreateIndex(
                name: "IX_InventoryAdjustments_UserId",
                schema: "inventory",
                table: "InventoryAdjustments",
                column: "UserId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "InventoryAdjustments",
                schema: "inventory");
        }
    }
}
