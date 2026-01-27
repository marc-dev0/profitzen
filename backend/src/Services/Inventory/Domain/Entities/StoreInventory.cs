using Profitzen.Common.Domain;

namespace Profitzen.Inventory.Domain.Entities;

public class StoreInventory : BaseEntity
{
    public string TenantId { get; private set; } = string.Empty;
    public Guid ProductId { get; private set; }
    public Guid StoreId { get; private set; }
    public int CurrentStock { get; private set; }
    public int MinimumStock { get; private set; }

    public ICollection<InventoryMovement> Movements { get; private set; } = [];

    private StoreInventory() { }

    public StoreInventory(string tenantId, Guid productId, Guid storeId, int minimumStock)
    {
        TenantId = tenantId;
        ProductId = productId;
        StoreId = storeId;
        CurrentStock = 0;
        MinimumStock = minimumStock;
    }

    public StoreInventory(string tenantId, Guid storeId, Guid productId, int initialStock, int minimumStock)
    {
        TenantId = tenantId;
        StoreId = storeId;
        ProductId = productId;
        CurrentStock = initialStock;
        MinimumStock = minimumStock;
    }

    public void UpdateStock(int newStock)
    {
        CurrentStock = newStock;
    }

    public void AddStock(int quantity)
    {
        CurrentStock += quantity;
    }

    public void RemoveStock(int quantity)
    {
        if (CurrentStock < quantity)
            throw new InvalidOperationException("Insufficient stock");

        CurrentStock -= quantity;
    }

    public bool IsLowStock() => CurrentStock <= MinimumStock;

    public void UpdateMinimumStock(int minimumStock)
    {
        MinimumStock = minimumStock;
    }

    public void Restore()
    {
        DeletedAt = null;
        MarkAsUpdated();
    }
}
