using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Profitzen.Sales.Migrations
{
    /// <inheritdoc />
    public partial class SaleItemQuantityToDecimal : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<decimal>(
                name: "Quantity",
                schema: "sales",
                table: "SaleItems",
                type: "numeric(18,6)",
                precision: 18,
                scale: 6,
                nullable: false,
                oldClrType: typeof(int),
                oldType: "integer");

            migrationBuilder.AlterColumn<decimal>(
                name: "Amount",
                schema: "sales",
                table: "CashMovements",
                type: "numeric",
                nullable: false,
                oldClrType: typeof(decimal),
                oldType: "numeric(18,2)",
                oldPrecision: 18,
                oldScale: 2);

            migrationBuilder.CreateTable(
                name: "HardwareDiagnostics",
                schema: "sales",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    TenantId = table.Column<string>(type: "text", nullable: false),
                    StoreId = table.Column<Guid>(type: "uuid", nullable: false),
                    DeviceName = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    IsConnected = table.Column<bool>(type: "boolean", nullable: false),
                    ErrorMessage = table.Column<string>(type: "text", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_HardwareDiagnostics", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_HardwareDiagnostics_CreatedAt",
                schema: "sales",
                table: "HardwareDiagnostics",
                column: "CreatedAt");

            migrationBuilder.CreateIndex(
                name: "IX_HardwareDiagnostics_StoreId",
                schema: "sales",
                table: "HardwareDiagnostics",
                column: "StoreId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "HardwareDiagnostics",
                schema: "sales");

            migrationBuilder.AlterColumn<int>(
                name: "Quantity",
                schema: "sales",
                table: "SaleItems",
                type: "integer",
                nullable: false,
                oldClrType: typeof(decimal),
                oldType: "numeric(18,6)",
                oldPrecision: 18,
                oldScale: 6);

            migrationBuilder.AlterColumn<decimal>(
                name: "Amount",
                schema: "sales",
                table: "CashMovements",
                type: "numeric(18,2)",
                precision: 18,
                scale: 2,
                nullable: false,
                oldClrType: typeof(decimal),
                oldType: "numeric");
        }
    }
}
