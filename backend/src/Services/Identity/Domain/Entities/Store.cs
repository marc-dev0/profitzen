using Profitzen.Common.Domain;

namespace Profitzen.Identity.Domain.Entities;

public class Store : BaseEntity
{
    public string Name { get; private set; } = string.Empty;
    public string TenantId { get; private set; } = string.Empty;
    public string Address { get; private set; } = string.Empty;
    public string? Phone { get; private set; }
    public string? Email { get; private set; }
    public bool IsActive { get; private set; } = true;

    private readonly List<User> _users = new();
    public IReadOnlyList<User> Users => _users.AsReadOnly();

    private Store() { }

    public Store(string name, string address, string? phone = null, string? email = null)
    {
        Name = name;
        TenantId = Guid.NewGuid().ToString();
        Address = address;
        Phone = phone;
        Email = email;
    }

    public void UpdateInfo(string name, string address, string? phone = null, string? email = null)
    {
        Name = name;
        Address = address;
        Phone = phone;
        Email = email;
        MarkAsUpdated();
    }

    public void Deactivate()
    {
        IsActive = false;
        MarkAsUpdated();
    }

    public void Activate()
    {
        IsActive = true;
        MarkAsUpdated();
    }
}