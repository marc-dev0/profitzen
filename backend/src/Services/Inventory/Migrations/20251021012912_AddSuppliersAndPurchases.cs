using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Profitzen.Inventory.Migrations
{
    /// <inheritdoc />
    public partial class AddSuppliersAndPurchases : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Products",
                schema: "inventory");

            migrationBuilder.DropTable(
                name: "Categories",
                schema: "inventory");

            migrationBuilder.CreateTable(
                name: "Suppliers",
                schema: "inventory",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Code = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    ContactName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    Phone = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    Email = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    Address = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    TaxId = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    TenantId = table.Column<string>(type: "character varying(450)", maxLength: 450, nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    DeletedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Suppliers", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Purchases",
                schema: "inventory",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    PurchaseNumber = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    SupplierId = table.Column<Guid>(type: "uuid", nullable: false),
                    StoreId = table.Column<Guid>(type: "uuid", nullable: false),
                    PurchaseDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    TotalAmount = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    InvoiceNumber = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    Notes = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    CreatedByUserId = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    DeletedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Purchases", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Purchases_Suppliers_SupplierId",
                        column: x => x.SupplierId,
                        principalSchema: "inventory",
                        principalTable: "Suppliers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "PurchaseDetails",
                schema: "inventory",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    PurchaseId = table.Column<Guid>(type: "uuid", nullable: false),
                    ProductId = table.Column<Guid>(type: "uuid", nullable: false),
                    Quantity = table.Column<int>(type: "integer", nullable: false),
                    UnitPrice = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    Subtotal = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    DeletedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PurchaseDetails", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PurchaseDetails_Purchases_PurchaseId",
                        column: x => x.PurchaseId,
                        principalSchema: "inventory",
                        principalTable: "Purchases",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_PurchaseDetails_ProductId",
                schema: "inventory",
                table: "PurchaseDetails",
                column: "ProductId");

            migrationBuilder.CreateIndex(
                name: "IX_PurchaseDetails_PurchaseId",
                schema: "inventory",
                table: "PurchaseDetails",
                column: "PurchaseId");

            migrationBuilder.CreateIndex(
                name: "IX_Purchases_PurchaseDate",
                schema: "inventory",
                table: "Purchases",
                column: "PurchaseDate");

            migrationBuilder.CreateIndex(
                name: "IX_Purchases_PurchaseNumber",
                schema: "inventory",
                table: "Purchases",
                column: "PurchaseNumber",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Purchases_StoreId",
                schema: "inventory",
                table: "Purchases",
                column: "StoreId");

            migrationBuilder.CreateIndex(
                name: "IX_Purchases_SupplierId",
                schema: "inventory",
                table: "Purchases",
                column: "SupplierId");

            migrationBuilder.CreateIndex(
                name: "IX_Suppliers_Code_TenantId",
                schema: "inventory",
                table: "Suppliers",
                columns: new[] { "Code", "TenantId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Suppliers_IsActive",
                schema: "inventory",
                table: "Suppliers",
                column: "IsActive");

            migrationBuilder.CreateIndex(
                name: "IX_Suppliers_TenantId",
                schema: "inventory",
                table: "Suppliers",
                column: "TenantId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "PurchaseDetails",
                schema: "inventory");

            migrationBuilder.DropTable(
                name: "Purchases",
                schema: "inventory");

            migrationBuilder.DropTable(
                name: "Suppliers",
                schema: "inventory");

            migrationBuilder.CreateTable(
                name: "Categories",
                schema: "inventory",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    DeletedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    Description = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    Name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    TenantId = table.Column<string>(type: "character varying(450)", maxLength: 450, nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Categories", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Products",
                schema: "inventory",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    CategoryId = table.Column<Guid>(type: "uuid", nullable: false),
                    Code = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    DeletedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    Description = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    ImageUrl = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    Name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    PurchasePrice = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    SalePrice = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    TenantId = table.Column<string>(type: "character varying(450)", maxLength: 450, nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    WholesalePrice = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Products", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Products_Categories_CategoryId",
                        column: x => x.CategoryId,
                        principalSchema: "inventory",
                        principalTable: "Categories",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

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
                name: "IX_Products_CategoryId",
                schema: "inventory",
                table: "Products",
                column: "CategoryId");

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

            migrationBuilder.AddForeignKey(
                name: "FK_StoreInventories_Products_ProductId",
                schema: "inventory",
                table: "StoreInventories",
                column: "ProductId",
                principalSchema: "inventory",
                principalTable: "Products",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
