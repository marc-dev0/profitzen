namespace Profitzen.PaymentMethods.DTOs;

public class CalculateSaleRequest
{
    public List<SaleItemDto> Items { get; set; } = new();
    public decimal AmountReceived { get; set; }
    public string PaymentMethodId { get; set; } = string.Empty;
}

public class SaleItemDto
{
    public Guid ProductId { get; set; }
    public string ProductName { get; set; } = string.Empty;
    public string ProductCode { get; set; } = string.Empty;
    public decimal Quantity { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal DiscountAmount { get; set; }
    public decimal ConversionToBase { get; set; } = 1;
    public Guid? UOMId { get; set; }
    public string? UOMCode { get; set; }
}
