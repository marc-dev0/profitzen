using System.Net.Http.Json;
using Profitzen.Common.Http;
using Profitzen.Sales.Application.DTOs;

namespace Profitzen.Sales.Application.Services;

public class InventoryClient : IInventoryClient
{
    private readonly ServiceHttpClient _serviceHttpClient;
    private readonly IConfiguration _configuration;
    private readonly ILogger<InventoryClient> _logger;

    public InventoryClient(
        ServiceHttpClient serviceHttpClient,
        IConfiguration configuration,
        ILogger<InventoryClient> logger)
    {
        _serviceHttpClient = serviceHttpClient;
        _configuration = configuration;
        _logger = logger;
    }

    public async Task<bool> ReduceStockAsync(Guid productId, Guid storeId, int quantity, string reason, string tenantId,
        Guid? uomId = null, string? uomCode = null, int? originalQuantity = null, int? conversionFactor = null)
    {
        var inventoryServiceUrl = _configuration["Services:Inventory:Url"];
        if (string.IsNullOrEmpty(inventoryServiceUrl))
        {
            _logger.LogWarning("Inventory service URL not configured. Stock reduction skipped.");
            return false;
        }

        try
        {
            _logger.LogInformation("Attempting to reduce stock. URL: {Url}, ProductId: {ProductId}, StoreId: {StoreId}, TenantId: {TenantId}",
                inventoryServiceUrl, productId, storeId, tenantId);

            var client = _serviceHttpClient.CreateClient(tenantId: tenantId);

            var requestUrl = $"{inventoryServiceUrl}/api/inventory/store-inventory/by-product-store?productId={productId}&storeId={storeId}";
            _logger.LogInformation("Calling Inventory service: {RequestUrl}", requestUrl);

            var inventoryResponse = await client.GetAsync(requestUrl);

            if (!inventoryResponse.IsSuccessStatusCode)
            {
                _logger.LogWarning("Could not find inventory for ProductId: {ProductId}, StoreId: {StoreId}. Status: {Status}",
                    productId, storeId, inventoryResponse.StatusCode);
                return false;
            }

            var inventory = await inventoryResponse.Content.ReadFromJsonAsync<StoreInventoryResponse>();
            if (inventory == null)
            {
                _logger.LogWarning("Inventory response was null for ProductId: {ProductId}, StoreId: {StoreId}",
                    productId, storeId);
                return false;
            }

            var reduceRequest = new
            {
                Quantity = quantity,
                Reason = reason,
                UOMId = uomId,
                UOMCode = uomCode,
                OriginalQuantity = originalQuantity,
                ConversionFactor = conversionFactor
            };

            var reduceResponse = await client.PostAsJsonAsync(
                $"{inventoryServiceUrl}/api/inventory/store-inventory/{inventory.Id}/stock/remove",
                reduceRequest);

            if (reduceResponse.IsSuccessStatusCode)
            {
                _logger.LogInformation("Stock reduced successfully. ProductId: {ProductId}, StoreId: {StoreId}, Quantity: {Quantity}",
                    productId, storeId, quantity);
                return true;
            }

            var errorContent = await reduceResponse.Content.ReadAsStringAsync();
            _logger.LogError("Failed to reduce stock. ProductId: {ProductId}, StoreId: {StoreId}, Status: {Status}, Error: {Error}",
                productId, storeId, reduceResponse.StatusCode, errorContent);
            return false;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error reducing stock for ProductId: {ProductId}, StoreId: {StoreId}",
                productId, storeId);
            return false;
        }
    }
    
    public async Task<bool> IncreaseStockAsync(Guid productId, Guid storeId, int quantity, string reason, string tenantId,
        Guid? uomId = null, string? uomCode = null, int? originalQuantity = null, int? conversionFactor = null)
    {
        var inventoryServiceUrl = _configuration["Services:Inventory:Url"];
        if (string.IsNullOrEmpty(inventoryServiceUrl))
        {
            _logger.LogWarning("Inventory service URL not configured. Stock increase skipped.");
            return false;
        }

        try
        {
            _logger.LogInformation("Attempting to increase stock. URL: {Url}, ProductId: {ProductId}, StoreId: {StoreId}, TenantId: {TenantId}",
                inventoryServiceUrl, productId, storeId, tenantId);

            var client = _serviceHttpClient.CreateClient(tenantId: tenantId);

            // First get the inventory ID
            var requestUrl = $"{inventoryServiceUrl}/api/inventory/store-inventory/by-product-store?productId={productId}&storeId={storeId}";
            var inventoryResponse = await client.GetAsync(requestUrl);

            if (!inventoryResponse.IsSuccessStatusCode)
            {
                _logger.LogWarning("Could not find inventory for ProductId: {ProductId}, StoreId: {StoreId}. Status: {Status}",
                    productId, storeId, inventoryResponse.StatusCode);
                return false;
            }

            var inventory = await inventoryResponse.Content.ReadFromJsonAsync<StoreInventoryResponse>();
            if (inventory == null)
            {
                _logger.LogWarning("Inventory response was null for ProductId: {ProductId}, StoreId: {StoreId}",
                    productId, storeId);
                return false;
            }

            var addRequest = new
            {
                Quantity = quantity,
                Reason = reason,
                UOMId = uomId,
                UOMCode = uomCode,
                OriginalQuantity = originalQuantity,
                ConversionFactor = conversionFactor
            };

            var addResponse = await client.PostAsJsonAsync(
                $"{inventoryServiceUrl}/api/inventory/store-inventory/{inventory.Id}/stock/add",
                addRequest);

            if (addResponse.IsSuccessStatusCode)
            {
                _logger.LogInformation("Stock increased successfully. ProductId: {ProductId}, StoreId: {StoreId}, Quantity: {Quantity}",
                    productId, storeId, quantity);
                return true;
            }

            var errorContent = await addResponse.Content.ReadAsStringAsync();
            _logger.LogError("Failed to increase stock. ProductId: {ProductId}, StoreId: {StoreId}, Status: {Status}, Error: {Error}",
                productId, storeId, addResponse.StatusCode, errorContent);
            return false;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error increasing stock for ProductId: {ProductId}, StoreId: {StoreId}",
                productId, storeId);
            return false;
        }
    }

    public async Task<List<LowStockAlertDto>> GetLowStockAlertsAsync(Guid storeId, string tenantId)
    {
        var inventoryServiceUrl = _configuration["Services:Inventory:Url"];
        if (string.IsNullOrEmpty(inventoryServiceUrl))
        {
            _logger.LogWarning("Inventory service URL not configured. Low stock alerts skipped.");
            return new List<LowStockAlertDto>();
        }

        try
        {
            var client = _serviceHttpClient.CreateClient(tenantId: tenantId);
            var requestUrl = $"{inventoryServiceUrl}/api/inventory/store-inventory/low-stock/by-store?storeId={storeId}";

            _logger.LogInformation("Fetching low stock alerts from: {RequestUrl}", requestUrl);

            var response = await client.GetAsync(requestUrl);

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning("Failed to get low stock alerts. Status: {Status}", response.StatusCode);
                return new List<LowStockAlertDto>();
            }

            var inventoryItems = await response.Content.ReadFromJsonAsync<List<StoreInventoryResponse>>();
            if (inventoryItems == null || inventoryItems.Count == 0)
            {
                return new List<LowStockAlertDto>();
            }

            return inventoryItems
                .Where(i => i.IsLowStock)
                .Select(i => new LowStockAlertDto(
                    i.ProductId,
                    i.ProductCode,
                    i.ProductName,
                    i.CurrentStock,
                    i.MinimumStock,
                    GetSeverity(i.CurrentStock, i.MinimumStock)
                ))
                .OrderBy(a => a.CurrentStock)
                .Take(10)
                .ToList();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching low stock alerts for StoreId: {StoreId}", storeId);
            return new List<LowStockAlertDto>();
        }
    }

    private static string GetSeverity(int currentStock, int minimumStock)
    {
        if (currentStock == 0) return "critical";
        if (currentStock <= minimumStock / 2) return "high";
        return "medium";
    }

    private record StoreInventoryResponse(
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
