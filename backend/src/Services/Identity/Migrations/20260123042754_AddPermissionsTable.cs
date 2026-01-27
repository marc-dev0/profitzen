using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace Profitzen.Identity.Migrations
{
    /// <inheritdoc />
    public partial class AddPermissionsTable : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "RoleModulePermissions",
                schema: "identity",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Role = table.Column<int>(type: "integer", nullable: false),
                    Module = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RoleModulePermissions", x => x.Id);
                });

            migrationBuilder.InsertData(
                schema: "identity",
                table: "RoleModulePermissions",
                columns: new[] { "Id", "CreatedAt", "Module", "Role" },
                values: new object[,]
                {
                    { new Guid("051b320d-70df-4814-9b97-522b0ae25430"), new DateTime(2026, 1, 23, 4, 27, 54, 265, DateTimeKind.Utc).AddTicks(3772), "products", 2 },
                    { new Guid("05ceffae-01c5-4378-b24d-2a24926e3c7e"), new DateTime(2026, 1, 23, 4, 27, 54, 265, DateTimeKind.Utc).AddTicks(3775), "purchases", 2 },
                    { new Guid("0ecd91e3-4e2a-40b8-a29d-5c6482d76e63"), new DateTime(2026, 1, 23, 4, 27, 54, 265, DateTimeKind.Utc).AddTicks(3766), "dashboard", 2 },
                    { new Guid("1962521f-4655-463c-b835-a3fc69c6cbe9"), new DateTime(2026, 1, 23, 4, 27, 54, 265, DateTimeKind.Utc).AddTicks(3790), "products", 8 },
                    { new Guid("1b94c326-45de-407e-8f92-e7c0141f4fa8"), new DateTime(2026, 1, 23, 4, 27, 54, 265, DateTimeKind.Utc).AddTicks(3760), "stores", 1 },
                    { new Guid("200c292c-3ac7-490e-bfc2-94e8a4e56661"), new DateTime(2026, 1, 23, 4, 27, 54, 265, DateTimeKind.Utc).AddTicks(3787), "customers", 4 },
                    { new Guid("29ce08c5-d84e-4745-a27b-97c899b03a90"), new DateTime(2026, 1, 23, 4, 27, 54, 265, DateTimeKind.Utc).AddTicks(3788), "dashboard", 8 },
                    { new Guid("29d14af2-7771-457c-8a99-8b8fbf38c932"), new DateTime(2026, 1, 23, 4, 27, 54, 265, DateTimeKind.Utc).AddTicks(3793), "inventory", 8 },
                    { new Guid("2b6251fe-9ecf-42c8-9867-d5fb3c8eebf0"), new DateTime(2026, 1, 23, 4, 27, 54, 265, DateTimeKind.Utc).AddTicks(3752), "products", 1 },
                    { new Guid("39660bd0-4a2a-47ae-96fa-36a0440e280b"), new DateTime(2026, 1, 23, 4, 27, 54, 265, DateTimeKind.Utc).AddTicks(3771), "sales", 2 },
                    { new Guid("57c3d396-15e5-499f-93d2-c121d50c76b2"), new DateTime(2026, 1, 23, 4, 27, 54, 265, DateTimeKind.Utc).AddTicks(3785), "sales", 4 },
                    { new Guid("5eb60ab3-b834-4074-a4ee-0ecd7bc8fef4"), new DateTime(2026, 1, 23, 4, 27, 54, 265, DateTimeKind.Utc).AddTicks(3779), "stores", 2 },
                    { new Guid("632e236e-cb7f-4113-8816-cb173b062dcf"), new DateTime(2026, 1, 23, 4, 27, 54, 265, DateTimeKind.Utc).AddTicks(3777), "customers", 2 },
                    { new Guid("657d8739-67f1-4095-8284-84d6a666fa08"), new DateTime(2026, 1, 23, 4, 27, 54, 265, DateTimeKind.Utc).AddTicks(3741), "dashboard", 1 },
                    { new Guid("8e4c2e6a-0a70-43a2-a580-714637b1cfc8"), new DateTime(2026, 1, 23, 4, 27, 54, 265, DateTimeKind.Utc).AddTicks(3763), "users", 1 },
                    { new Guid("9ae23945-57d3-437e-8306-2677de570c41"), new DateTime(2026, 1, 23, 4, 27, 54, 265, DateTimeKind.Utc).AddTicks(3783), "pos", 4 },
                    { new Guid("a1f7a06a-3dc1-4dbc-95d2-5d4ee80540cb"), new DateTime(2026, 1, 23, 4, 27, 54, 265, DateTimeKind.Utc).AddTicks(3765), "settings", 1 },
                    { new Guid("abf1b681-60bc-47f4-bfc0-9ccc7dbcb260"), new DateTime(2026, 1, 23, 4, 27, 54, 265, DateTimeKind.Utc).AddTicks(3758), "purchases", 1 },
                    { new Guid("c3c91b97-dc24-404d-a5a2-b8ebcba1bd9c"), new DateTime(2026, 1, 23, 4, 27, 54, 265, DateTimeKind.Utc).AddTicks(3759), "customers", 1 },
                    { new Guid("cd709560-2b1d-4586-9c9a-f0b93ecee3d2"), new DateTime(2026, 1, 23, 4, 27, 54, 265, DateTimeKind.Utc).AddTicks(3773), "inventory", 2 },
                    { new Guid("d637d2db-3804-4113-9045-e2b1e17973b2"), new DateTime(2026, 1, 23, 4, 27, 54, 265, DateTimeKind.Utc).AddTicks(3794), "purchases", 8 },
                    { new Guid("da95c398-806d-4c86-b095-81be5df8b300"), new DateTime(2026, 1, 23, 4, 27, 54, 265, DateTimeKind.Utc).AddTicks(3751), "sales", 1 },
                    { new Guid("df5a3f0f-bbd8-45ae-a3a7-7e192f0e76e5"), new DateTime(2026, 1, 23, 4, 27, 54, 265, DateTimeKind.Utc).AddTicks(3781), "dashboard", 4 },
                    { new Guid("ec9bff63-46e7-45fc-b552-261e4307f3aa"), new DateTime(2026, 1, 23, 4, 27, 54, 265, DateTimeKind.Utc).AddTicks(3749), "pos", 1 },
                    { new Guid("f14e5eb4-d6a0-4bfa-af53-1e1b2ad27f7c"), new DateTime(2026, 1, 23, 4, 27, 54, 265, DateTimeKind.Utc).AddTicks(3755), "inventory", 1 },
                    { new Guid("f8f80d21-753d-4a30-93c6-fdf8f82135f3"), new DateTime(2026, 1, 23, 4, 27, 54, 265, DateTimeKind.Utc).AddTicks(3768), "pos", 2 }
                });

            migrationBuilder.CreateIndex(
                name: "IX_RoleModulePermissions_Role_Module",
                schema: "identity",
                table: "RoleModulePermissions",
                columns: new[] { "Role", "Module" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "RoleModulePermissions",
                schema: "identity");
        }
    }
}
