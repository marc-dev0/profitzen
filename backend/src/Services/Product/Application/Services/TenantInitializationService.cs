using Microsoft.EntityFrameworkCore;
using Profitzen.Product.Infrastructure;

namespace Profitzen.Product.Application.Services;

public interface ITenantInitializationService
{
    Task InitializeTenantAsync(string tenantId);
}

public class TenantInitializationService : ITenantInitializationService
{
    private readonly ProductDbContext _context;
    private readonly ILogger<TenantInitializationService> _logger;

    public TenantInitializationService(ProductDbContext context, ILogger<TenantInitializationService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task InitializeTenantAsync(string tenantId)
    {
        _logger.LogInformation("Initializing Product service data for tenant: {TenantId}", tenantId);

        try
        {
            await InitializePriceListsAsync(tenantId);

            _logger.LogInformation("Product service initialization completed for tenant {TenantId}", tenantId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error initializing Product service for tenant {TenantId}", tenantId);
            throw;
        }
    }

    private async Task InitializePriceListsAsync(string tenantId)
    {
        var existingCount = await _context.PriceLists
            .Where(pl => pl.TenantId == tenantId)
            .CountAsync();

        if (existingCount > 0)
        {
            _logger.LogInformation("Price lists already exist for tenant {TenantId}, skipping", tenantId);
            return;
        }

        var priceLists = new[]
        {
            new Domain.Entities.PriceList("Minorista", "RETAIL", tenantId, "Precio de venta al por menor", isDefault: true),
            new Domain.Entities.PriceList("Mayorista", "WHOLESALE", tenantId, "Precio de venta al por mayor", isDefault: false),
            new Domain.Entities.PriceList("Distribuidor", "DISTRIBUTOR", tenantId, "Precio de venta para distribuidores", isDefault: false)
        };

        foreach (var priceList in priceLists)
        {
            await _context.PriceLists.AddAsync(priceList);
        }

        await _context.SaveChangesAsync();

        _logger.LogInformation("Created {Count} default price lists for tenant {TenantId}", priceLists.Length, tenantId);
    }
}
