using Profitzen.Product.Application.DTOs;
using Profitzen.Common.Services;
using Profitzen.Common.Http;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Configuration;
using System.Text.Json;

namespace Profitzen.Product.Application.Services;

public class DataEnrichmentService : IDataEnrichmentService
{
    private readonly IMasterDataCacheService _masterDataCache;
    private readonly ServiceHttpClient _serviceHttpClient;
    private readonly IConfiguration _configuration;
    private readonly ILogger<DataEnrichmentService> _logger;

    public DataEnrichmentService(
        IMasterDataCacheService masterDataCache,
        ServiceHttpClient serviceHttpClient,
        IConfiguration configuration,
        ILogger<DataEnrichmentService> logger)
    {
        _masterDataCache = masterDataCache;
        _serviceHttpClient = serviceHttpClient;
        _configuration = configuration;
        _logger = logger;
    }

    public async Task EnrichProductsAsync(IEnumerable<ProductDto> products, string? tenantId = null, Guid? storeId = null)
    {
        _logger.LogInformation("Enriching {Count} products", products.Count());

        foreach (var product in products)
        {
            await EnrichProductInternalAsync(product, tenantId, storeId);
        }
    }

    public async Task EnrichProductAsync(ProductDto product, string? tenantId = null, Guid? storeId = null)
    {
        await EnrichProductInternalAsync(product, tenantId, storeId);
    }

    private async Task EnrichProductInternalAsync(ProductDto product, string? tenantId = null, Guid? storeId = null)
    {
        var categoryName = await _masterDataCache.GetCategoryNameAsync(product.CategoryId, tenantId);
        if (categoryName != null)
        {
            product.CategoryName = categoryName;
        }

        var baseUOM = await _masterDataCache.GetUOMAsync(product.BaseUOMId, tenantId);
        if (baseUOM != null)
        {
            product.BaseUOMCode = baseUOM.Value.Code;
            product.BaseUOMName = baseUOM.Value.Name;
        }

        if (product.PurchaseUOMId.HasValue)
        {
            var pUom = await _masterDataCache.GetUOMAsync(product.PurchaseUOMId.Value, tenantId);
            if (pUom != null)
            {
                product.PurchaseUOMCode = pUom.Value.Code;
                product.PurchaseUOMName = pUom.Value.Name;
            }
        }

        if (product.SaleUOMs != null)
        {
            foreach (var saleUOM in product.SaleUOMs)
            {
                var uom = await _masterDataCache.GetUOMAsync(saleUOM.UOMId, tenantId);
                if (uom != null)
                {
                    saleUOM.UOMCode = uom.Value.Code;
                    saleUOM.UOMName = uom.Value.Name;
                }
            }
        }

        if (product.PurchaseUOMs != null)
        {
            foreach (var purchaseUOM in product.PurchaseUOMs)
            {
                var uom = await _masterDataCache.GetUOMAsync(purchaseUOM.UOMId, tenantId);
                if (uom != null)
                {
                    purchaseUOM.UOMCode = uom.Value.Code;
                    purchaseUOM.UOMName = uom.Value.Name;
                }
            }
        }

        // Enrich with inventory stock
        /*
        var stock = await GetInventoryStockAsync(product.Id, tenantId, storeId);
        if (stock != null)
        {
            product.CurrentStock = stock.Value.CurrentStock;
            product.MinimumStock = stock.Value.MinimumStock;
        }
        else
        {
            product.CurrentStock = 0;
            product.MinimumStock = 0;
        }
        */
    }

    private async Task<(int CurrentStock, int MinimumStock)?> GetInventoryStockAsync(Guid productId, string? tenantId, Guid? storeId)
    {
        try
        {
            var inventoryServiceUrl = _configuration["Services:Inventory:Url"];
            if (string.IsNullOrEmpty(inventoryServiceUrl))
            {
                _logger.LogWarning("Inventory service URL not configured");
                return null;
            }

            var client = _serviceHttpClient.CreateClient(tenantId: tenantId);
            var response = await client.GetAsync($"{inventoryServiceUrl}/api/inventory/store-inventory/by-product/{productId}");

            if (response.IsSuccessStatusCode)
            {
                var json = await response.Content.ReadAsStringAsync();
                var inventories = JsonSerializer.Deserialize<List<StoreInventoryDto>>(json, new JsonSerializerOptions
                {
                    PropertyNameCaseInsensitive = true
                });

                if (inventories != null && inventories.Any())
                {
                    if (storeId.HasValue && storeId.Value != Guid.Empty) 
                    {
                         // Filter by specific store
                         var storeInventory = inventories.FirstOrDefault(i => i.StoreId == storeId.Value);
                         if (storeInventory != null)
                         {
                             return (storeInventory.CurrentStock, storeInventory.MinimumStock);
                         } 
                         else 
                         {
                             return (0, 0);
                         }
                    }

                    // Sum stock from all stores for this tenant (Legacy behavior if no storeId provided)
                    var totalStock = inventories.Sum(i => i.CurrentStock);
                    var minStock = inventories.Max(i => i.MinimumStock);
                    return (totalStock, minStock);
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting inventory stock for product {ProductId}", productId);
        }

        return null;
    }

    private record StoreInventoryDto(
        Guid Id,
        Guid ProductId,
        string ProductCode,
        string ProductName,
        Guid StoreId,
        int CurrentStock,
        int MinimumStock,
        bool IsLowStock,
        DateTime CreatedAt
    );
}
