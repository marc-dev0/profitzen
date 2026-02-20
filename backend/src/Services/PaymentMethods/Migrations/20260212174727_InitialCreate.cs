using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Profitzen.PaymentMethods.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.EnsureSchema(
                name: "payment");

            migrationBuilder.CreateTable(
                name: "PaymentMethodConfigs",
                schema: "payment",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    TenantId = table.Column<string>(type: "character varying(450)", maxLength: 450, nullable: false),
                    Code = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    Name = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Description = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    Icon = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    RequiresAmountReceived = table.Column<bool>(type: "boolean", nullable: false),
                    AppliesRounding = table.Column<bool>(type: "boolean", nullable: false),
                    RequiresReference = table.Column<bool>(type: "boolean", nullable: false),
                    GeneratesDebt = table.Column<bool>(type: "boolean", nullable: false),
                    RequiresCustomer = table.Column<bool>(type: "boolean", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    SortOrder = table.Column<int>(type: "integer", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    DeletedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PaymentMethodConfigs", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_PaymentMethodConfigs_TenantId",
                schema: "payment",
                table: "PaymentMethodConfigs",
                column: "TenantId");

            migrationBuilder.CreateIndex(
                name: "IX_PaymentMethodConfigs_TenantId_Code",
                schema: "payment",
                table: "PaymentMethodConfigs",
                columns: new[] { "TenantId", "Code" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "PaymentMethodConfigs",
                schema: "payment");
        }
    }
}
