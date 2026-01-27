using Profitzen.Common.Domain;
using Profitzen.Customer.Domain.Enums;

namespace Profitzen.Customer.Domain.Entities;

public class Customer : BaseEntity
{
    public string TenantId { get; private set; } = string.Empty;
    public DocumentType DocumentType { get; private set; }
    public string DocumentNumber { get; private set; } = string.Empty;
    public string FirstName { get; private set; } = string.Empty;
    public string LastName { get; private set; } = string.Empty;
    public string? Email { get; private set; }
    public string? Phone { get; private set; }
    public string? Address { get; private set; }
    public decimal CreditLimit { get; private set; }
    public decimal CurrentDebt { get; private set; }
    public bool IsActive { get; private set; }

    public ICollection<Purchase> Purchases { get; private set; } = [];
    public ICollection<Credit> Credits { get; private set; } = [];

    private Customer() { }

    public Customer(
        string tenantId,
        DocumentType documentType,
        string documentNumber,
        string firstName,
        string lastName,
        string? email = null,
        string? phone = null,
        string? address = null,
        decimal creditLimit = 0)
    {
        TenantId = tenantId;
        DocumentType = documentType;
        DocumentNumber = documentNumber;
        FirstName = firstName;
        LastName = lastName;
        Email = email;
        Phone = phone;
        Address = address;
        CreditLimit = creditLimit;
        CurrentDebt = 0;
        IsActive = true;
    }

    public string GetFullName() => $"{FirstName} {LastName}";

    public void UpdateInfo(DocumentType documentType, string documentNumber, string firstName, string lastName, string? email, string? phone, string? address)
    {
        DocumentType = documentType;
        DocumentNumber = documentNumber;
        FirstName = firstName;
        LastName = lastName;
        Email = email;
        Phone = phone;
        Address = address;
    }

    public void UpdateCreditLimit(decimal newLimit)
    {
        if (newLimit < 0)
            throw new InvalidOperationException("Credit limit cannot be negative");

        CreditLimit = newLimit;
    }

    public void AddDebt(decimal amount)
    {
        if (amount <= 0)
            throw new InvalidOperationException("Debt amount must be positive");

        if (CurrentDebt + amount > CreditLimit)
            throw new InvalidOperationException("Debt exceeds credit limit");

        CurrentDebt += amount;
    }

    public void PayDebt(decimal amount)
    {
        if (amount <= 0)
            throw new InvalidOperationException("Payment amount must be positive");

        if (amount > CurrentDebt)
            throw new InvalidOperationException("Payment exceeds current debt");

        CurrentDebt -= amount;
    }

    public bool HasAvailableCredit(decimal amount) => CurrentDebt + amount <= CreditLimit;

    public decimal GetAvailableCredit() => CreditLimit - CurrentDebt;

    public void Deactivate()
    {
        if (CurrentDebt > 0)
            throw new InvalidOperationException("Cannot deactivate customer with pending debt");

        IsActive = false;
    }

    public void Activate()
    {
        IsActive = true;
    }
}
