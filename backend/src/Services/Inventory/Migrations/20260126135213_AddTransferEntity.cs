using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Profitzen.Inventory.Migrations
{
    /// <inheritdoc />
    public partial class AddTransferEntity : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Transfers",
                schema: "inventory",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    TransferNumber = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    OriginStoreId = table.Column<Guid>(type: "uuid", nullable: false),
                    DestinationStoreId = table.Column<Guid>(type: "uuid", nullable: false),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    TenantId = table.Column<string>(type: "text", nullable: false),
                    RequestedByUserId = table.Column<Guid>(type: "uuid", nullable: false),
                    ReceivedByUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    Notes = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CompletedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Transfers", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "TransferDetails",
                schema: "inventory",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    TransferId = table.Column<Guid>(type: "uuid", nullable: false),
                    ProductId = table.Column<Guid>(type: "uuid", nullable: false),
                    Quantity = table.Column<decimal>(type: "numeric(18,6)", precision: 18, scale: 6, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TransferDetails", x => x.Id);
                    table.ForeignKey(
                        name: "FK_TransferDetails_Transfers_TransferId",
                        column: x => x.TransferId,
                        principalSchema: "inventory",
                        principalTable: "Transfers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_TransferDetails_ProductId",
                schema: "inventory",
                table: "TransferDetails",
                column: "ProductId");

            migrationBuilder.CreateIndex(
                name: "IX_TransferDetails_TransferId",
                schema: "inventory",
                table: "TransferDetails",
                column: "TransferId");

            migrationBuilder.CreateIndex(
                name: "IX_Transfers_DestinationStoreId",
                schema: "inventory",
                table: "Transfers",
                column: "DestinationStoreId");

            migrationBuilder.CreateIndex(
                name: "IX_Transfers_OriginStoreId",
                schema: "inventory",
                table: "Transfers",
                column: "OriginStoreId");

            migrationBuilder.CreateIndex(
                name: "IX_Transfers_Status",
                schema: "inventory",
                table: "Transfers",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_Transfers_TenantId",
                schema: "inventory",
                table: "Transfers",
                column: "TenantId");

            migrationBuilder.CreateIndex(
                name: "IX_Transfers_TransferNumber",
                schema: "inventory",
                table: "Transfers",
                column: "TransferNumber",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "TransferDetails",
                schema: "inventory");

            migrationBuilder.DropTable(
                name: "Transfers",
                schema: "inventory");
        }
    }
}
