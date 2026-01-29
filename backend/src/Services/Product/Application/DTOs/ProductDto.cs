namespace Profitzen.Product.Application.DTOs;

public record ProductDto
{
    public Guid Id { get; init; }
    public string Code { get; init; } = string.Empty;
    public string? Barcode { get; init; }
    public string Name { get; init; } = string.Empty;
    public string Description { get; init; } = string.Empty;
    public string? ImageUrl { get; init; }
    public Guid CategoryId { get; init; }
    public string? CategoryName { get; set; }
    public decimal PurchasePrice { get; init; }
    public decimal SalePrice { get; init; }
    public decimal WholesalePrice { get; init; }
    public bool IsActive { get; init; }
    public Guid BaseUOMId { get; init; }
    public string? BaseUOMCode { get; set; }
    public string? BaseUOMName { get; set; }
    public bool AllowFractional { get; init; }
    public string? PurchaseConversionMethod { get; init; }
    public decimal? UnitCost { get; set; }
    public int? CurrentStock { get; set; }
    public int? MinimumStock { get; set; }
    public Guid? PurchaseUOMId { get; set; }
    public string? PurchaseUOMCode { get; set; }
    public string? PurchaseUOMName { get; set; }
    public List<ProductPurchaseUOMDto> PurchaseUOMs { get; init; } = new();
    public List<ProductSaleUOMDto> SaleUOMs { get; init; } = new();
    public DateTime CreatedAt { get; init; }
    public DateTime UpdatedAt { get; init; }
    public string? ShortScanCode { get; init; }  // Last 6 chars of code/barcode for quick scanning
}

public record CreateProductRequest
{
    public string Code { get; init; } = string.Empty;  // Optional - will be auto-generated if empty
    public string? Barcode { get; init; }
    public string? ShortScanCode { get; init; } // Optional short code for manual entry/POS
    public string Name { get; init; } = string.Empty;
    public string Description { get; init; } = string.Empty;
    public string? ImageUrl { get; init; }
    public Guid CategoryId { get; init; }
    public decimal PurchasePrice { get; init; }
    public decimal SalePrice { get; init; }
    public decimal WholesalePrice { get; init; }
    public Guid? BaseUOMId { get; init; }
    public bool AllowFractional { get; init; }
    public string? PurchaseConversionMethod { get; init; }
    public List<CreateProductPurchaseUOMRequest> PurchaseUOMs { get; init; } = new();
    public List<CreateProductSaleUOMRequest> SaleUOMs { get; init; } = new();
}

public record UpdateProductRequest
{
    public string Name { get; init; } = string.Empty;
    public string? Code { get; init; }
    public string? Barcode { get; init; }
    public string? ShortScanCode { get; init; }
    public string? Description { get; init; }
    public string? ImageUrl { get; init; }
    public Guid CategoryId { get; init; }
    public Guid BaseUOMId { get; init; }
    public bool AllowFractional { get; init; }
    public string? PurchaseConversionMethod { get; init; }
    public decimal PurchasePrice { get; init; }
    public decimal SalePrice { get; init; }
    public decimal WholesalePrice { get; init; }
    public bool IsActive { get; init; }
    public List<UpdateProductPurchaseUOMRequest>? PurchaseUOMs { get; init; }
    public List<UpdateProductSaleUOMRequest>? SaleUOMs { get; init; }
}

public record UpdateProductPurchaseUOMRequest
{
    public Guid UOMId { get; init; }
    public decimal ConversionToBase { get; init; }
    public bool IsDefault { get; init; }
}

public record UpdateProductSaleUOMRequest
{
    public Guid UOMId { get; init; }
    public decimal ConversionToBase { get; init; }
    public bool IsDefault { get; init; }
    public List<PriceByListRequest> PricesByList { get; init; } = new();
}

public record UnitOfMeasureDto
{
    public Guid Id { get; init; }
    public string Code { get; init; } = string.Empty;
    public string Name { get; init; } = string.Empty;
    public string Type { get; init; } = string.Empty;
    public bool IsActive { get; init; }
}

public record ProductUOMConversionDto
{
    public Guid Id { get; init; }
    public Guid ProductId { get; init; }
    public Guid FromUOMId { get; init; }
    public string FromUOMCode { get; init; } = string.Empty;
    public string FromUOMName { get; init; } = string.Empty;
    public Guid ToUOMId { get; init; }
    public string ToUOMCode { get; init; } = string.Empty;
    public string ToUOMName { get; init; } = string.Empty;
    public decimal ConversionFactor { get; init; }
    public bool IsDefault { get; init; }
}

public record CreateProductUOMConversionRequest
{
    public Guid FromUOMId { get; init; }
    public Guid ToUOMId { get; init; }
    public decimal ConversionFactor { get; init; }
    public bool IsDefault { get; init; }
}

public record ProductPurchaseUOMDto
{
    public Guid Id { get; init; }
    public Guid ProductId { get; init; }
    public Guid UOMId { get; init; }
    public string UOMCode { get; set; } = string.Empty;
    public string UOMName { get; set; } = string.Empty;
    public decimal ConversionToBase { get; init; }
    public bool IsDefault { get; init; }
    public bool IsActive { get; init; }
}

public record ProductSaleUOMDto
{
    public Guid Id { get; init; }
    public Guid ProductId { get; init; }
    public Guid UOMId { get; init; }
    public string UOMCode { get; set; } = string.Empty;
    public string UOMName { get; set; } = string.Empty;
    public decimal ConversionToBase { get; init; }
    public decimal Price { get; init; }
    public bool IsDefault { get; init; }
    public bool IsActive { get; init; }
    public List<ProductSaleUOMPriceDto> Prices { get; set; } = new();
}

public record CreateProductPurchaseUOMRequest
{
    public Guid UOMId { get; init; }
    public decimal ConversionToBase { get; init; }
    public bool IsDefault { get; init; }
}

public record CreateProductSaleUOMRequest
{
    public Guid UOMId { get; init; }
    public decimal ConversionToBase { get; init; }
    public decimal Price { get; init; }
    public bool IsDefault { get; init; }
    public List<PriceByListRequest> PricesByList { get; init; } = new();
}

public record PriceByListRequest
{
    public Guid PriceListId { get; init; }
    public decimal Price { get; init; }
}

public record UpdatePurchasePriceRequest
{
    public decimal PurchasePrice { get; init; }
}
