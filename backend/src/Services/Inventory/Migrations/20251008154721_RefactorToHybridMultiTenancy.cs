using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Profitzen.Inventory.Migrations
{
    /// <inheritdoc />
    public partial class RefactorToHybridMultiTenancy : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_InventoryMovements_Products_ProductId",
                schema: "inventory",
                table: "InventoryMovements");

            migrationBuilder.DropIndex(
                name: "IX_Products_Code_StoreId",
                schema: "inventory",
                table: "Products");

            migrationBuilder.DropIndex(
                name: "IX_Products_StoreId",
                schema: "inventory",
                table: "Products");

            migrationBuilder.DropIndex(
                name: "IX_Categories_Name_StoreId",
                schema: "inventory",
                table: "Categories");

            migrationBuilder.DropIndex(
                name: "IX_Categories_StoreId",
                schema: "inventory",
                table: "Categories");

            migrationBuilder.DropColumn(
                name: "CurrentStock",
                schema: "inventory",
                table: "Products");

            migrationBuilder.DropColumn(
                name: "MinimumStock",
                schema: "inventory",
                table: "Products");

            migrationBuilder.DropColumn(
                name: "StoreId",
                schema: "inventory",
                table: "Products");

            migrationBuilder.DropColumn(
                name: "StoreId",
                schema: "inventory",
                table: "Categories");

            migrationBuilder.RenameColumn(
                name: "ProductId",
                schema: "inventory",
                table: "InventoryMovements",
                newName: "StoreInventoryId");

            migrationBuilder.RenameIndex(
                name: "IX_InventoryMovements_ProductId",
                schema: "inventory",
                table: "InventoryMovements",
                newName: "IX_InventoryMovements_StoreInventoryId");

            migrationBuilder.AddColumn<string>(
                name: "TenantId",
                schema: "inventory",
                table: "Products",
                type: "character varying(450)",
                maxLength: 450,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "TenantId",
                schema: "inventory",
                table: "Categories",
                type: "character varying(450)",
                maxLength: 450,
                nullable: false,
                defaultValue: "");

            migrationBuilder.CreateTable(
                name: "StoreInventories",
                schema: "inventory",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ProductId = table.Column<Guid>(type: "uuid", nullable: false),
                    StoreId = table.Column<Guid>(type: "uuid", nullable: false),
                    CurrentStock = table.Column<int>(type: "integer", nullable: false),
                    MinimumStock = table.Column<int>(type: "integer", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    DeletedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_StoreInventories", x => x.Id);
                    table.ForeignKey(
                        name: "FK_StoreInventories_Products_ProductId",
                        column: x => x.ProductId,
                        principalSchema: "inventory",
                        principalTable: "Products",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Products_Code_TenantId",
                schema: "inventory",
                table: "Products",
                columns: new[] { "Code", "TenantId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Products_TenantId",
                schema: "inventory",
                table: "Products",
                column: "TenantId");

            migrationBuilder.CreateIndex(
                name: "IX_Categories_Name_TenantId",
                schema: "inventory",
                table: "Categories",
                columns: new[] { "Name", "TenantId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Categories_TenantId",
                schema: "inventory",
                table: "Categories",
                column: "TenantId");

            migrationBuilder.CreateIndex(
                name: "IX_StoreInventories_ProductId_StoreId",
                schema: "inventory",
                table: "StoreInventories",
                columns: new[] { "ProductId", "StoreId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_StoreInventories_StoreId",
                schema: "inventory",
                table: "StoreInventories",
                column: "StoreId");

            migrationBuilder.AddForeignKey(
                name: "FK_InventoryMovements_StoreInventories_StoreInventoryId",
                schema: "inventory",
                table: "InventoryMovements",
                column: "StoreInventoryId",
                principalSchema: "inventory",
                principalTable: "StoreInventories",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_InventoryMovements_StoreInventories_StoreInventoryId",
                schema: "inventory",
                table: "InventoryMovements");

            migrationBuilder.DropTable(
                name: "StoreInventories",
                schema: "inventory");

            migrationBuilder.DropIndex(
                name: "IX_Products_Code_TenantId",
                schema: "inventory",
                table: "Products");

            migrationBuilder.DropIndex(
                name: "IX_Products_TenantId",
                schema: "inventory",
                table: "Products");

            migrationBuilder.DropIndex(
                name: "IX_Categories_Name_TenantId",
                schema: "inventory",
                table: "Categories");

            migrationBuilder.DropIndex(
                name: "IX_Categories_TenantId",
                schema: "inventory",
                table: "Categories");

            migrationBuilder.DropColumn(
                name: "TenantId",
                schema: "inventory",
                table: "Products");

            migrationBuilder.DropColumn(
                name: "TenantId",
                schema: "inventory",
                table: "Categories");

            migrationBuilder.RenameColumn(
                name: "StoreInventoryId",
                schema: "inventory",
                table: "InventoryMovements",
                newName: "ProductId");

            migrationBuilder.RenameIndex(
                name: "IX_InventoryMovements_StoreInventoryId",
                schema: "inventory",
                table: "InventoryMovements",
                newName: "IX_InventoryMovements_ProductId");

            migrationBuilder.AddColumn<int>(
                name: "CurrentStock",
                schema: "inventory",
                table: "Products",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "MinimumStock",
                schema: "inventory",
                table: "Products",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<Guid>(
                name: "StoreId",
                schema: "inventory",
                table: "Products",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.AddColumn<Guid>(
                name: "StoreId",
                schema: "inventory",
                table: "Categories",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.CreateIndex(
                name: "IX_Products_Code_StoreId",
                schema: "inventory",
                table: "Products",
                columns: new[] { "Code", "StoreId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Products_StoreId",
                schema: "inventory",
                table: "Products",
                column: "StoreId");

            migrationBuilder.CreateIndex(
                name: "IX_Categories_Name_StoreId",
                schema: "inventory",
                table: "Categories",
                columns: new[] { "Name", "StoreId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Categories_StoreId",
                schema: "inventory",
                table: "Categories",
                column: "StoreId");

            migrationBuilder.AddForeignKey(
                name: "FK_InventoryMovements_Products_ProductId",
                schema: "inventory",
                table: "InventoryMovements",
                column: "ProductId",
                principalSchema: "inventory",
                principalTable: "Products",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
