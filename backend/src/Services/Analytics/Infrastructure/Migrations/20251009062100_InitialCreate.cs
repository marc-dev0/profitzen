using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Profitzen.Analytics.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.EnsureSchema(
                name: "analytics");

            migrationBuilder.CreateTable(
                name: "DailySalesSummaries",
                schema: "analytics",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    TenantId = table.Column<string>(type: "character varying(450)", maxLength: 450, nullable: false),
                    StoreId = table.Column<Guid>(type: "uuid", nullable: false),
                    Date = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    TotalSales = table.Column<int>(type: "integer", nullable: false),
                    TotalRevenue = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    TotalCost = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    TotalProfit = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    AverageTicket = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    TotalItems = table.Column<int>(type: "integer", nullable: false),
                    TotalCustomers = table.Column<int>(type: "integer", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    DeletedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DailySalesSummaries", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "ProductPerformances",
                schema: "analytics",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    TenantId = table.Column<string>(type: "character varying(450)", maxLength: 450, nullable: false),
                    ProductId = table.Column<Guid>(type: "uuid", nullable: false),
                    ProductCode = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    ProductName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    TotalSold = table.Column<int>(type: "integer", nullable: false),
                    TotalRevenue = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    TotalCost = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    TotalProfit = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    LastSaleDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    DaysSinceLastSale = table.Column<int>(type: "integer", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    DeletedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProductPerformances", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_DailySalesSummaries_Date",
                schema: "analytics",
                table: "DailySalesSummaries",
                column: "Date");

            migrationBuilder.CreateIndex(
                name: "IX_DailySalesSummaries_StoreId",
                schema: "analytics",
                table: "DailySalesSummaries",
                column: "StoreId");

            migrationBuilder.CreateIndex(
                name: "IX_DailySalesSummaries_TenantId",
                schema: "analytics",
                table: "DailySalesSummaries",
                column: "TenantId");

            migrationBuilder.CreateIndex(
                name: "IX_DailySalesSummaries_TenantId_StoreId_Date",
                schema: "analytics",
                table: "DailySalesSummaries",
                columns: new[] { "TenantId", "StoreId", "Date" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ProductPerformances_LastSaleDate",
                schema: "analytics",
                table: "ProductPerformances",
                column: "LastSaleDate");

            migrationBuilder.CreateIndex(
                name: "IX_ProductPerformances_TenantId",
                schema: "analytics",
                table: "ProductPerformances",
                column: "TenantId");

            migrationBuilder.CreateIndex(
                name: "IX_ProductPerformances_TenantId_ProductId",
                schema: "analytics",
                table: "ProductPerformances",
                columns: new[] { "TenantId", "ProductId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ProductPerformances_TotalRevenue",
                schema: "analytics",
                table: "ProductPerformances",
                column: "TotalRevenue");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "DailySalesSummaries",
                schema: "analytics");

            migrationBuilder.DropTable(
                name: "ProductPerformances",
                schema: "analytics");
        }
    }
}
