using Microsoft.EntityFrameworkCore;
using Profitzen.Identity.Domain.Entities;
using Profitzen.Identity.Infrastructure;
using Profitzen.Identity.Domain.Enums;

namespace Profitzen.Identity.Application.Services.Seeding;

public class DemoDataSeeder : IDemoDataSeeder
{
    private readonly IdentityDbContext _context;
    private readonly ILogger<DemoDataSeeder> _logger;

    public DemoDataSeeder(IdentityDbContext context, ILogger<DemoDataSeeder> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task SeedDemoDataAsync(string tenantId, string storeId, Guid userId)
    {
        var environment = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT");
        if (environment != "Development" && environment != "Demo")
        {
            _logger.LogWarning("SeedDemoDataAsync called in {Env} environment. Skipping for safety.", environment);
            return;
        }

        _logger.LogInformation("Starting demo data seeding...");

        try
        {
            await SeedAppModulesAsync();
            await SeedPermissionsAsync();
            await SeedPriceListsAsync(tenantId);
            await SeedCategoriesAsync(tenantId, storeId);
            await SeedProductsAsync(tenantId, storeId);
            await SeedSalesAsync(tenantId, storeId, userId);

            _logger.LogInformation("Demo data seeding completed successfully");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error seeding demo data for Tenant: {TenantId}", tenantId);
            throw;
        }
    }

    private async Task SeedPriceListsAsync(string tenantId)
    {
        var existingPriceLists = await _context.Database
            .SqlQueryRaw<int>(@"SELECT COUNT(*) as ""Value"" FROM product.price_lists WHERE ""TenantId"" = {0}", tenantId)
            .FirstOrDefaultAsync();

        if (existingPriceLists > 0)
        {
            _logger.LogInformation("Price lists already exist for tenant {TenantId}, skipping seed", tenantId);
            return;
        }

        var priceLists = new[]
        {
            new { Id = Guid.NewGuid(), Name = "Minorista", Code = "RETAIL", Description = "Precio de venta al por menor", IsDefault = true },
            new { Id = Guid.NewGuid(), Name = "Mayorista", Code = "WHOLESALE", Description = "Precio de venta al por mayor", IsDefault = false },
            new { Id = Guid.NewGuid(), Name = "Distribuidor", Code = "DISTRIBUTOR", Description = "Precio de venta para distribuidores", IsDefault = false }
        };

        foreach (var list in priceLists)
        {
            var now = DateTime.UtcNow;
            await _context.Database.ExecuteSqlRawAsync(
                @"INSERT INTO product.price_lists (""Id"", ""Name"", ""Code"", ""Description"", ""IsDefault"", ""IsActive"", ""TenantId"", ""CreatedAt"", ""UpdatedAt"")
                  VALUES ({0}, {1}, {2}, {3}, {4}, {5}, {6}, {7}, {8})",
                list.Id, list.Name, list.Code, list.Description, list.IsDefault, true, tenantId, now, now
            );
        }

        _logger.LogInformation("Seeded {Count} price lists for tenant {TenantId}", priceLists.Length, tenantId);
    }

    private async Task SeedCategoriesAsync(string tenantId, string storeId)
    {
        var categories = new[]
        {
            new { Id = Guid.NewGuid(), Name = "Bebidas", Description = "Gaseosas, jugos y agua" },
            new { Id = Guid.NewGuid(), Name = "Snacks", Description = "Galletas, papas fritas y golosinas" },
            new { Id = Guid.NewGuid(), Name = "Abarrotes", Description = "Arroz, aceite, azúcar, etc." },
            new { Id = Guid.NewGuid(), Name = "Lácteos", Description = "Leche, yogurt, queso" },
            new { Id = Guid.NewGuid(), Name = "Limpieza", Description = "Detergentes y productos de limpieza" },
            new { Id = Guid.NewGuid(), Name = "Panadería", Description = "Pan y productos de panadería" }
        };

        foreach (var cat in categories)
        {
            var catId = cat.Id;
            var catName = cat.Name;
            var catDesc = cat.Description;
            var now = DateTime.UtcNow;

            await _context.Database.ExecuteSqlRawAsync(
                @"INSERT INTO product.""categories"" (""Id"", ""Name"", ""Description"", ""IsActive"", ""TenantId"", ""CreatedAt"", ""UpdatedAt"")
                  VALUES ({0}, {1}, {2}, {3}, {4}, {5}, {6})",
                catId, catName, catDesc, true, tenantId, now, now
            );
        }

        _logger.LogInformation("Seeded {Count} demo categories", categories.Length);
    }

    private async Task SeedProductsAsync(string tenantId, string storeId)
    {
        // Obtenemos las categorías recién creadas
        var categories = await _context.Database
            .SqlQueryRaw<CategoryDto>(@"SELECT ""Id"", ""Name"" FROM product.""categories"" WHERE ""TenantId"" = {0}", tenantId)
            .ToListAsync();

        if (!categories.Any())
        {
            _logger.LogWarning("No categories found for seeding products");
            return;
        }

        var products = new[]
        {
            // Bebidas (3 productos)
            new { Code = "BEB001", Name = "Coca Cola 500ml", CategoryName = "Bebidas", Cost = 1.50m, Price = 2.50m },
            new { Code = "BEB002", Name = "Inca Kola 500ml", CategoryName = "Bebidas", Cost = 1.50m, Price = 2.50m },
            new { Code = "BEB003", Name = "Agua San Luis 625ml", CategoryName = "Bebidas", Cost = 0.80m, Price = 1.50m },

            // Snacks (2 productos)
            new { Code = "SNK001", Name = "Papas Lays Clásicas", CategoryName = "Snacks", Cost = 2.00m, Price = 3.50m },
            new { Code = "SNK002", Name = "Galletas Oreo", CategoryName = "Snacks", Cost = 2.50m, Price = 4.00m },

            // Abarrotes (2 productos)
            new { Code = "ABA001", Name = "Arroz Superior 1kg", CategoryName = "Abarrotes", Cost = 3.50m, Price = 5.50m },
            new { Code = "ABA002", Name = "Aceite Primor 1L", CategoryName = "Abarrotes", Cost = 8.00m, Price = 12.00m },

            // Lácteos (2 productos)
            new { Code = "LAC001", Name = "Leche Gloria 1L", CategoryName = "Lácteos", Cost = 3.80m, Price = 5.50m },
            new { Code = "LAC002", Name = "Yogurt Gloria Fresa 1L", CategoryName = "Lácteos", Cost = 4.50m, Price = 7.00m },

            // Panadería (1 producto)
            new { Code = "PAN001", Name = "Pan Francés", CategoryName = "Panadería", Cost = 0.10m, Price = 0.30m }
        };

        foreach (var prod in products)
        {
            var category = categories.FirstOrDefault(c => c.Name == prod.CategoryName);
            if (category == null) continue;

            var productId = Guid.NewGuid();
            var storeProductId = Guid.NewGuid();
            var now = DateTime.UtcNow;

            // Insertar producto en Product Service
            await _context.Database.ExecuteSqlRawAsync(
                @"INSERT INTO product.""products"" (""Id"", ""Code"", ""Name"", ""Description"", ""CategoryId"", ""PurchasePrice"", ""SalePrice"", ""WholesalePrice"", ""IsActive"", ""TenantId"", ""CreatedAt"", ""UpdatedAt"")
                  VALUES ({0}, {1}, {2}, {3}, {4}, {5}, {6}, {7}, {8}, {9}, {10}, {11})",
                productId, prod.Code, prod.Name, "", category.Id, prod.Cost, prod.Price, prod.Price * 0.9m, true, tenantId, now, now
            );

            // Insertar stock inicial (100 unidades por producto)
            await _context.Database.ExecuteSqlRawAsync(
                @"INSERT INTO inventory.""StoreInventories"" (""Id"", ""ProductId"", ""StoreId"", ""CurrentStock"", ""MinimumStock"", ""CreatedAt"", ""UpdatedAt"")
                  VALUES ({0}, {1}, {2}, {3}, {4}, {5}, {6})",
                storeProductId, productId, Guid.Parse(storeId), 100, 10, now, now
            );
        }

        _logger.LogInformation("Seeded {Count} demo products with stock", products.Length);
    }

    private async Task SeedSalesAsync(string tenantId, string storeId, Guid userId)
    {
        // Obtenemos productos para crear ventas
        var products = await _context.Database
            .SqlQueryRaw<ProductDto>(
                @"SELECT p.""Id"", p.""Code"", p.""Name"", p.""SalePrice"" as ""Price""
                  FROM product.""products"" p
                  WHERE p.""TenantId"" = {0}
                  LIMIT 10",
                tenantId)
            .ToListAsync();

        if (!products.Any())
        {
            _logger.LogWarning("No products found for seeding sales");
            return;
        }

        var random = new Random();
        var salesCount = 0;

        // Crear ventas de los últimos 7 días
        for (int day = 7; day >= 0; day--)
        {
            var saleDate = DateTime.UtcNow.AddDays(-day);
            var dailySales = random.Next(2, 5); // 2-4 ventas por día

            for (int i = 0; i < dailySales; i++)
            {
                var saleId = Guid.NewGuid();
                var saleNumber = $"V-{saleDate:yyyyMMdd}-{salesCount + 1:D4}";
                var itemCount = random.Next(1, 5); // 1-4 items por venta
                var saleItems = new List<SaleItemDto>();
                decimal subtotal = 0;

                for (int j = 0; j < itemCount; j++)
                {
                    var product = products[random.Next(products.Count)];
                    var quantity = random.Next(1, 4);
                    var itemSubtotal = product.Price * quantity;
                    subtotal += itemSubtotal;

                    saleItems.Add(new SaleItemDto
                    {
                        Id = Guid.NewGuid(),
                        SaleId = saleId,
                        ProductId = product.Id,
                        ProductCode = product.Code,
                        ProductName = product.Name,
                        Quantity = quantity,
                        UnitPrice = product.Price,
                        Subtotal = itemSubtotal
                    });
                }

                // Calcular montos
                decimal discountAmount = 0;
                decimal taxAmount = subtotal * 0.18m; // IGV 18%
                decimal total = subtotal + taxAmount - discountAmount;

                // Variables locales para ExecuteSqlRawAsync
                var saleIdVar = saleId;
                var saleNumberVar = saleNumber;
                var storeIdVar = Guid.Parse(storeId);
                var cashierIdVar = userId;
                var saleDateVar = saleDate;
                var subtotalVar = subtotal;
                var discountVar = discountAmount;
                var taxVar = taxAmount;
                var totalVar = total;
                var statusVar = 2; // 2 = Completed
                var now = DateTime.UtcNow;

                // Insertar venta
                await _context.Database.ExecuteSqlRawAsync(
                    @"INSERT INTO sales.""Sales"" (""Id"", ""SaleNumber"", ""StoreId"", ""CashierId"", ""SaleDate"", ""Subtotal"", ""DiscountAmount"", ""TaxAmount"", ""Total"", ""Status"", ""CreatedAt"", ""UpdatedAt"")
                      VALUES ({0}, {1}, {2}, {3}, {4}, {5}, {6}, {7}, {8}, {9}, {10}, {11})",
                    saleIdVar, saleNumberVar, storeIdVar, cashierIdVar, saleDateVar, subtotalVar, discountVar, taxVar, totalVar, statusVar, now, now
                );

                // Insertar items de venta
                foreach (var item in saleItems)
                {
                    var itemId = item.Id;
                    var itemSaleId = item.SaleId;
                    var itemProductId = item.ProductId;
                    var itemProductCode = item.ProductCode;
                    var itemProductName = item.ProductName;
                    var itemQuantity = item.Quantity;
                    var itemUnitPrice = item.UnitPrice;
                    var itemDiscount = 0m;
                    var itemSubtotal = item.Subtotal;

                    await _context.Database.ExecuteSqlRawAsync(
                        @"INSERT INTO sales.""SaleItems"" (""Id"", ""SaleId"", ""ProductId"", ""ProductCode"", ""ProductName"", ""Quantity"", ""UnitPrice"", ""DiscountAmount"", ""Subtotal"", ""CreatedAt"", ""UpdatedAt"")
                          VALUES ({0}, {1}, {2}, {3}, {4}, {5}, {6}, {7}, {8}, {9}, {10})",
                        itemId, itemSaleId, itemProductId, itemProductCode, itemProductName, itemQuantity, itemUnitPrice, itemDiscount, itemSubtotal, now, now
                    );
                }

                salesCount++;
            }
        }

        _logger.LogInformation("Seeded {Count} demo sales", salesCount);
    }

    public async Task SeedPermissionsAsync()
    {
        // Only seed if empty to allow UI changes to persist across restarts
        var existingCount = await _context.RoleModulePermissions.CountAsync();
        if (existingCount > 0)
        {
            _logger.LogInformation("Permissions matrix already exists, skipping initial seed.");
            return;
        }

        _logger.LogInformation("Refreshing role permissions matrix (Initial Seed)...");

        // Clear all existing permissions to apply the new consolidated matrix
        await _context.Database.ExecuteSqlRawAsync("TRUNCATE TABLE identity.\"RoleModulePermissions\" RESTART IDENTITY CASCADE;");

        var permissions = new List<(UserRole Role, string Module)>
        {
            // Admin (1) - Everything
            (UserRole.Admin, "dashboard"), (UserRole.Admin, "pos"), (UserRole.Admin, "stores"),
            (UserRole.Admin, "sales"), (UserRole.Admin, "customers"),
            (UserRole.Admin, "analytics"), (UserRole.Admin, "analytics_ia"), (UserRole.Admin, "analytics_ia_history"),
            (UserRole.Admin, "products"), (UserRole.Admin, "inventory"), (UserRole.Admin, "purchases"), (UserRole.Admin, "suppliers"),
            (UserRole.Admin, "settings"), (UserRole.Admin, "users"), (UserRole.Admin, "hardware"),

            // Manager (2)
            (UserRole.Manager, "dashboard"), (UserRole.Manager, "pos"), (UserRole.Manager, "stores"),
            (UserRole.Manager, "sales"), (UserRole.Manager, "customers"),
            (UserRole.Manager, "analytics"), (UserRole.Manager, "analytics_ia"), (UserRole.Manager, "analytics_ia_history"),
            (UserRole.Manager, "products"), (UserRole.Manager, "inventory"), (UserRole.Manager, "purchases"), (UserRole.Manager, "suppliers"),
            (UserRole.Manager, "settings"), (UserRole.Manager, "hardware"),

            // Cashier (4)
            (UserRole.Cashier, "pos"), (UserRole.Cashier, "sales"), (UserRole.Cashier, "customers"), (UserRole.Cashier, "stores"),

            // Logistics (8)
            (UserRole.Logistics, "products"), (UserRole.Logistics, "inventory"), (UserRole.Logistics, "purchases"), (UserRole.Logistics, "suppliers"), (UserRole.Logistics, "stores")
        };

        foreach (var p in permissions)
        {
            _context.RoleModulePermissions.Add(new RoleModulePermission
            {
                Role = p.Role,
                Module = p.Module
            });
        }

        await _context.SaveChangesAsync();
        _logger.LogInformation("Role permissions matrix seeded successfully");
    }

    public async Task SeedAppModulesAsync()
    {
        _logger.LogInformation("Checking system modules...");
        
        var modulesData = new List<(string Code, string Name, string Route, string Icon, string Group, int Order)>
        {
            // PRINCIPAL
            ("dashboard", "Dashboard", "/dashboard", "LayoutDashboard", "PRINCIPAL", 1),
            ("pos", "Punto de Venta", "/pos", "ShoppingCart", "PRINCIPAL", 2),
            ("stores", "Sucursales", "/stores", "Store", "PRINCIPAL", 3),
            
            // VENTAS
            ("sales", "Historial de Ventas", "/sales", "FileText", "VENTAS", 1),
            ("customers", "Clientes", "/customers", "Users", "VENTAS", 2),
            
            // INTELIGENCIA
            ("analytics", "Centro Analítico", "/analytics", "BarChart3", "INTELIGENCIA", 1),
            ("analytics_ia", "Analizador IA", "/analytics/ia", "BrainCircuit", "INTELIGENCIA", 2),
            ("analytics_ia_history", "Bitácora de IA", "/analytics/ia/vigilante/history", "Clock", "INTELIGENCIA", 3),
            
            // OPERACIONES
            ("products", "Catálogo de Productos", "/products", "Tags", "OPERACIONES", 1),
            ("inventory", "Control de Stock", "/inventory", "Package", "OPERACIONES", 2),
            ("purchases", "Gestión de Compras", "/purchases", "CreditCard", "OPERACIONES", 3),
            ("suppliers", "Proveedores", "/suppliers", "Truck", "OPERACIONES", 4),
            
            // CONFIGURACION
            ("settings", "Mi Empresa", "/settings", "Store", "CONFIGURACION", 1),
            ("users", "Usuarios y Roles", "/users", "UserCog", "CONFIGURACION", 2),
            ("hardware", "Hardware y Periféricos", "/settings/hardware", "Monitor", "CONFIGURACION", 3)
        };

        foreach (var mData in modulesData)
        {
            var exists = await _context.AppModules.AnyAsync(m => m.Code == mData.Code);
            if (!exists)
            {
                _context.AppModules.Add(new AppModule
                {
                    Id = Guid.NewGuid(),
                    Code = mData.Code,
                    Name = mData.Name,
                    Route = mData.Route,
                    Icon = mData.Icon,
                    GroupName = mData.Group,
                    SortOrder = mData.Order,
                    CreatedAt = DateTime.UtcNow,
                    IsActive = true,
                    IsVisibleInMenu = true
                });
                _logger.LogInformation("Module {Code} added to database.", mData.Code);
            }
        }

        await _context.SaveChangesAsync();

        // Also ensure permissions for Admin and Manager are present
        var rolesToSeed = new[] { UserRole.Admin, UserRole.Manager };
        foreach (var role in rolesToSeed)
        {
            foreach (var mData in modulesData)
            {
                var permExists = await _context.RoleModulePermissions.AnyAsync(p => p.Role == role && p.Module == mData.Code);
                if (!permExists)
                {
                    _context.RoleModulePermissions.Add(new RoleModulePermission
                    {
                        Role = role,
                        Module = mData.Code
                    });
                }
            }
        }
        await _context.SaveChangesAsync();
    }

    // DTOs para queries
    private class CategoryDto
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = string.Empty;
    }

    private class ProductDto
    {
        public Guid Id { get; set; }
        public string Code { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public decimal Price { get; set; }
    }

    private class SaleItemDto
    {
        public Guid Id { get; set; }
        public Guid SaleId { get; set; }
        public Guid ProductId { get; set; }
        public string ProductCode { get; set; } = string.Empty;
        public string ProductName { get; set; } = string.Empty;
        public int Quantity { get; set; }
        public decimal UnitPrice { get; set; }
        public decimal Subtotal { get; set; }
    }
}
