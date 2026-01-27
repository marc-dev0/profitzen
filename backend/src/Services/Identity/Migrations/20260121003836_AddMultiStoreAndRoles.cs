using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Profitzen.Identity.Migrations
{
    /// <inheritdoc />
    public partial class AddMultiStoreAndRoles : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_AspNetUsers_Stores_StoreId",
                schema: "identity",
                table: "AspNetUsers");

            migrationBuilder.DropIndex(
                name: "IX_AspNetUsers_StoreId",
                schema: "identity",
                table: "AspNetUsers");

            migrationBuilder.DropColumn(
                name: "StoreId",
                schema: "identity",
                table: "AspNetUsers");

            migrationBuilder.CreateTable(
                name: "UserStores",
                schema: "identity",
                columns: table => new
                {
                    StoresId = table.Column<Guid>(type: "uuid", nullable: false),
                    UsersId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UserStores", x => new { x.StoresId, x.UsersId });
                    table.ForeignKey(
                        name: "FK_UserStores_AspNetUsers_UsersId",
                        column: x => x.UsersId,
                        principalSchema: "identity",
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_UserStores_Stores_StoresId",
                        column: x => x.StoresId,
                        principalSchema: "identity",
                        principalTable: "Stores",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_UserStores_UsersId",
                schema: "identity",
                table: "UserStores",
                column: "UsersId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "UserStores",
                schema: "identity");

            migrationBuilder.AddColumn<Guid>(
                name: "StoreId",
                schema: "identity",
                table: "AspNetUsers",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.CreateIndex(
                name: "IX_AspNetUsers_StoreId",
                schema: "identity",
                table: "AspNetUsers",
                column: "StoreId");

            migrationBuilder.AddForeignKey(
                name: "FK_AspNetUsers_Stores_StoreId",
                schema: "identity",
                table: "AspNetUsers",
                column: "StoreId",
                principalSchema: "identity",
                principalTable: "Stores",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }
    }
}
