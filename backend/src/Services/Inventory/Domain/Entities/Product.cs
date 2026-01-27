using Profitzen.Common.Domain;

namespace Profitzen.Inventory.Domain.Entities;

public class Product : BaseEntity
{
    public string Code { get; private set; } = string.Empty;
    public string Name { get; private set; } = string.Empty;
    public string Description { get; private set; } = string.Empty;
    public string? ImageUrl { get; private set; }
    public Guid CategoryId { get; private set; }
    public decimal PurchasePrice { get; private set; }
    public decimal SalePrice { get; private set; }
    public decimal WholesalePrice { get; private set; }
    public string TenantId { get; private set; } = string.Empty;
    public bool IsActive { get; private set; }

    public Category Category { get; private set; } = null!;
    public ICollection<StoreInventory> StoreInventories { get; private set; } = [];

    private Product() { }

    public Product(string code, string name, string description, Guid categoryId,
                  decimal purchasePrice, decimal salePrice, decimal wholesalePrice, string tenantId)
    {
        Code = code;
        Name = name;
        Description = description;
        CategoryId = categoryId;
        PurchasePrice = purchasePrice;
        SalePrice = salePrice;
        WholesalePrice = wholesalePrice;
        TenantId = tenantId;
        IsActive = true;
    }

    public void UpdatePrices(decimal purchasePrice, decimal salePrice, decimal wholesalePrice)
    {
        PurchasePrice = purchasePrice;
        SalePrice = salePrice;
        WholesalePrice = wholesalePrice;
    }

    public void SetImage(string imageUrl)
    {
        ImageUrl = imageUrl;
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