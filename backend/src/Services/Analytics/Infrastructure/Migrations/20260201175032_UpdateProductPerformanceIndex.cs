using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Profitzen.Analytics.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class UpdateProductPerformanceIndex : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("DROP INDEX IF EXISTS analytics.\"IX_ProductPerformances_TenantId_ProductId\";");

            migrationBuilder.Sql("CREATE UNIQUE INDEX IF NOT EXISTS \"IX_ProductPerformances_TenantId_ProductId_ProductName\" ON analytics.\"ProductPerformances\" (\"TenantId\", \"ProductId\", \"ProductName\");");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_ProductPerformances_TenantId_ProductId_ProductName",
                schema: "analytics",
                table: "ProductPerformances");

            migrationBuilder.CreateIndex(
                name: "IX_ProductPerformances_TenantId_ProductId",
                schema: "analytics",
                table: "ProductPerformances",
                columns: new[] { "TenantId", "ProductId" },
                unique: true);
        }
    }
}
