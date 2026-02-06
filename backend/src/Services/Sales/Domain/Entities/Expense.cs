using Profitzen.Common.Domain;
using Profitzen.Sales.Domain.Enums;
using Profitzen.Common.Extensions;

namespace Profitzen.Sales.Domain.Entities;

public class Expense : BaseEntity
{
    public string TenantId { get; private set; } = string.Empty;
    public Guid StoreId { get; private set; }
    public string Description { get; private set; } = string.Empty;
    public string Category { get; private set; } = string.Empty; // e.g., Services, Rent, Salary, Others
    public decimal Amount { get; private set; }
    public DateTime Date { get; private set; }
    public PaymentMethod PaymentMethod { get; private set; }
    public bool IsPaid { get; private set; }
    public DateTime? DueDate { get; private set; }
    public string? Reference { get; private set; }
    public string? Notes { get; private set; }
    public bool IsActive { get; private set; } = true;

    private Expense() { }

    public Expense(
        string tenantId,
        Guid storeId,
        string description,
        string category,
        decimal amount,
        DateTime date,
        PaymentMethod paymentMethod,
        bool isPaid = true,
        DateTime? dueDate = null,
        string? reference = null,
        string? notes = null)
    {
        TenantId = tenantId;
        StoreId = storeId;
        Description = description;
        Category = category;
        Amount = amount;
        Date = date.ToBusinessDate();
        PaymentMethod = paymentMethod;
        IsPaid = isPaid;
        DueDate = dueDate?.ToBusinessDate();
        Reference = reference;
        Notes = notes;
    }

    public void Update(
        string description,
        string category,
        decimal amount,
        DateTime date,
        PaymentMethod paymentMethod,
        bool isPaid,
        DateTime? dueDate,
        string? reference,
        string? notes)
    {
        Description = description;
        Category = category;
        Amount = amount;
        Date = date.ToBusinessDate();
        PaymentMethod = paymentMethod;
        IsPaid = isPaid;
        DueDate = dueDate?.ToBusinessDate();
        Reference = reference;
        Notes = notes;
        UpdatedAt = DateTime.UtcNow;
    }

    public void MarkAsPaid()
    {
        IsPaid = true;
        UpdatedAt = DateTime.UtcNow;
    }

    public void Deactivate()
    {
        IsActive = false;
        UpdatedAt = DateTime.UtcNow;
    }

    public void Activate()
    {
        IsActive = true;
        UpdatedAt = DateTime.UtcNow;
    }
}
