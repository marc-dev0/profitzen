using Profitzen.Common.Domain;

namespace Profitzen.Sales.Domain.Entities;

public class Customer : BaseEntity
{
    public string TenantId { get; private set; } = string.Empty;
    public string DocumentNumber { get; private set; } = string.Empty;
    public string Name { get; private set; } = string.Empty;
    public string? Email { get; private set; }
    public string? Phone { get; private set; }
    public string? Address { get; private set; }
    public Guid StoreId { get; private set; }
    public bool IsActive { get; private set; }
    public decimal CreditLimit { get; private set; }
    public decimal CurrentDebt { get; private set; }

    public ICollection<Sale> Sales { get; private set; } = [];

    private Customer() { }

    public Customer(string tenantId, string documentNumber, string name, Guid storeId,
                   string? email = null, string? phone = null, string? address = null,
                   decimal creditLimit = 0)
    {
        TenantId = tenantId;
        DocumentNumber = documentNumber;
        Name = name;
        Email = email;
        Phone = phone;
        Address = address;
        StoreId = storeId;
        IsActive = true;
        CreditLimit = creditLimit;
        CurrentDebt = 0;
    }

    public void UpdateContactInfo(string name, string? email = null, string? phone = null, string? address = null)
    {
        Name = name;
        Email = email;
        Phone = phone;
        Address = address;
    }

    public void UpdateCreditLimit(decimal newLimit)
    {
        CreditLimit = newLimit;
    }

    public void AddDebt(decimal amount)
    {
        CurrentDebt += amount;
    }

    public void PayDebt(decimal amount)
    {
        CurrentDebt = Math.Max(0, CurrentDebt - amount);
    }

    public decimal GetAvailableCredit()
    {
        return Math.Max(0, CreditLimit - CurrentDebt);
    }

    public bool CanPurchaseOnCredit(decimal amount)
    {
        return GetAvailableCredit() >= amount;
    }

    public void Deactivate()
    {
        IsActive = false;
    }

    public void Activate()
    {
        IsActive = true;
    }
}