using Profitzen.Common.Domain;

namespace Profitzen.Product.Domain.Entities;

public class PriceList : BaseEntity
{
    public string Name { get; private set; } = string.Empty;
    public string Code { get; private set; } = string.Empty;
    public string? Description { get; private set; }
    public bool IsDefault { get; private set; }
    public bool IsActive { get; private set; }
    public string TenantId { get; private set; } = string.Empty;

    public ICollection<ProductSaleUOMPrice> ProductPrices { get; private set; } = new List<ProductSaleUOMPrice>();

    private PriceList() { }

    public PriceList(string name, string code, string tenantId, string? description = null, bool isDefault = false)
    {
        Name = name;
        Code = code;
        Description = description;
        IsDefault = isDefault;
        IsActive = true;
        TenantId = tenantId;
    }

    public void Update(string name, string? description = null)
    {
        Name = name;
        Description = description;
    }

    public void SetAsDefault()
    {
        IsDefault = true;
    }

    public void RemoveAsDefault()
    {
        IsDefault = false;
    }

    public void Activate()
    {
        IsActive = true;
    }

    public void Deactivate()
    {
        IsActive = false;
    }
}
