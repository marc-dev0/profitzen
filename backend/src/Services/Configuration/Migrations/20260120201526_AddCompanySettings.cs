using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Profitzen.Configuration.Migrations
{
    /// <inheritdoc />
    public partial class AddCompanySettings : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.EnsureSchema(
                name: "config");

            migrationBuilder.CreateTable(
                name: "CompanySettings",
                schema: "config",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    TenantId = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    CompanyName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    TradeName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    Ruc = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    Address = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    Phone = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    Email = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    Website = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    TicketHeader = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    TicketFooter = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    ShowLogo = table.Column<bool>(type: "boolean", nullable: false),
                    TicketWidth = table.Column<int>(type: "integer", nullable: false),
                    LogoUrl = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    TaxName = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    TaxRate = table.Column<decimal>(type: "numeric(5,4)", nullable: false),
                    PricesIncludeTax = table.Column<bool>(type: "boolean", nullable: false),
                    Currency = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: true),
                    CurrencySymbol = table.Column<string>(type: "character varying(5)", maxLength: 5, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    DeletedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CompanySettings", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_CompanySettings_TenantId",
                schema: "config",
                table: "CompanySettings",
                column: "TenantId",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "CompanySettings",
                schema: "config");
        }
    }
}
