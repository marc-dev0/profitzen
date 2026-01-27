using Profitzen.Common.Domain;

namespace Profitzen.Product.Domain.Entities;

public class ProductUOMConversion : BaseEntity
{
    public Guid ProductId { get; private set; }
    public Guid FromUOMId { get; private set; }
    public Guid ToUOMId { get; private set; }
    public decimal ConversionFactor { get; private set; }
    public bool IsDefault { get; private set; }

    public Product Product { get; private set; } = null!;

    private ProductUOMConversion() { }

    public ProductUOMConversion(
        Guid productId,
        Guid fromUOMId,
        Guid toUOMId,
        decimal conversionFactor,
        bool isDefault = false)
    {
        if (conversionFactor <= 0)
            throw new ArgumentException("Conversion factor must be greater than zero", nameof(conversionFactor));

        ProductId = productId;
        FromUOMId = fromUOMId;
        ToUOMId = toUOMId;
        ConversionFactor = conversionFactor;
        IsDefault = isDefault;
    }

    public void UpdateConversionFactor(decimal conversionFactor)
    {
        if (conversionFactor <= 0)
            throw new ArgumentException("Conversion factor must be greater than zero", nameof(conversionFactor));

        ConversionFactor = conversionFactor;
    }

    public void SetAsDefault()
    {
        IsDefault = true;
    }

    public void UnsetAsDefault()
    {
        IsDefault = false;
    }
}
