using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Profitzen.Sales.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.EnsureSchema(
                name: "sales");

            migrationBuilder.CreateTable(
                name: "Customers",
                schema: "sales",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    DocumentNumber = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    Name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Email = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    Phone = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    Address = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: true),
                    StoreId = table.Column<Guid>(type: "uuid", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreditLimit = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    CurrentDebt = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    DeletedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Customers", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Sales",
                schema: "sales",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    SaleNumber = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    StoreId = table.Column<Guid>(type: "uuid", nullable: false),
                    CashierId = table.Column<Guid>(type: "uuid", nullable: false),
                    CustomerId = table.Column<Guid>(type: "uuid", nullable: true),
                    SaleDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    Subtotal = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    DiscountAmount = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    TaxAmount = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    Total = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    Notes = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    DeletedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Sales", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Sales_Customers_CustomerId",
                        column: x => x.CustomerId,
                        principalSchema: "sales",
                        principalTable: "Customers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "Payments",
                schema: "sales",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    SaleId = table.Column<Guid>(type: "uuid", nullable: false),
                    Method = table.Column<int>(type: "integer", nullable: false),
                    Amount = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    Reference = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    PaymentDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    DeletedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Payments", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Payments_Sales_SaleId",
                        column: x => x.SaleId,
                        principalSchema: "sales",
                        principalTable: "Sales",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "SaleItems",
                schema: "sales",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    SaleId = table.Column<Guid>(type: "uuid", nullable: false),
                    ProductId = table.Column<Guid>(type: "uuid", nullable: false),
                    ProductName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    ProductCode = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Quantity = table.Column<int>(type: "integer", nullable: false),
                    UnitPrice = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    DiscountAmount = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    Subtotal = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    DeletedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SaleItems", x => x.Id);
                    table.ForeignKey(
                        name: "FK_SaleItems_Sales_SaleId",
                        column: x => x.SaleId,
                        principalSchema: "sales",
                        principalTable: "Sales",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Customers_DocumentNumber_StoreId",
                schema: "sales",
                table: "Customers",
                columns: new[] { "DocumentNumber", "StoreId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Customers_Name",
                schema: "sales",
                table: "Customers",
                column: "Name");

            migrationBuilder.CreateIndex(
                name: "IX_Customers_StoreId",
                schema: "sales",
                table: "Customers",
                column: "StoreId");

            migrationBuilder.CreateIndex(
                name: "IX_Payments_Method",
                schema: "sales",
                table: "Payments",
                column: "Method");

            migrationBuilder.CreateIndex(
                name: "IX_Payments_PaymentDate",
                schema: "sales",
                table: "Payments",
                column: "PaymentDate");

            migrationBuilder.CreateIndex(
                name: "IX_Payments_SaleId",
                schema: "sales",
                table: "Payments",
                column: "SaleId");

            migrationBuilder.CreateIndex(
                name: "IX_SaleItems_ProductId",
                schema: "sales",
                table: "SaleItems",
                column: "ProductId");

            migrationBuilder.CreateIndex(
                name: "IX_SaleItems_SaleId",
                schema: "sales",
                table: "SaleItems",
                column: "SaleId");

            migrationBuilder.CreateIndex(
                name: "IX_Sales_CustomerId",
                schema: "sales",
                table: "Sales",
                column: "CustomerId");

            migrationBuilder.CreateIndex(
                name: "IX_Sales_SaleDate",
                schema: "sales",
                table: "Sales",
                column: "SaleDate");

            migrationBuilder.CreateIndex(
                name: "IX_Sales_SaleNumber",
                schema: "sales",
                table: "Sales",
                column: "SaleNumber",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Sales_Status",
                schema: "sales",
                table: "Sales",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_Sales_StoreId",
                schema: "sales",
                table: "Sales",
                column: "StoreId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Payments",
                schema: "sales");

            migrationBuilder.DropTable(
                name: "SaleItems",
                schema: "sales");

            migrationBuilder.DropTable(
                name: "Sales",
                schema: "sales");

            migrationBuilder.DropTable(
                name: "Customers",
                schema: "sales");
        }
    }
}
