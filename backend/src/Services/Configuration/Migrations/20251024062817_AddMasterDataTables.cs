using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Profitzen.Configuration.Migrations
{
    /// <inheritdoc />
    public partial class AddMasterDataTables : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "MasterDataTypes",
                schema: "master_data",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Code = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Description = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    AllowHierarchy = table.Column<bool>(type: "boolean", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    DeletedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MasterDataTypes", x => x.Id);
                    table.UniqueConstraint("AK_MasterDataTypes_Code", x => x.Code);
                });

            migrationBuilder.CreateTable(
                name: "MasterDataValues",
                schema: "master_data",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    TypeCode = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Code = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Description = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    ParentId = table.Column<Guid>(type: "uuid", nullable: true),
                    Metadata = table.Column<string>(type: "jsonb", nullable: true),
                    TenantId = table.Column<string>(type: "character varying(450)", maxLength: 450, nullable: false),
                    DisplayOrder = table.Column<int>(type: "integer", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    DeletedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MasterDataValues", x => x.Id);
                    table.ForeignKey(
                        name: "FK_MasterDataValues_MasterDataTypes_TypeCode",
                        column: x => x.TypeCode,
                        principalSchema: "master_data",
                        principalTable: "MasterDataTypes",
                        principalColumn: "Code",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_MasterDataValues_MasterDataValues_ParentId",
                        column: x => x.ParentId,
                        principalSchema: "master_data",
                        principalTable: "MasterDataValues",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_MasterDataTypes_Code",
                schema: "master_data",
                table: "MasterDataTypes",
                column: "Code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_MasterDataTypes_IsActive",
                schema: "master_data",
                table: "MasterDataTypes",
                column: "IsActive");

            migrationBuilder.CreateIndex(
                name: "IX_MasterDataValues_DisplayOrder",
                schema: "master_data",
                table: "MasterDataValues",
                column: "DisplayOrder");

            migrationBuilder.CreateIndex(
                name: "IX_MasterDataValues_IsActive",
                schema: "master_data",
                table: "MasterDataValues",
                column: "IsActive");

            migrationBuilder.CreateIndex(
                name: "IX_MasterDataValues_ParentId",
                schema: "master_data",
                table: "MasterDataValues",
                column: "ParentId");

            migrationBuilder.CreateIndex(
                name: "IX_MasterDataValues_TenantId",
                schema: "master_data",
                table: "MasterDataValues",
                column: "TenantId");

            migrationBuilder.CreateIndex(
                name: "IX_MasterDataValues_TypeCode_Code_TenantId",
                schema: "master_data",
                table: "MasterDataValues",
                columns: new[] { "TypeCode", "Code", "TenantId" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "MasterDataValues",
                schema: "master_data");

            migrationBuilder.DropTable(
                name: "MasterDataTypes",
                schema: "master_data");
        }
    }
}
