using Sagr.Domain;

namespace Profitzen.Sales.Domain.Entities;

public class SaleItem : BaseEntity
{
    public string TenantId { get; private set; } = string.Empty;
    public Guid SaleId { get; internal set; }
    public Guid ProductId { get; private set; }
    public string ProductName { get; private set; } = string.Empty;
    public string ProductCode { get; private set; } = string.Empty;
    public decimal Quantity { get; private set; }
    public decimal UnitPrice { get; private set; }
    public decimal DiscountAmount { get; private set; }
    public decimal Subtotal { get; private set; }
    public decimal ConversionToBase { get; private set; } = 1;
    public Guid? UOMId { get; private set; }
    public string? UOMCode { get; private set; }

    public Sale Sale { get; private set; } = null!;

    private SaleItem() { }

    public SaleItem(string tenantId, Guid saleId, Guid productId, string productName, string productCode,
                   decimal quantity, decimal unitPrice, decimal discountAmount = 0, decimal conversionToBase = 1,
                   Guid? uomId = null, string? uomCode = null)
    {
        TenantId = tenantId;
        SaleId = saleId;
        ProductId = productId;
        ProductName = productName;
        ProductCode = productCode;
        Quantity = quantity;
        UnitPrice = unitPrice;
        DiscountAmount = discountAmount;
        ConversionToBase = conversionToBase;
        UOMId = uomId;
        UOMCode = uomCode;
        CalculateSubtotal();
    }

    internal SaleItem(string tenantId, Guid productId, string productName, string productCode,
                     decimal quantity, decimal unitPrice, decimal discountAmount = 0, decimal conversionToBase = 1,
                     Guid? uomId = null, string? uomCode = null)
    {
        TenantId = tenantId;
        ProductId = productId;
        ProductName = productName;
        ProductCode = productCode;
        Quantity = quantity;
        UnitPrice = unitPrice;
        DiscountAmount = discountAmount;
        ConversionToBase = conversionToBase;
        UOMId = uomId;
        UOMCode = uomCode;
        CalculateSubtotal();
    }

    public void UpdateQuantity(decimal newQuantity)
    {
        if (newQuantity <= 0)
            throw new ArgumentException("Quantity must be positive");

        Quantity = newQuantity;
        CalculateSubtotal();
    }

    public void UpdateDiscount(decimal discountAmount)
    {
        DiscountAmount = discountAmount;
        CalculateSubtotal();
    }

    private void CalculateSubtotal()
    {
        // Round to 2 decimal places using banker's rounding (ToEven) to match JavaScript's Math.round()
        // This ensures consistency between POS display and backend storage
        // Example: 1.225 rounds to 1.22 (not 1.23)
        var rawSubtotal = (UnitPrice * Quantity) - DiscountAmount;
        Subtotal = Math.Round(rawSubtotal, 2, MidpointRounding.ToEven);
    }
}
