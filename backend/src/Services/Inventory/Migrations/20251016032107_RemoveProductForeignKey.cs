using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Profitzen.Inventory.Migrations
{
    /// <inheritdoc />
    public partial class RemoveProductForeignKey : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Eliminar la foreign key constraint que apunta a inventory.Products
            // Ahora los productos están en product.products (Product Service)
            migrationBuilder.DropForeignKey(
                name: "FK_StoreInventories_Products_ProductId",
                schema: "inventory",
                table: "StoreInventories");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Restaurar la foreign key constraint (por si necesitamos revertir)
            migrationBuilder.AddForeignKey(
                name: "FK_StoreInventories_Products_ProductId",
                schema: "inventory",
                table: "StoreInventories",
                column: "ProductId",
                principalSchema: "inventory",
                principalTable: "Products",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
