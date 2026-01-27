using Profitzen.Common.Domain;

namespace Profitzen.Customer.Domain.Entities;

public class CreditPayment : BaseEntity
{
    public string TenantId { get; private set; } = string.Empty;
    public Guid CreditId { get; private set; }
    public decimal Amount { get; private set; }
    public DateTime PaymentDate { get; private set; }
    public string? Notes { get; private set; }

    public Credit Credit { get; private set; } = null!;

    private CreditPayment() { }

    public CreditPayment(string tenantId, Guid creditId, decimal amount, string? notes = null)
    {
        TenantId = tenantId;
        CreditId = creditId;
        Amount = amount;
        PaymentDate = DateTime.UtcNow;
        Notes = notes;
    }
}
