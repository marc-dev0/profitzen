using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Profitzen.Sales.Migrations
{
    /// <inheritdoc />
    public partial class AddUOMFieldsToSaleItem : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "UOMCode",
                schema: "sales",
                table: "SaleItems",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "UOMId",
                schema: "sales",
                table: "SaleItems",
                type: "uuid",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "UOMCode",
                schema: "sales",
                table: "SaleItems");

            migrationBuilder.DropColumn(
                name: "UOMId",
                schema: "sales",
                table: "SaleItems");
        }
    }
}
