using Profitzen.Inventory.Domain.Enums;

namespace Profitzen.Inventory.Application.DTOs;

public record PurchaseDto(
    Guid Id,
    string PurchaseNumber,
    Guid SupplierId,
    string SupplierName,
    Guid StoreId,
    string DocumentType,
    DateTime PurchaseDate,
    PurchaseStatus Status,
    DateTime? ReceivedDate,
    Guid? ReceivedByUserId,
    decimal TotalAmount,
    string? InvoiceNumber,
    string? Notes,
    List<PurchaseDetailDto> Details,
    DateTime CreatedAt
);

public record PurchaseDetailDto(
    Guid Id,
    Guid ProductId,
    string ProductCode,
    string ProductName,
    Guid UOMId,
    string? UOMCode,
    string? UOMName,
    decimal Quantity,
    decimal UnitPrice,
    decimal Subtotal,
    decimal? BonusQuantity,
    Guid? BonusUOMId,
    string? BonusUOMCode,
    string? BonusUOMName,
    string? Barcode,
    DateTime? ExpirationDate = null
);

public record CreatePurchaseRequest
{
    public Guid SupplierId { get; init; }
    public Guid? StoreId { get; init; } 
    public string DocumentType { get; init; } = string.Empty;
    public DateTime PurchaseDate { get; init; }
    public string InvoiceNumber { get; init; } = string.Empty;
    public string? Notes { get; init; }
    public List<CreatePurchaseDetailRequest> Details { get; init; } = [];
}

public record ProductSearchDto(
    Guid Id,
    string Code,
    string Name,
    string? CategoryName,
    decimal PurchasePrice,
    decimal SalePrice,
    decimal CurrentStock,
    bool IsActive,
    decimal MinimumStock,
    string? Barcode = null,
    string? ShortScanCode = null,
    decimal UnitCost = 0,
    string? PurchaseUOMName = null,
    List<ProductSaleUOMDto>? SaleUOMs = null,
    string? BaseUOMCode = null,
    bool AllowFractional = false
);

public record ProductSaleUOMDto(
    Guid UOMId,
    string UOMCode,
    string UOMName,
    decimal ConversionToBase,
    bool IsDefault,
    decimal Price,
    string? Barcode = null,
    List<ProductPriceDto>? Prices = null
);

public record ProductPriceDto(
    Guid PriceListId,
    string PriceListCode,
    string PriceListName,
    decimal Price
);

public record CreatePurchaseDetailRequest
{
    public Guid ProductId { get; init; }
    public Guid UOMId { get; init; }
    public decimal Quantity { get; init; }
    public decimal UnitPrice { get; init; }
    public decimal? BonusQuantity { get; init; }
    public Guid? BonusUOMId { get; init; }
    public DateTime? ExpirationDate { get; init; }
}
