using Microsoft.EntityFrameworkCore;
using Profitzen.Identity.Infrastructure;

namespace Profitzen.Identity.Application.Services.Seeding;

public class TenantInitializer : ITenantInitializer
{
    private readonly IdentityDbContext _context;
    private readonly ILogger<TenantInitializer> _logger;

    public TenantInitializer(IdentityDbContext context, ILogger<TenantInitializer> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task InitializeNewTenantAsync(string tenantId)
    {
        _logger.LogInformation("Initializing essential data for new tenant: {TenantId}", tenantId);

        try
        {
            await InitializePriceListsAsync(tenantId);

            _logger.LogInformation("Tenant initialization completed successfully for {TenantId}", tenantId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error initializing tenant {TenantId}", tenantId);
            throw;
        }
    }

    private async Task InitializePriceListsAsync(string tenantId)
    {
        var existingPriceLists = await _context.Database
            .SqlQueryRaw<int>(@"SELECT COUNT(*) as ""Value"" FROM product.price_lists WHERE ""TenantId"" = {0}", tenantId)
            .FirstOrDefaultAsync();

        if (existingPriceLists > 0)
        {
            _logger.LogInformation("Price lists already exist for tenant {TenantId}, skipping initialization", tenantId);
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

        _logger.LogInformation("Initialized {Count} default price lists for tenant {TenantId}", priceLists.Length, tenantId);
    }
}
