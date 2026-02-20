namespace Profitzen.PaymentMethods.DTOs;

public class CalculateSaleResponse
{
    public string CacheKey { get; set; } = string.Empty;
    public List<CalculatedItemDto> Items { get; set; } = new();
    public decimal Subtotal { get; set; }
    public decimal TaxAmount { get; set; }
    public decimal Total { get; set; }
    public decimal RoundingAdjustment { get; set; }
    public decimal FinalTotal { get; set; }
    public decimal AmountReceived { get; set; }
    public decimal ChangeAmount { get; set; }
    public bool IsPaymentSufficient { get; set; }
}

public class CalculatedItemDto
{
    public Guid ProductId { get; set; }
    public string ProductName { get; set; } = string.Empty;
    public string ProductCode { get; set; } = string.Empty;
    public decimal Quantity { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal DiscountAmount { get; set; }
    public decimal Subtotal { get; set; }
    public decimal ConversionToBase { get; set; }
    public Guid? UOMId { get; set; }
    public string? UOMCode { get; set; }
}
