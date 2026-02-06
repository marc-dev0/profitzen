using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Profitzen.Customer.Migrations
{
    /// <inheritdoc />
    public partial class AddStoreIdToCredit : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "StoreId",
                schema: "customer",
                table: "Credits",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.AddColumn<Guid>(
                name: "StoreId",
                schema: "customer",
                table: "CreditPayments",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.CreateIndex(
                name: "IX_CreditPayments_StoreId",
                schema: "customer",
                table: "CreditPayments",
                column: "StoreId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_CreditPayments_StoreId",
                schema: "customer",
                table: "CreditPayments");

            migrationBuilder.DropColumn(
                name: "StoreId",
                schema: "customer",
                table: "Credits");

            migrationBuilder.DropColumn(
                name: "StoreId",
                schema: "customer",
                table: "CreditPayments");
        }
    }
}
