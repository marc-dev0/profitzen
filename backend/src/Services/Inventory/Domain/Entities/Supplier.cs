using Profitzen.Common.Domain;

namespace Profitzen.Inventory.Domain.Entities;

public class Supplier : BaseEntity
{
    public string Code { get; private set; }
    public string Name { get; private set; }
    public string? ContactName { get; private set; }
    public string? Phone { get; private set; }
    public string? Email { get; private set; }
    public string? Address { get; private set; }
    public string? TaxId { get; private set; } // RUC en Perú
    public string TenantId { get; private set; }
    public bool IsActive { get; private set; }

    public ICollection<Purchase> Purchases { get; private set; } = [];

    private Supplier() { }

    public Supplier(
        string code,
        string name,
        string? contactName,
        string? phone,
        string? email,
        string? address,
        string? taxId,
        string tenantId)
    {
        Code = code;
        Name = name;
        ContactName = contactName;
        Phone = phone;
        Email = email;
        Address = address;
        TaxId = taxId;
        TenantId = tenantId;
        IsActive = true;
    }

    public void UpdateDetails(
        string name,
        string? contactName,
        string? phone,
        string? email,
        string? address,
        string? taxId)
    {
        Name = name;
        ContactName = contactName;
        Phone = phone;
        Email = email;
        Address = address;
        TaxId = taxId;
    }

    public void Deactivate() => IsActive = false;
    public void Activate() => IsActive = true;
}
