using Profitzen.Common.Domain;
using Profitzen.Inventory.Domain.Enums;

namespace Profitzen.Inventory.Domain.Entities;

public class InventoryAdjustment : BaseEntity
{
    public string TenantId { get; private set; } = string.Empty;
    public Guid StoreInventoryId { get; private set; }
    public string AdjustmentType { get; private set; } = string.Empty;
    public int Quantity { get; private set; }
    public bool IsPositive { get; private set; }
    public int PreviousStock { get; private set; }
    public int NewStock { get; private set; }
    public string Reason { get; private set; } = string.Empty;
    public Guid UserId { get; private set; }
    public DateTime AdjustmentDate { get; private set; }

    public StoreInventory StoreInventory { get; private set; } = null!;

    private InventoryAdjustment() { }

    public InventoryAdjustment(
        string tenantId,
        Guid storeInventoryId,
        string adjustmentType,
        int quantity,
        bool isPositive,
        int previousStock,
        string reason,
        Guid userId)
    {
        TenantId = tenantId;
        StoreInventoryId = storeInventoryId;
        AdjustmentType = adjustmentType;
        Quantity = quantity;
        IsPositive = isPositive;
        PreviousStock = previousStock;
        NewStock = isPositive ? previousStock + quantity : previousStock - quantity;
        Reason = reason;
        UserId = userId;
        AdjustmentDate = DateTime.UtcNow;
    }
}
