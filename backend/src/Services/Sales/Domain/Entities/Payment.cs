using Profitzen.Common.Domain;
using Profitzen.Sales.Domain.Enums;

namespace Profitzen.Sales.Domain.Entities;

public class Payment : BaseEntity
{
    public string TenantId { get; private set; } = string.Empty;
    public Guid SaleId { get; private set; }
    public PaymentMethod Method { get; private set; }
    public decimal Amount { get; private set; }
    public string? Reference { get; private set; }
    public DateTime PaymentDate { get; private set; }

    public Sale Sale { get; private set; } = null!;

    private Payment() { }

    public Payment(string tenantId, Guid saleId, PaymentMethod method, decimal amount, string? reference = null)
    {
        TenantId = tenantId;
        SaleId = saleId;
        Method = method;
        Amount = amount;
        Reference = reference;
        PaymentDate = DateTime.UtcNow;
    }
}