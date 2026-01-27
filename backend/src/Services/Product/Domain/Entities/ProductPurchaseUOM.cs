using Profitzen.Common.Domain;

namespace Profitzen.Product.Domain.Entities;

public class ProductPurchaseUOM : BaseEntity
{
    public Guid ProductId { get; private set; }
    public Guid UOMId { get; private set; }
    public decimal ConversionToBase { get; private set; }
    public bool IsDefault { get; private set; }
    public bool IsActive { get; private set; }

    public Product Product { get; private set; } = null!;

    private ProductPurchaseUOM() { }

    public ProductPurchaseUOM(
        Guid productId,
        Guid uomId,
        decimal conversionToBase,
        bool isDefault = false)
    {
        if (conversionToBase <= 0)
            throw new ArgumentException("Conversion to base must be greater than zero", nameof(conversionToBase));

        ProductId = productId;
        UOMId = uomId;
        ConversionToBase = conversionToBase;
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
