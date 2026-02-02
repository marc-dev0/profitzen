using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Profitzen.Analytics.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddSmartSummaries : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "SmartSummaries",
                schema: "analytics",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    TenantId = table.Column<string>(type: "character varying(450)", maxLength: 450, nullable: false),
                    StoreId = table.Column<Guid>(type: "uuid", nullable: false),
                    Date = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    Section = table.Column<string>(type: "text", nullable: false),
                    Content = table.Column<string>(type: "text", nullable: false),
                    Type = table.Column<string>(type: "text", nullable: false),
                    IsRead = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SmartSummaries", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_SmartSummaries_CreatedAt",
                schema: "analytics",
                table: "SmartSummaries",
                column: "CreatedAt");

            migrationBuilder.CreateIndex(
                name: "IX_SmartSummaries_TenantId_StoreId_Date",
                schema: "analytics",
                table: "SmartSummaries",
                columns: new[] { "TenantId", "StoreId", "Date" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "SmartSummaries",
                schema: "analytics");
        }
    }
}
