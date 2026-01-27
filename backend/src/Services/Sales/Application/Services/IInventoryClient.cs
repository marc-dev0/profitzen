using Profitzen.Sales.Application.DTOs;

namespace Profitzen.Sales.Application.Services;

public interface IInventoryClient
{
    Task<bool> ReduceStockAsync(Guid productId, Guid storeId, int quantity, string reason, string tenantId,
        Guid? uomId = null, string? uomCode = null, int? originalQuantity = null, int? conversionFactor = null);

    Task<bool> IncreaseStockAsync(Guid productId, Guid storeId, int quantity, string reason, string tenantId,
         Guid? uomId = null, string? uomCode = null, int? originalQuantity = null, int? conversionFactor = null);

    Task<List<LowStockAlertDto>> GetLowStockAlertsAsync(Guid storeId, string tenantId);
}
