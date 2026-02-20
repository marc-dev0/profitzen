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
    DateTime CreatedAt,
    decimal UnitCost = 0
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
    decimal CurrentStock,
    decimal MinimumStock,
    bool IsLowStock,
    DateTime CreatedAt,
    string? Barcode = null,
    string? ShortScanCode = null,
    decimal UnitCost = 0,
    decimal PurchasePrice = 0,
    string? PurchaseUOMName = null,
    string? BaseUOMCode = null
);

public record CreateStoreInventoryRequest(
    Guid ProductId,
    decimal MinimumStock
);

public record UpdateStockRequest(
    decimal NewStock,
    string Reason
);

public record StockMovementRequest(
    decimal Quantity,
    string Reason,
    Guid? UOMId = null,
    string? UOMCode = null,
    decimal? OriginalQuantity = null,
    decimal? ConversionFactor = null
);

public record UpdateMinimumStockRequest(
    decimal MinimumStock
);