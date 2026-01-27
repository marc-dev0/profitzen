using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Profitzen.Inventory.Migrations
{
    /// <inheritdoc />
    public partial class AddPurchaseStatus : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "ReceivedByUserId",
                schema: "inventory",
                table: "Purchases",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "ReceivedDate",
                schema: "inventory",
                table: "Purchases",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "Status",
                schema: "inventory",
                table: "Purchases",
                type: "integer",
                nullable: false,
                defaultValue: 0);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ReceivedByUserId",
                schema: "inventory",
                table: "Purchases");

            migrationBuilder.DropColumn(
                name: "ReceivedDate",
                schema: "inventory",
                table: "Purchases");

            migrationBuilder.DropColumn(
                name: "Status",
                schema: "inventory",
                table: "Purchases");
        }
    }
}
