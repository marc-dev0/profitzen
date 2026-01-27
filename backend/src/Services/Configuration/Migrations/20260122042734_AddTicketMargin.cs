using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Profitzen.Configuration.Migrations
{
    /// <inheritdoc />
    public partial class AddTicketMargin : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "TicketMargin",
                schema: "config",
                table: "CompanySettings",
                type: "integer",
                nullable: false,
                defaultValue: 0);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "TicketMargin",
                schema: "config",
                table: "CompanySettings");
        }
    }
}
