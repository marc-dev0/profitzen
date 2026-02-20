using Profitzen.Common.Domain;

namespace Profitzen.Inventory.Domain.Entities;

public class StoreInventory : BaseEntity
{
    public string TenantId { get; private set; } = string.Empty;
    public Guid ProductId { get; private set; }
    public Guid StoreId { get; private set; }
    public decimal CurrentStock { get; private set; }
    public decimal MinimumStock { get; private set; }

    public ICollection<InventoryMovement> Movements { get; private set; } = [];

    private StoreInventory() { }

    public StoreInventory(string tenantId, Guid productId, Guid storeId, decimal minimumStock)
    {
        TenantId = tenantId;
        ProductId = productId;
        StoreId = storeId;
        CurrentStock = 0;
        MinimumStock = minimumStock;
    }

    public StoreInventory(string tenantId, Guid storeId, Guid productId, decimal initialStock, decimal minimumStock)
    {
        TenantId = tenantId;
        StoreId = storeId;
        ProductId = productId;
        CurrentStock = initialStock;
        MinimumStock = minimumStock;
    }

    public void UpdateStock(decimal newStock)
    {
        CurrentStock = newStock;
    }

    public void AddStock(decimal quantity)
    {
        CurrentStock += quantity;
    }

    public void RemoveStock(decimal quantity)
    {
        if (CurrentStock < quantity)
            throw new InvalidOperationException("Insufficient stock");

        CurrentStock -= quantity;
    }

    public bool IsLowStock() => CurrentStock <= MinimumStock;

    public void UpdateMinimumStock(decimal minimumStock)
    {
        MinimumStock = minimumStock;
    }

    public void Restore()
    {
        DeletedAt = null;
        MarkAsUpdated();
    }
}
