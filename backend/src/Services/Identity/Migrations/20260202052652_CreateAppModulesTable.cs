using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace Profitzen.Identity.Migrations
{
    /// <inheritdoc />
    public partial class CreateAppModulesTable : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DeleteData(
                schema: "identity",
                table: "RoleModulePermissions",
                keyColumn: "Id",
                keyValue: new Guid("051b320d-70df-4814-9b97-522b0ae25430"));

            migrationBuilder.DeleteData(
                schema: "identity",
                table: "RoleModulePermissions",
                keyColumn: "Id",
                keyValue: new Guid("05ceffae-01c5-4378-b24d-2a24926e3c7e"));

            migrationBuilder.DeleteData(
                schema: "identity",
                table: "RoleModulePermissions",
                keyColumn: "Id",
                keyValue: new Guid("0ecd91e3-4e2a-40b8-a29d-5c6482d76e63"));

            migrationBuilder.DeleteData(
                schema: "identity",
                table: "RoleModulePermissions",
                keyColumn: "Id",
                keyValue: new Guid("1962521f-4655-463c-b835-a3fc69c6cbe9"));

            migrationBuilder.DeleteData(
                schema: "identity",
                table: "RoleModulePermissions",
                keyColumn: "Id",
                keyValue: new Guid("1b94c326-45de-407e-8f92-e7c0141f4fa8"));

            migrationBuilder.DeleteData(
                schema: "identity",
                table: "RoleModulePermissions",
                keyColumn: "Id",
                keyValue: new Guid("200c292c-3ac7-490e-bfc2-94e8a4e56661"));

            migrationBuilder.DeleteData(
                schema: "identity",
                table: "RoleModulePermissions",
                keyColumn: "Id",
                keyValue: new Guid("29ce08c5-d84e-4745-a27b-97c899b03a90"));

            migrationBuilder.DeleteData(
                schema: "identity",
                table: "RoleModulePermissions",
                keyColumn: "Id",
                keyValue: new Guid("29d14af2-7771-457c-8a99-8b8fbf38c932"));

            migrationBuilder.DeleteData(
                schema: "identity",
                table: "RoleModulePermissions",
                keyColumn: "Id",
                keyValue: new Guid("2b6251fe-9ecf-42c8-9867-d5fb3c8eebf0"));

            migrationBuilder.DeleteData(
                schema: "identity",
                table: "RoleModulePermissions",
                keyColumn: "Id",
                keyValue: new Guid("39660bd0-4a2a-47ae-96fa-36a0440e280b"));

            migrationBuilder.DeleteData(
                schema: "identity",
                table: "RoleModulePermissions",
                keyColumn: "Id",
                keyValue: new Guid("57c3d396-15e5-499f-93d2-c121d50c76b2"));

            migrationBuilder.DeleteData(
                schema: "identity",
                table: "RoleModulePermissions",
                keyColumn: "Id",
                keyValue: new Guid("5eb60ab3-b834-4074-a4ee-0ecd7bc8fef4"));

            migrationBuilder.DeleteData(
                schema: "identity",
                table: "RoleModulePermissions",
                keyColumn: "Id",
                keyValue: new Guid("632e236e-cb7f-4113-8816-cb173b062dcf"));

            migrationBuilder.DeleteData(
                schema: "identity",
                table: "RoleModulePermissions",
                keyColumn: "Id",
                keyValue: new Guid("657d8739-67f1-4095-8284-84d6a666fa08"));

            migrationBuilder.DeleteData(
                schema: "identity",
                table: "RoleModulePermissions",
                keyColumn: "Id",
                keyValue: new Guid("8e4c2e6a-0a70-43a2-a580-714637b1cfc8"));

            migrationBuilder.DeleteData(
                schema: "identity",
                table: "RoleModulePermissions",
                keyColumn: "Id",
                keyValue: new Guid("9ae23945-57d3-437e-8306-2677de570c41"));

            migrationBuilder.DeleteData(
                schema: "identity",
                table: "RoleModulePermissions",
                keyColumn: "Id",
                keyValue: new Guid("a1f7a06a-3dc1-4dbc-95d2-5d4ee80540cb"));

            migrationBuilder.DeleteData(
                schema: "identity",
                table: "RoleModulePermissions",
                keyColumn: "Id",
                keyValue: new Guid("abf1b681-60bc-47f4-bfc0-9ccc7dbcb260"));

            migrationBuilder.DeleteData(
                schema: "identity",
                table: "RoleModulePermissions",
                keyColumn: "Id",
                keyValue: new Guid("c3c91b97-dc24-404d-a5a2-b8ebcba1bd9c"));

            migrationBuilder.DeleteData(
                schema: "identity",
                table: "RoleModulePermissions",
                keyColumn: "Id",
                keyValue: new Guid("cd709560-2b1d-4586-9c9a-f0b93ecee3d2"));

            migrationBuilder.DeleteData(
                schema: "identity",
                table: "RoleModulePermissions",
                keyColumn: "Id",
                keyValue: new Guid("d637d2db-3804-4113-9045-e2b1e17973b2"));

            migrationBuilder.DeleteData(
                schema: "identity",
                table: "RoleModulePermissions",
                keyColumn: "Id",
                keyValue: new Guid("da95c398-806d-4c86-b095-81be5df8b300"));

            migrationBuilder.DeleteData(
                schema: "identity",
                table: "RoleModulePermissions",
                keyColumn: "Id",
                keyValue: new Guid("df5a3f0f-bbd8-45ae-a3a7-7e192f0e76e5"));

            migrationBuilder.DeleteData(
                schema: "identity",
                table: "RoleModulePermissions",
                keyColumn: "Id",
                keyValue: new Guid("ec9bff63-46e7-45fc-b552-261e4307f3aa"));

            migrationBuilder.DeleteData(
                schema: "identity",
                table: "RoleModulePermissions",
                keyColumn: "Id",
                keyValue: new Guid("f14e5eb4-d6a0-4bfa-af53-1e1b2ad27f7c"));

            migrationBuilder.DeleteData(
                schema: "identity",
                table: "RoleModulePermissions",
                keyColumn: "Id",
                keyValue: new Guid("f8f80d21-753d-4a30-93c6-fdf8f82135f3"));

            migrationBuilder.CreateTable(
                name: "AppModules",
                schema: "identity",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Code = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Route = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    Icon = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    ParentId = table.Column<Guid>(type: "uuid", nullable: true),
                    SortOrder = table.Column<int>(type: "integer", nullable: false),
                    IsVisibleInMenu = table.Column<bool>(type: "boolean", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    GroupName = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AppModules", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AppModules_AppModules_ParentId",
                        column: x => x.ParentId,
                        principalSchema: "identity",
                        principalTable: "AppModules",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.InsertData(
                schema: "identity",
                table: "AppModules",
                columns: new[] { "Id", "Code", "CreatedAt", "GroupName", "Icon", "IsActive", "IsVisibleInMenu", "Name", "ParentId", "Route", "SortOrder" },
                values: new object[,]
                {
                    { new Guid("0a883f5c-54ae-4363-b837-f5f002156652"), "stores", new DateTime(2026, 2, 2, 5, 26, 51, 762, DateTimeKind.Utc).AddTicks(3773), "PRINCIPAL", "Store", true, true, "Sucursales", null, "/stores", 6 },
                    { new Guid("2bd9c723-0b58-4dc9-abb2-6d4422619464"), "sales_parent", new DateTime(2026, 2, 2, 5, 26, 51, 762, DateTimeKind.Utc).AddTicks(3738), "VENTAS", "FileText", true, true, "Ventas", null, null, 3 },
                    { new Guid("2fcb3367-4ed7-4423-873f-64dadb7aec0f"), "pos", new DateTime(2026, 2, 2, 5, 26, 51, 762, DateTimeKind.Utc).AddTicks(3734), "PRINCIPAL", "ShoppingCart", true, true, "Punto de Venta", null, "/pos", 2 },
                    { new Guid("4488ea47-8a77-4878-b39a-2c7f83fbf7cb"), "dashboard", new DateTime(2026, 2, 2, 5, 26, 51, 762, DateTimeKind.Utc).AddTicks(3727), "PRINCIPAL", "LayoutDashboard", true, true, "Dashboard", null, "/dashboard", 1 },
                    { new Guid("6900dcbe-e23e-4528-8438-5a1eb319eded"), "settings", new DateTime(2026, 2, 2, 5, 26, 51, 762, DateTimeKind.Utc).AddTicks(3775), "CONFIGURACION", "Store", true, true, "Mi Empresa", null, "/settings", 1 },
                    { new Guid("a081ce79-7e3c-492f-bbfb-e7e717716303"), "intelligence_parent", new DateTime(2026, 2, 2, 5, 26, 51, 762, DateTimeKind.Utc).AddTicks(3747), "INTELIGENCIA", "BarChart3", true, true, "Inteligencia", null, null, 4 },
                    { new Guid("bbb90069-7edb-4303-8cf4-b893816cec6e"), "operations_parent", new DateTime(2026, 2, 2, 5, 26, 51, 762, DateTimeKind.Utc).AddTicks(3760), "OPERACIONES", "Package", true, true, "Operaciones", null, null, 5 },
                    { new Guid("f777c999-9d8b-44a3-aa1b-aa8b48ebccf1"), "users", new DateTime(2026, 2, 2, 5, 26, 51, 762, DateTimeKind.Utc).AddTicks(3780), "CONFIGURACION", "UserCog", true, true, "Usuarios y Roles", null, "/users", 2 }
                });

            migrationBuilder.InsertData(
                schema: "identity",
                table: "RoleModulePermissions",
                columns: new[] { "Id", "CreatedAt", "Module", "Role" },
                values: new object[,]
                {
                    { new Guid("0b60f1a4-5da0-4508-bada-cc0acf5e49be"), new DateTime(2026, 2, 2, 5, 26, 51, 762, DateTimeKind.Utc).AddTicks(3910), "intelligence_parent", 1 },
                    { new Guid("0c3bf41c-ae9a-4456-baf5-7493129d7721"), new DateTime(2026, 2, 2, 5, 26, 51, 762, DateTimeKind.Utc).AddTicks(4013), "dashboard", 2 },
                    { new Guid("0d3fd2cf-8465-4d91-ac55-cdc982dd74fd"), new DateTime(2026, 2, 2, 5, 26, 51, 762, DateTimeKind.Utc).AddTicks(4033), "products", 2 },
                    { new Guid("116ba26d-847f-4e28-8855-56863c0c2e36"), new DateTime(2026, 2, 2, 5, 26, 51, 762, DateTimeKind.Utc).AddTicks(3924), "suppliers", 1 },
                    { new Guid("13b8cf3e-7d2e-4f1d-afd5-c222671193ab"), new DateTime(2026, 2, 2, 5, 26, 51, 762, DateTimeKind.Utc).AddTicks(3903), "sales_parent", 1 },
                    { new Guid("173827c4-5e24-4079-8b99-e696c7d1acec"), new DateTime(2026, 2, 2, 5, 26, 51, 762, DateTimeKind.Utc).AddTicks(4016), "pos", 2 },
                    { new Guid("274c95cc-c4a7-45ff-a460-e1b58334f831"), new DateTime(2026, 2, 2, 5, 26, 51, 762, DateTimeKind.Utc).AddTicks(4021), "sales", 2 },
                    { new Guid("29216595-1ab3-48fc-a4db-b47c3c320004"), new DateTime(2026, 2, 2, 5, 26, 51, 762, DateTimeKind.Utc).AddTicks(3901), "pos", 1 },
                    { new Guid("3be9b082-d586-4b45-a8fc-4a4f70f1746d"), new DateTime(2026, 2, 2, 5, 26, 51, 762, DateTimeKind.Utc).AddTicks(3917), "operations_parent", 1 },
                    { new Guid("44535eb2-1761-42db-a5f2-fee2c2212918"), new DateTime(2026, 2, 2, 5, 26, 51, 762, DateTimeKind.Utc).AddTicks(4049), "inventory", 8 },
                    { new Guid("4ab86fe6-7fdc-41e0-9d12-bfa587c047bc"), new DateTime(2026, 2, 2, 5, 26, 51, 762, DateTimeKind.Utc).AddTicks(4026), "analytics", 2 },
                    { new Guid("4e1659f9-4e1c-4a59-8ac0-250d9276a83d"), new DateTime(2026, 2, 2, 5, 26, 51, 762, DateTimeKind.Utc).AddTicks(3928), "settings", 1 },
                    { new Guid("4f722e6b-4665-423f-9012-14adf02dd115"), new DateTime(2026, 2, 2, 5, 26, 51, 762, DateTimeKind.Utc).AddTicks(4035), "purchases", 2 },
                    { new Guid("51cca1b0-6bbf-4f16-bb70-208bdf6319ea"), new DateTime(2026, 2, 2, 5, 26, 51, 762, DateTimeKind.Utc).AddTicks(4036), "suppliers", 2 },
                    { new Guid("5386bb5c-75c8-48b8-b2f9-c4c869baa491"), new DateTime(2026, 2, 2, 5, 26, 51, 762, DateTimeKind.Utc).AddTicks(4028), "analytics_ia_history", 2 },
                    { new Guid("6863840c-4919-44ee-a10f-6f96f302d95c"), new DateTime(2026, 2, 2, 5, 26, 51, 762, DateTimeKind.Utc).AddTicks(4041), "pos", 4 },
                    { new Guid("68965ac2-5c63-450a-af0f-7a535f209139"), new DateTime(2026, 2, 2, 5, 26, 51, 762, DateTimeKind.Utc).AddTicks(3907), "sales", 1 },
                    { new Guid("6a1b0fd3-7cae-47b7-a2db-c51e9573b752"), new DateTime(2026, 2, 2, 5, 26, 51, 762, DateTimeKind.Utc).AddTicks(4051), "purchases", 8 },
                    { new Guid("6e03fc25-ed07-4a89-992f-ddf39a6f9e6b"), new DateTime(2026, 2, 2, 5, 26, 51, 762, DateTimeKind.Utc).AddTicks(4052), "suppliers", 8 },
                    { new Guid("746ec9d9-d039-46d9-b524-d4681297a31c"), new DateTime(2026, 2, 2, 5, 26, 51, 762, DateTimeKind.Utc).AddTicks(3911), "analytics", 1 },
                    { new Guid("8152e660-862b-44d9-a127-51ace4a5608f"), new DateTime(2026, 2, 2, 5, 26, 51, 762, DateTimeKind.Utc).AddTicks(4044), "customers", 4 },
                    { new Guid("89af7095-04f3-4767-8fa7-146d7b091c9b"), new DateTime(2026, 2, 2, 5, 26, 51, 762, DateTimeKind.Utc).AddTicks(3914), "analytics_ia", 1 },
                    { new Guid("8aafeb9e-d938-4b9e-ba58-ec99b0abed66"), new DateTime(2026, 2, 2, 5, 26, 51, 762, DateTimeKind.Utc).AddTicks(4034), "inventory", 2 },
                    { new Guid("96ab3f47-914f-45e8-b4e0-7ddb66507352"), new DateTime(2026, 2, 2, 5, 26, 51, 762, DateTimeKind.Utc).AddTicks(3923), "purchases", 1 },
                    { new Guid("9c860b1c-2208-4e6f-b496-fb7d0cfe9f75"), new DateTime(2026, 2, 2, 5, 26, 51, 762, DateTimeKind.Utc).AddTicks(3908), "customers", 1 },
                    { new Guid("b61341ea-9170-4a94-ab2d-950469ac01e6"), new DateTime(2026, 2, 2, 5, 26, 51, 762, DateTimeKind.Utc).AddTicks(3925), "stores", 1 },
                    { new Guid("bd4e8842-2e28-42ca-b259-6b93b037e0c7"), new DateTime(2026, 2, 2, 5, 26, 51, 762, DateTimeKind.Utc).AddTicks(4019), "sales_parent", 2 },
                    { new Guid("c5b34699-592d-4ad4-be74-ed6e7a8f99b9"), new DateTime(2026, 2, 2, 5, 26, 51, 762, DateTimeKind.Utc).AddTicks(4046), "products", 8 },
                    { new Guid("c7a164b3-8566-4d51-9e3f-766a859bdbcb"), new DateTime(2026, 2, 2, 5, 26, 51, 762, DateTimeKind.Utc).AddTicks(4053), "operations_parent", 8 },
                    { new Guid("ce1613a3-e431-4cdf-af7f-32def029aaaa"), new DateTime(2026, 2, 2, 5, 26, 51, 762, DateTimeKind.Utc).AddTicks(4022), "customers", 2 },
                    { new Guid("d25029ff-2172-46cc-9caa-96662f8b0ade"), new DateTime(2026, 2, 2, 5, 26, 51, 762, DateTimeKind.Utc).AddTicks(4023), "intelligence_parent", 2 },
                    { new Guid("d30999bc-3a0f-42c7-a7ba-991b2d3e7e83"), new DateTime(2026, 2, 2, 5, 26, 51, 762, DateTimeKind.Utc).AddTicks(3915), "analytics_ia_history", 1 },
                    { new Guid("d50f1bc7-0398-46bf-a0c3-1f25b2265274"), new DateTime(2026, 2, 2, 5, 26, 51, 762, DateTimeKind.Utc).AddTicks(3929), "users", 1 },
                    { new Guid("e601f6f2-9a46-4e23-94da-f54247271b35"), new DateTime(2026, 2, 2, 5, 26, 51, 762, DateTimeKind.Utc).AddTicks(4039), "stores", 2 },
                    { new Guid("f0cd353a-ecab-4914-ab04-a333c1541195"), new DateTime(2026, 2, 2, 5, 26, 51, 762, DateTimeKind.Utc).AddTicks(3921), "inventory", 1 },
                    { new Guid("f1f32a89-1745-4e87-b2d6-4a7f1b1c816b"), new DateTime(2026, 2, 2, 5, 26, 51, 762, DateTimeKind.Utc).AddTicks(4027), "analytics_ia", 2 },
                    { new Guid("f34dcfd3-f9f0-4595-bba3-a04d38cb3969"), new DateTime(2026, 2, 2, 5, 26, 51, 762, DateTimeKind.Utc).AddTicks(3898), "dashboard", 1 },
                    { new Guid("f9fdfec7-9dd5-43e3-a6c7-7f1c27a70656"), new DateTime(2026, 2, 2, 5, 26, 51, 762, DateTimeKind.Utc).AddTicks(4030), "operations_parent", 2 },
                    { new Guid("ffc86804-3424-4ec5-ae5e-a855855e1a1d"), new DateTime(2026, 2, 2, 5, 26, 51, 762, DateTimeKind.Utc).AddTicks(3919), "products", 1 }
                });

            migrationBuilder.InsertData(
                schema: "identity",
                table: "AppModules",
                columns: new[] { "Id", "Code", "CreatedAt", "GroupName", "Icon", "IsActive", "IsVisibleInMenu", "Name", "ParentId", "Route", "SortOrder" },
                values: new object[,]
                {
                    { new Guid("0db15d96-96dc-4115-9a94-86c8d4ee261a"), "analytics", new DateTime(2026, 2, 2, 5, 26, 51, 762, DateTimeKind.Utc).AddTicks(3750), null, null, true, true, "Centro Analítico", new Guid("a081ce79-7e3c-492f-bbfb-e7e717716303"), "/analytics", 1 },
                    { new Guid("646920b6-1c89-477f-b1bd-6a57cfeafefc"), "suppliers", new DateTime(2026, 2, 2, 5, 26, 51, 762, DateTimeKind.Utc).AddTicks(3771), null, "Truck", true, true, "Proveedores", new Guid("bbb90069-7edb-4303-8cf4-b893816cec6e"), "/suppliers", 4 },
                    { new Guid("6a054434-f504-49fc-8f5f-a2dd428621e5"), "inventory", new DateTime(2026, 2, 2, 5, 26, 51, 762, DateTimeKind.Utc).AddTicks(3765), null, "Package", true, true, "Inventario", new Guid("bbb90069-7edb-4303-8cf4-b893816cec6e"), "/inventory", 2 },
                    { new Guid("74cc5733-8e8a-4ba5-bc0b-2477b44570fa"), "purchases", new DateTime(2026, 2, 2, 5, 26, 51, 762, DateTimeKind.Utc).AddTicks(3769), null, "CreditCard", true, true, "Compras", new Guid("bbb90069-7edb-4303-8cf4-b893816cec6e"), "/purchases", 3 },
                    { new Guid("78b2c716-abba-4045-a55a-8de7ffbe16c5"), "analytics_ia", new DateTime(2026, 2, 2, 5, 26, 51, 762, DateTimeKind.Utc).AddTicks(3752), null, "BrainCircuit", true, true, "Analizador IA", new Guid("a081ce79-7e3c-492f-bbfb-e7e717716303"), "/analytics/ia", 2 },
                    { new Guid("a2df166b-151a-4278-b845-d0b93d8668f1"), "analytics_ia_history", new DateTime(2026, 2, 2, 5, 26, 51, 762, DateTimeKind.Utc).AddTicks(3757), null, "Clock", true, true, "Bitácora de IA", new Guid("a081ce79-7e3c-492f-bbfb-e7e717716303"), "/analytics/ia/vigilante/history", 3 },
                    { new Guid("a8f9c625-bd4c-4819-8bd6-8331f079115f"), "sales", new DateTime(2026, 2, 2, 5, 26, 51, 762, DateTimeKind.Utc).AddTicks(3739), null, null, true, true, "Historial", new Guid("2bd9c723-0b58-4dc9-abb2-6d4422619464"), "/sales", 1 },
                    { new Guid("b411c1de-2227-43b2-a9f3-86dd7873253b"), "customers", new DateTime(2026, 2, 2, 5, 26, 51, 762, DateTimeKind.Utc).AddTicks(3743), null, "Users", true, true, "Clientes", new Guid("2bd9c723-0b58-4dc9-abb2-6d4422619464"), "/customers", 2 },
                    { new Guid("e61dafa8-44b3-4fca-b720-a86990225f3a"), "products", new DateTime(2026, 2, 2, 5, 26, 51, 762, DateTimeKind.Utc).AddTicks(3763), null, "Tags", true, true, "Productos", new Guid("bbb90069-7edb-4303-8cf4-b893816cec6e"), "/products", 1 }
                });

            migrationBuilder.CreateIndex(
                name: "IX_AppModules_Code",
                schema: "identity",
                table: "AppModules",
                column: "Code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_AppModules_ParentId",
                schema: "identity",
                table: "AppModules",
                column: "ParentId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AppModules",
                schema: "identity");

            migrationBuilder.DeleteData(
                schema: "identity",
                table: "RoleModulePermissions",
                keyColumn: "Id",
                keyValue: new Guid("0b60f1a4-5da0-4508-bada-cc0acf5e49be"));

            migrationBuilder.DeleteData(
                schema: "identity",
                table: "RoleModulePermissions",
                keyColumn: "Id",
                keyValue: new Guid("0c3bf41c-ae9a-4456-baf5-7493129d7721"));

            migrationBuilder.DeleteData(
                schema: "identity",
                table: "RoleModulePermissions",
                keyColumn: "Id",
                keyValue: new Guid("0d3fd2cf-8465-4d91-ac55-cdc982dd74fd"));

            migrationBuilder.DeleteData(
                schema: "identity",
                table: "RoleModulePermissions",
                keyColumn: "Id",
                keyValue: new Guid("116ba26d-847f-4e28-8855-56863c0c2e36"));

            migrationBuilder.DeleteData(
                schema: "identity",
                table: "RoleModulePermissions",
                keyColumn: "Id",
                keyValue: new Guid("13b8cf3e-7d2e-4f1d-afd5-c222671193ab"));

            migrationBuilder.DeleteData(
                schema: "identity",
                table: "RoleModulePermissions",
                keyColumn: "Id",
                keyValue: new Guid("173827c4-5e24-4079-8b99-e696c7d1acec"));

            migrationBuilder.DeleteData(
                schema: "identity",
                table: "RoleModulePermissions",
                keyColumn: "Id",
                keyValue: new Guid("274c95cc-c4a7-45ff-a460-e1b58334f831"));

            migrationBuilder.DeleteData(
                schema: "identity",
                table: "RoleModulePermissions",
                keyColumn: "Id",
                keyValue: new Guid("29216595-1ab3-48fc-a4db-b47c3c320004"));

            migrationBuilder.DeleteData(
                schema: "identity",
                table: "RoleModulePermissions",
                keyColumn: "Id",
                keyValue: new Guid("3be9b082-d586-4b45-a8fc-4a4f70f1746d"));

            migrationBuilder.DeleteData(
                schema: "identity",
                table: "RoleModulePermissions",
                keyColumn: "Id",
                keyValue: new Guid("44535eb2-1761-42db-a5f2-fee2c2212918"));

            migrationBuilder.DeleteData(
                schema: "identity",
                table: "RoleModulePermissions",
                keyColumn: "Id",
                keyValue: new Guid("4ab86fe6-7fdc-41e0-9d12-bfa587c047bc"));

            migrationBuilder.DeleteData(
                schema: "identity",
                table: "RoleModulePermissions",
                keyColumn: "Id",
                keyValue: new Guid("4e1659f9-4e1c-4a59-8ac0-250d9276a83d"));

            migrationBuilder.DeleteData(
                schema: "identity",
                table: "RoleModulePermissions",
                keyColumn: "Id",
                keyValue: new Guid("4f722e6b-4665-423f-9012-14adf02dd115"));

            migrationBuilder.DeleteData(
                schema: "identity",
                table: "RoleModulePermissions",
                keyColumn: "Id",
                keyValue: new Guid("51cca1b0-6bbf-4f16-bb70-208bdf6319ea"));

            migrationBuilder.DeleteData(
                schema: "identity",
                table: "RoleModulePermissions",
                keyColumn: "Id",
                keyValue: new Guid("5386bb5c-75c8-48b8-b2f9-c4c869baa491"));

            migrationBuilder.DeleteData(
                schema: "identity",
                table: "RoleModulePermissions",
                keyColumn: "Id",
                keyValue: new Guid("6863840c-4919-44ee-a10f-6f96f302d95c"));

            migrationBuilder.DeleteData(
                schema: "identity",
                table: "RoleModulePermissions",
                keyColumn: "Id",
                keyValue: new Guid("68965ac2-5c63-450a-af0f-7a535f209139"));

            migrationBuilder.DeleteData(
                schema: "identity",
                table: "RoleModulePermissions",
                keyColumn: "Id",
                keyValue: new Guid("6a1b0fd3-7cae-47b7-a2db-c51e9573b752"));

            migrationBuilder.DeleteData(
                schema: "identity",
                table: "RoleModulePermissions",
                keyColumn: "Id",
                keyValue: new Guid("6e03fc25-ed07-4a89-992f-ddf39a6f9e6b"));

            migrationBuilder.DeleteData(
                schema: "identity",
                table: "RoleModulePermissions",
                keyColumn: "Id",
                keyValue: new Guid("746ec9d9-d039-46d9-b524-d4681297a31c"));

            migrationBuilder.DeleteData(
                schema: "identity",
                table: "RoleModulePermissions",
                keyColumn: "Id",
                keyValue: new Guid("8152e660-862b-44d9-a127-51ace4a5608f"));

            migrationBuilder.DeleteData(
                schema: "identity",
                table: "RoleModulePermissions",
                keyColumn: "Id",
                keyValue: new Guid("89af7095-04f3-4767-8fa7-146d7b091c9b"));

            migrationBuilder.DeleteData(
                schema: "identity",
                table: "RoleModulePermissions",
                keyColumn: "Id",
                keyValue: new Guid("8aafeb9e-d938-4b9e-ba58-ec99b0abed66"));

            migrationBuilder.DeleteData(
                schema: "identity",
                table: "RoleModulePermissions",
                keyColumn: "Id",
                keyValue: new Guid("96ab3f47-914f-45e8-b4e0-7ddb66507352"));

            migrationBuilder.DeleteData(
                schema: "identity",
                table: "RoleModulePermissions",
                keyColumn: "Id",
                keyValue: new Guid("9c860b1c-2208-4e6f-b496-fb7d0cfe9f75"));

            migrationBuilder.DeleteData(
                schema: "identity",
                table: "RoleModulePermissions",
                keyColumn: "Id",
                keyValue: new Guid("b61341ea-9170-4a94-ab2d-950469ac01e6"));

            migrationBuilder.DeleteData(
                schema: "identity",
                table: "RoleModulePermissions",
                keyColumn: "Id",
                keyValue: new Guid("bd4e8842-2e28-42ca-b259-6b93b037e0c7"));

            migrationBuilder.DeleteData(
                schema: "identity",
                table: "RoleModulePermissions",
                keyColumn: "Id",
                keyValue: new Guid("c5b34699-592d-4ad4-be74-ed6e7a8f99b9"));

            migrationBuilder.DeleteData(
                schema: "identity",
                table: "RoleModulePermissions",
                keyColumn: "Id",
                keyValue: new Guid("c7a164b3-8566-4d51-9e3f-766a859bdbcb"));

            migrationBuilder.DeleteData(
                schema: "identity",
                table: "RoleModulePermissions",
                keyColumn: "Id",
                keyValue: new Guid("ce1613a3-e431-4cdf-af7f-32def029aaaa"));

            migrationBuilder.DeleteData(
                schema: "identity",
                table: "RoleModulePermissions",
                keyColumn: "Id",
                keyValue: new Guid("d25029ff-2172-46cc-9caa-96662f8b0ade"));

            migrationBuilder.DeleteData(
                schema: "identity",
                table: "RoleModulePermissions",
                keyColumn: "Id",
                keyValue: new Guid("d30999bc-3a0f-42c7-a7ba-991b2d3e7e83"));

            migrationBuilder.DeleteData(
                schema: "identity",
                table: "RoleModulePermissions",
                keyColumn: "Id",
                keyValue: new Guid("d50f1bc7-0398-46bf-a0c3-1f25b2265274"));

            migrationBuilder.DeleteData(
                schema: "identity",
                table: "RoleModulePermissions",
                keyColumn: "Id",
                keyValue: new Guid("e601f6f2-9a46-4e23-94da-f54247271b35"));

            migrationBuilder.DeleteData(
                schema: "identity",
                table: "RoleModulePermissions",
                keyColumn: "Id",
                keyValue: new Guid("f0cd353a-ecab-4914-ab04-a333c1541195"));

            migrationBuilder.DeleteData(
                schema: "identity",
                table: "RoleModulePermissions",
                keyColumn: "Id",
                keyValue: new Guid("f1f32a89-1745-4e87-b2d6-4a7f1b1c816b"));

            migrationBuilder.DeleteData(
                schema: "identity",
                table: "RoleModulePermissions",
                keyColumn: "Id",
                keyValue: new Guid("f34dcfd3-f9f0-4595-bba3-a04d38cb3969"));

            migrationBuilder.DeleteData(
                schema: "identity",
                table: "RoleModulePermissions",
                keyColumn: "Id",
                keyValue: new Guid("f9fdfec7-9dd5-43e3-a6c7-7f1c27a70656"));

            migrationBuilder.DeleteData(
                schema: "identity",
                table: "RoleModulePermissions",
                keyColumn: "Id",
                keyValue: new Guid("ffc86804-3424-4ec5-ae5e-a855855e1a1d"));

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
        }
    }
}
