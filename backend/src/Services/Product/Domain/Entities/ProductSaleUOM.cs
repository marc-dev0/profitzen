using Profitzen.Common.Domain;

namespace Profitzen.Product.Domain.Entities;

public class ProductSaleUOM : BaseEntity
{
    public Guid ProductId { get; private set; }
    public Guid UOMId { get; private set; }
    public decimal ConversionToBase { get; private set; }
    public decimal Price { get; private set; }
    public bool IsDefault { get; private set; }
    public bool IsActive { get; private set; }

    public Product Product { get; private set; } = null!;
    public ICollection<ProductSaleUOMPrice> Prices { get; private set; } = new List<ProductSaleUOMPrice>();

    private ProductSaleUOM() { }

    public ProductSaleUOM(
        Guid productId,
        Guid uomId,
        decimal conversionToBase,
        decimal price,
        bool isDefault = false)
    {
        if (conversionToBase <= 0)
            throw new ArgumentException("Conversion to base must be greater than zero", nameof(conversionToBase));
        if (price < 0)
            throw new ArgumentException("Price cannot be negative", nameof(price));

        ProductId = productId;
        UOMId = uomId;
        ConversionToBase = conversionToBase;
        Price = price;
        IsDefault = isDefault;
        IsActive = true;
    }

    public void SetAsDefault()
    {
        IsDefault = true;
        UpdatedAt = DateTime.UtcNow;
    }

    public void RemoveDefault()
    {
        IsDefault = false;
        UpdatedAt = DateTime.UtcNow;
    }

    public void UpdateConversion(decimal conversionToBase)
    {
        if (conversionToBase <= 0)
            throw new ArgumentException("Conversion to base must be greater than zero", nameof(conversionToBase));

        ConversionToBase = conversionToBase;
        UpdatedAt = DateTime.UtcNow;
    }

    public void UpdatePrice(decimal price)
    {
        if (price < 0)
            throw new ArgumentException("Price cannot be negative", nameof(price));

        Price = price;
        UpdatedAt = DateTime.UtcNow;
    }

    public void Deactivate()
    {
        IsActive = false;
        UpdatedAt = DateTime.UtcNow;
    }

    public void Activate()
    {
        IsActive = true;
        UpdatedAt = DateTime.UtcNow;
    }
}
