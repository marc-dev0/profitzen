using Profitzen.Common.Domain;

namespace Profitzen.Product.Domain.Entities;

public class ProductSaleUOMPrice : BaseEntity
{
    public Guid ProductSaleUOMId { get; private set; }
    public Guid PriceListId { get; private set; }
    public decimal Price { get; private set; }

    public ProductSaleUOM ProductSaleUOM { get; private set; } = null!;
    public PriceList PriceList { get; private set; } = null!;

    private ProductSaleUOMPrice() { }

    public ProductSaleUOMPrice(Guid productSaleUOMId, Guid priceListId, decimal price)
    {
        ProductSaleUOMId = productSaleUOMId;
        PriceListId = priceListId;
        Price = price;
    }

    public void UpdatePrice(decimal price)
    {
        if (price < 0)
            throw new ArgumentException("Price cannot be negative", nameof(price));

        Price = price;
        UpdatedAt = DateTime.UtcNow;
    }
}
