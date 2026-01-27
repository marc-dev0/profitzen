namespace Profitzen.Inventory.Application.DTOs;

public record ProductDto(
    Guid Id,
    string Code,
    string Name,
    string Description,
    string? ImageUrl,
    Guid CategoryId,
    string CategoryName,
    decimal PurchasePrice,
    decimal SalePrice,
    decimal WholesalePrice,
    bool IsActive,
    DateTime CreatedAt
);

public record CreateProductRequest(
    string Code,
    string Name,
    string Description,
    Guid CategoryId,
    decimal PurchasePrice,
    decimal SalePrice,
    decimal WholesalePrice
);

public record UpdateProductRequest(
    string Name,
    string Description,
    Guid CategoryId,
    decimal PurchasePrice,
    decimal SalePrice,
    decimal WholesalePrice
);

public record StoreInventoryDto(
    Guid Id,
    Guid ProductId,
    string ProductCode,
    string ProductName,
    string? CategoryName,
    Guid StoreId,
    int CurrentStock,
    int MinimumStock,
    bool IsLowStock,
    DateTime CreatedAt,
    string? Barcode = null,
    string? ShortScanCode = null,
    decimal UnitCost = 0
);

public record CreateStoreInventoryRequest(
    Guid ProductId,
    int MinimumStock
);

public record UpdateStockRequest(
    int NewStock,
    string Reason
);

public record StockMovementRequest(
    int Quantity,
    string Reason,
    Guid? UOMId = null,
    string? UOMCode = null,
    int? OriginalQuantity = null,
    int? ConversionFactor = null
);

public record UpdateMinimumStockRequest(
    int MinimumStock
);