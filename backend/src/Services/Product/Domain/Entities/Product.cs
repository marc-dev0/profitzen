using Profitzen.Common.Domain;

namespace Profitzen.Product.Domain.Entities;

public class Product : BaseEntity
{
    public string Code { get; private set; } = string.Empty;  // Auto-generated: PROD-000001
    public string? Barcode { get; private set; }  // EAN13, UPC, etc.
    public string Name { get; private set; } = string.Empty;
    public string Description { get; private set; } = string.Empty;
    public string? ImageUrl { get; private set; }
    public Guid CategoryId { get; private set; }
    public string? CategoryName { get; private set; }
    public decimal PurchasePrice { get; private set; }
    public decimal SalePrice { get; private set; }
    public decimal WholesalePrice { get; private set; }
    public string TenantId { get; private set; } = string.Empty;
    public bool IsActive { get; private set; }
    public Guid BaseUOMId { get; private set; }
    public bool AllowFractional { get; private set; }
    public string PurchaseConversionMethod { get; private set; } = "base"; // "base" or "previous"

    public string? ShortScanCode { get; private set; } // Optional short code for POS scanning

    public ICollection<ProductUOMConversion> UOMConversions { get; private set; } = new List<ProductUOMConversion>();
    public ICollection<ProductPurchaseUOM> PurchaseUOMs { get; private set; } = new List<ProductPurchaseUOM>();
    public ICollection<ProductSaleUOM> SaleUOMs { get; private set; } = new List<ProductSaleUOM>();

    private Product() { }

    public Product(string code, string name, string description, Guid categoryId,
                  decimal purchasePrice, decimal salePrice, decimal wholesalePrice, string tenantId,
                  Guid? baseUOMId = null, string? barcode = null, bool allowFractional = false, 
                  string? categoryName = null, string? shortScanCode = null, string? purchaseConversionMethod = "base")
    {
        Code = code;  // Will be auto-generated in service if empty
        Barcode = barcode;
        ShortScanCode = shortScanCode;
        Name = name;
        Description = description;
        CategoryId = categoryId;
        CategoryName = categoryName;
        PurchasePrice = purchasePrice;
        SalePrice = salePrice;
        WholesalePrice = wholesalePrice;
        TenantId = tenantId;
        // Default to Guid.Empty if not provided - will be updated after UOM seeding
        BaseUOMId = baseUOMId ?? Guid.Empty;
        AllowFractional = allowFractional;
        PurchaseConversionMethod = purchaseConversionMethod ?? "base";
        IsActive = true;
    }

    public void SetCode(string code)
    {
        if (string.IsNullOrWhiteSpace(code))
            throw new ArgumentException("Code cannot be empty", nameof(code));
        Code = code;
    }

    public void SetBarcode(string? barcode)
    {
        Barcode = barcode;
    }

    public void SetShortScanCode(string? shortScanCode)
    {
        ShortScanCode = shortScanCode;
    }

    public void Update(string name, string description, Guid categoryId, string? categoryName = null, string? purchaseConversionMethod = null)
    {
        Name = name;
        Description = description;
        CategoryId = categoryId;
        CategoryName = categoryName;
        if (purchaseConversionMethod != null)
        {
            PurchaseConversionMethod = purchaseConversionMethod;
        }
    }

    public void UpdatePrices(decimal purchasePrice, decimal salePrice, decimal wholesalePrice)
    {
        PurchasePrice = purchasePrice;
        SalePrice = salePrice;
        WholesalePrice = wholesalePrice;
    }

    public void UpdatePurchasePrice(decimal purchasePrice)
    {
        if (purchasePrice < 0)
            throw new ArgumentException("Purchase price cannot be negative", nameof(purchasePrice));
        PurchasePrice = purchasePrice;
        UpdatedAt = DateTime.UtcNow;
    }

    public void SetImage(string imageUrl)
    {
        ImageUrl = imageUrl;
    }

    public void Deactivate()
    {
        IsActive = false;
    }

    public void Activate()
    {
        IsActive = true;
    }

    public void ConfigureUOM(Guid baseUOMId, bool allowFractional)
    {
        BaseUOMId = baseUOMId;
        AllowFractional = allowFractional;
        UpdatedAt = DateTime.UtcNow;
    }

    public void AddUOMConversion(ProductUOMConversion conversion)
    {
        if (conversion.ProductId != Id)
            throw new InvalidOperationException("Conversion does not belong to this product");

        UOMConversions.Add(conversion);
    }
}
