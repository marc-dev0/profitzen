using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Profitzen.Configuration.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.EnsureSchema(
                name: "master_data");

            migrationBuilder.CreateTable(
                name: "DocumentSeries",
                schema: "master_data",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    SeriesCode = table.Column<string>(type: "character varying(4)", maxLength: 4, nullable: false),
                    DocumentType = table.Column<string>(type: "character varying(2)", maxLength: 2, nullable: false),
                    DocumentTypeName = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    CurrentNumber = table.Column<int>(type: "integer", nullable: false),
                    StoreId = table.Column<Guid>(type: "uuid", nullable: false),
                    TenantId = table.Column<string>(type: "character varying(450)", maxLength: 450, nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    IsDefault = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    DeletedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DocumentSeries", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_DocumentSeries_IsActive",
                schema: "master_data",
                table: "DocumentSeries",
                column: "IsActive");

            migrationBuilder.CreateIndex(
                name: "IX_DocumentSeries_IsDefault",
                schema: "master_data",
                table: "DocumentSeries",
                column: "IsDefault");

            migrationBuilder.CreateIndex(
                name: "IX_DocumentSeries_SeriesCode_TenantId",
                schema: "master_data",
                table: "DocumentSeries",
                columns: new[] { "SeriesCode", "TenantId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_DocumentSeries_StoreId",
                schema: "master_data",
                table: "DocumentSeries",
                column: "StoreId");

            migrationBuilder.CreateIndex(
                name: "IX_DocumentSeries_TenantId_DocumentType",
                schema: "master_data",
                table: "DocumentSeries",
                columns: new[] { "TenantId", "DocumentType" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "DocumentSeries",
                schema: "master_data");
        }
    }
}
