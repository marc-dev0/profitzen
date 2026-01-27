using Profitzen.Inventory.Application.DTOs;

namespace Profitzen.Inventory.Application.Services;

public interface IInventoryService
{
    Task<IEnumerable<StoreInventoryDto>> GetStoreInventoryAsync(Guid storeId, string? token = null);
    Task<IEnumerable<StoreInventoryDto>> GetLowStockProductsAsync(Guid storeId, string? token = null);
    Task<StoreInventoryDto?> GetStoreInventoryByIdAsync(Guid id, string? token = null);
    Task<StoreInventoryDto?> GetStoreInventoryByProductIdAsync(Guid productId, Guid storeId);
    Task<IEnumerable<StoreInventoryDto>> GetInventoriesByProductIdAsync(Guid productId, string tenantId);
    Task<StoreInventoryDto> CreateStoreInventoryAsync(CreateStoreInventoryRequest request, Guid storeId, string tenantId, Guid userId, string? token = null);
    Task<StoreInventoryDto> UpdateStockAsync(Guid storeInventoryId, UpdateStockRequest request, string tenantId, Guid userId, string? token = null);
    Task<StoreInventoryDto> AddStockAsync(Guid storeInventoryId, StockMovementRequest request, string tenantId, Guid userId, string? token = null);
    Task<StoreInventoryDto> RemoveStockAsync(Guid storeInventoryId, StockMovementRequest request, string tenantId, Guid userId, string? token = null);
    Task<StoreInventoryDto> UpdateMinimumStockAsync(Guid storeInventoryId, int minimumStock, string? token = null);

    Task<IEnumerable<SupplierDto>> GetSuppliersAsync(string tenantId);
    Task<SupplierDto?> GetSupplierByIdAsync(Guid id);
    Task<SupplierDto> CreateSupplierAsync(CreateSupplierRequest request, string tenantId, Guid userId);
    Task<SupplierDto> UpdateSupplierAsync(Guid id, UpdateSupplierRequest request, Guid userId);
    Task<bool> DeleteSupplierAsync(Guid id, Guid userId);

    Task<IEnumerable<PurchaseDto>> GetPurchasesAsync(Guid storeId, string? token = null);
    Task<PurchaseDto?> GetPurchaseByIdAsync(Guid id, string? tenantId = null, string? token = null);
    Task<PurchaseDto> CreatePurchaseAsync(CreatePurchaseRequest request, Guid storeId, string tenantId, Guid userId, string? token = null);
    Task<PurchaseDto> MarkPurchaseAsReceivedAsync(Guid purchaseId, Guid userId, string tenantId, string? token = null);
    Task<Dictionary<Guid, decimal>> GetLastPurchasePricesAsync(string tenantId);

    Task<IEnumerable<DocumentSeriesDto>> GetDocumentSeriesAsync(string tenantId, Guid storeId, string? documentType = null);
    Task<DocumentSeriesDto?> GetDocumentSeriesByIdAsync(Guid id);
    Task<DocumentSeriesDto> CreateDocumentSeriesAsync(CreateDocumentSeriesRequest request, string tenantId, Guid userId);
    Task<DocumentSeriesDto> UpdateDocumentSeriesAsync(Guid id, UpdateDocumentSeriesRequest request, Guid userId);
    Task<NextDocumentNumberDto> GetNextDocumentNumberAsync(string tenantId, Guid storeId, string documentType);

    Task<IEnumerable<ProductSearchDto>> SearchProductsAsync(string searchTerm, Guid storeId, string? token = null);
    Task<IEnumerable<ProductSearchDto>> GetAllProductsWithStockAsync(Guid storeId, string? token = null);

    Task<InventoryAdjustmentDto> CreateAdjustmentAsync(CreateInventoryAdjustmentRequest request, string tenantId, Guid userId, string? token = null);
    Task<string> CreateAdjustmentBatchAsync(BatchInventoryAdjustmentRequest request, string tenantId, Guid userId, string? token = null);
    Task<bool> TransferStockAsync(TransferStockRequest request, string tenantId, Guid userId);
    Task<string> TransferStockBatchAsync(TransferStockBatchRequest request, string tenantId, Guid userId);
    Task<IEnumerable<InventoryMovementDto>> GetInventoryMovementsAsync(Guid? storeId, string tenantId, Guid? productId = null, DateTime? fromDate = null, DateTime? toDate = null);

    // New Transfer Methods
    Task<TransferDto> CreateTransferAsync(CreateTransferRequest request, string tenantId, string? token = null);
    Task<TransferDto> GetTransferByIdAsync(Guid id, string tenantId);
    Task<IEnumerable<TransferDto>> GetTransfersAsync(Guid? originStoreId, Guid? destinationStoreId, string tenantId, string? token = null);
    Task<TransferDto> CompleteTransferAsync(Guid transferId, Guid userId, string tenantId, string? token = null);
    Task<TransferDto> CancelTransferAsync(Guid transferId, Guid userId, string tenantId);
    Task<TransferDto?> GetTransferByNumberAsync(string transferNumber, string tenantId);
}