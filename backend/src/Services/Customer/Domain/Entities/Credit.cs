using Profitzen.Common.Domain;
using Profitzen.Common.Extensions;

namespace Profitzen.Customer.Domain.Entities;

public class Credit : BaseEntity
{
    public string TenantId { get; private set; } = string.Empty;
    public Guid CustomerId { get; private set; }
    public Guid StoreId { get; private set; } // Added StoreId
    public decimal Amount { get; private set; }
    public decimal RemainingAmount { get; private set; }
    public DateTime CreditDate { get; private set; }
    public DateTime? DueDate { get; private set; }
    public bool IsPaid { get; private set; }
    public DateTime? PaidDate { get; private set; }
    public string? Notes { get; private set; }

    public Customer Customer { get; private set; } = null!;
    public ICollection<CreditPayment> Payments { get; private set; } = [];

    private Credit() { }

    public Credit(string tenantId, Guid customerId, Guid storeId, decimal amount, DateTime? dueDate = null, string? notes = null)
    {
        TenantId = tenantId;
        CustomerId = customerId;
        StoreId = storeId;
        Amount = amount;
        RemainingAmount = amount;
        CreditDate = DateTime.UtcNow.ToBusinessDate();
        DueDate = dueDate?.ToBusinessDate();
        IsPaid = false;
        Notes = notes;
    }

    public void AddPayment(Guid storeId, decimal amount, string? notes = null)
    {
        if (amount <= 0)
            throw new InvalidOperationException("Payment amount must be positive");

        if (amount > RemainingAmount)
            throw new InvalidOperationException("Payment exceeds remaining amount");

        var payment = new CreditPayment(TenantId, Id, storeId, amount, notes);
        Payments.Add(payment);

        RemainingAmount -= amount;

        if (RemainingAmount == 0)
        {
            IsPaid = true;
            PaidDate = DateTime.UtcNow;
        }
    }

    public bool IsOverdue() => !IsPaid && DueDate.HasValue && DueDate.Value < DateTime.UtcNow;
}
