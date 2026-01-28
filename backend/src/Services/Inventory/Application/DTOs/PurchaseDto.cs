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
    string? Barcode
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
    int CurrentStock,
    bool IsActive,
    int MinimumStock,
    string? Barcode = null,
    string? ShortScanCode = null,
    List<ProductSaleUOMDto>? SaleUOMs = null
);

public record ProductSaleUOMDto(
    Guid UOMId,
    string UOMCode,
    string UOMName,
    int ConversionToBase,
    bool IsDefault,
    decimal Price,
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
}
