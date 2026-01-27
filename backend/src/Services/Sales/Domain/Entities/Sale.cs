using Profitzen.Common.Domain;
using Profitzen.Sales.Domain.Enums;

namespace Profitzen.Sales.Domain.Entities;

public class Sale : BaseEntity
{
    public string TenantId { get; private set; } = string.Empty;
    public string SaleNumber { get; private set; } = string.Empty;
    public Guid StoreId { get; private set; }
    public Guid CashierId { get; private set; }
    public Guid? CustomerId { get; private set; }
    public DateTime SaleDate { get; private set; }
    public decimal Subtotal { get; private set; }
    public decimal DiscountAmount { get; private set; }
    public decimal TaxAmount { get; private set; }
    public decimal Total { get; private set; }
    public SaleStatus Status { get; private set; }
    public string? Notes { get; private set; }

    public Customer? Customer { get; private set; }
    public ICollection<SaleItem> Items { get; private set; } = [];
    public ICollection<Payment> Payments { get; private set; } = [];

    public string? DocumentType { get; private set; } // 01=Factura, 03=Boleta, 80=NotaVenta
    public string? DocumentSeries { get; private set; }
    public string? DocumentNumber { get; private set; }

    private Sale() { }

    public Sale(string tenantId, Guid storeId, Guid cashierId, Guid? customerId = null, string? notes = null, string? documentType = null)
    {
        TenantId = tenantId;
        SaleNumber = GenerateSaleNumber();
        StoreId = storeId;
        CashierId = cashierId;
        CustomerId = customerId;
        SaleDate = DateTime.UtcNow;
        Status = SaleStatus.Pending;
        Notes = notes;
        Subtotal = 0;
        DiscountAmount = 0;
        TaxAmount = 0;
        Total = 0;
        DocumentType = documentType ?? "80"; // Default to Nota de Venta if not specified
    }

    public void AddItem(Guid productId, string productName, string productCode,
                       int quantity, decimal unitPrice, decimal discount = 0, decimal conversionToBase = 1,
                       Guid? uomId = null, string? uomCode = null)
    {
        if (Status != SaleStatus.Pending)
            throw new InvalidOperationException("Cannot modify a completed sale");

        var existingItem = Items.FirstOrDefault(i => i.ProductId == productId && i.UOMId == uomId);
        if (existingItem != null)
        {
            existingItem.UpdateQuantity(existingItem.Quantity + quantity);
        }
        else
        {
            var item = new SaleItem(TenantId, productId, productName, productCode, quantity, unitPrice, discount, conversionToBase, uomId, uomCode);
            Items.Add(item);
        }

        RecalculateTotal();
    }

    public void RemoveItem(Guid productId)
    {
        if (Status != SaleStatus.Pending)
            throw new InvalidOperationException("Cannot modify a completed sale");

        var item = Items.FirstOrDefault(i => i.ProductId == productId);
        if (item != null)
        {
            Items.Remove(item);
            RecalculateTotal();
        }
    }

    public void UpdateItemQuantity(Guid productId, int newQuantity)
    {
        if (Status != SaleStatus.Pending)
            throw new InvalidOperationException("Cannot modify a completed sale");

        var item = Items.FirstOrDefault(i => i.ProductId == productId);
        if (item != null)
        {
            if (newQuantity <= 0)
            {
                Items.Remove(item);
            }
            else
            {
                item.UpdateQuantity(newQuantity);
            }
            RecalculateTotal();
        }
    }

    public void ApplyDiscount(decimal discountAmount)
    {
        if (Status != SaleStatus.Pending)
            throw new InvalidOperationException("Cannot modify a completed sale");

        DiscountAmount = discountAmount;
        RecalculateTotal();
    }

    public void AddPayment(PaymentMethod method, decimal amount, string? reference = null)
    {
        if (Status != SaleStatus.Pending)
            throw new InvalidOperationException("Cannot add payment to completed sale");

        var payment = new Payment(TenantId, Id, method, amount, reference);
        Payments.Add(payment);

        var totalPaid = Payments.Sum(p => p.Amount);
        if (totalPaid >= Total)
        {
            Complete();
        }
    }

    public void Complete(string? documentSeries = null, string? documentNumber = null)
    {
        if (!Items.Any())
            throw new InvalidOperationException("Cannot complete sale without items");

        var totalPaid = Payments.Sum(p => p.Amount);
        // Small tolerance for floating point issues or rounding
        if (totalPaid < Total - 0.05m) 
            throw new InvalidOperationException($"Insufficient payment amount. Paid: {totalPaid}, Total: {Total}");

        Status = SaleStatus.Completed;
        DocumentSeries = documentSeries;
        DocumentNumber = documentNumber;
        
        // If we have a valid document number, we might want to override the internal SaleNumber or keep it as reference
        // For now, SaleNumber is internal ID, DocumentNumber is Tax ID.
    }



    public void Refund()
    {
        if (Status != SaleStatus.Completed)
            throw new InvalidOperationException("Only completed sales can be refunded");

        Status = SaleStatus.Refunded;
    }

    public decimal GetPaidAmount() => Payments.Sum(p => p.Amount);
    public decimal GetRemainingAmount() => Total - GetPaidAmount();
    public bool IsFullyPaid() => GetPaidAmount() >= Total;

    private void RecalculateTotal()
    {
        var grossTotal = Items.Sum(i => i.Subtotal);
        Total = grossTotal - DiscountAmount;
        
        // Back-calculate Subtotal and Tax assuming Total includes 18% IGV
        // Total = Subtotal * 1.18
        // Subtotal = Total / 1.18
        Subtotal = Total / 1.18m;
        TaxAmount = Total - Subtotal;
    }

    private static string GenerateSaleNumber()
    {
        return $"V{DateTime.UtcNow:yyyyMMdd}{DateTime.UtcNow.Ticks.ToString()[^6..]}";
    }
}