namespace Profitzen.Product.Application.DTOs;

public class ProductSaleUOMPriceDto
{
    public Guid Id { get; set; }
    public Guid ProductSaleUOMId { get; set; }
    public Guid PriceListId { get; set; }
    public string PriceListName { get; set; } = string.Empty;
    public string PriceListCode { get; set; } = string.Empty;
    public decimal Price { get; set; }
}

public class CreateProductSaleUOMPriceDto
{
    public Guid ProductSaleUOMId { get; set; }
    public Guid PriceListId { get; set; }
    public decimal Price { get; set; }
}

public class UpdateProductSaleUOMPriceDto
{
    public decimal Price { get; set; }
}
