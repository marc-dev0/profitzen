using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Profitzen.Analytics.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddExpensesToDailySummary : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "TotalExpenses",
                schema: "analytics",
                table: "DailySalesSummaries",
                type: "numeric",
                nullable: false,
                defaultValue: 0m);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "TotalExpenses",
                schema: "analytics",
                table: "DailySalesSummaries");
        }
    }
}
