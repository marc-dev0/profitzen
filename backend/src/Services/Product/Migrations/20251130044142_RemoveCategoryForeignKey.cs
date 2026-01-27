using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Profitzen.Product.Migrations
{
    /// <inheritdoc />
    public partial class RemoveCategoryForeignKey : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_products_categories_CategoryId",
                schema: "product",
                table: "products");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddForeignKey(
                name: "FK_products_categories_CategoryId",
                schema: "product",
                table: "products",
                column: "CategoryId",
                principalSchema: "product",
                principalTable: "categories",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }
    }
}
