using Profitzen.Common.Domain;

namespace Profitzen.Product.Domain.Entities;

public class Category : BaseEntity
{
    public string Name { get; private set; } = string.Empty;
    public string Description { get; private set; } = string.Empty;
    public string TenantId { get; private set; } = string.Empty;
    public bool IsActive { get; private set; }

    public ICollection<Product> Products { get; private set; } = [];

    private Category() { }

    public Category(string name, string description, string tenantId)
    {
        Name = name;
        Description = description;
        TenantId = tenantId;
        IsActive = true;
    }

    public void UpdateDetails(string name, string description)
    {
        Name = name;
        Description = description;
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
