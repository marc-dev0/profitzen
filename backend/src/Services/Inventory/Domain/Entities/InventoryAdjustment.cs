using Profitzen.Common.Domain;
using Profitzen.Inventory.Domain.Enums;
using Profitzen.Common.Extensions;

namespace Profitzen.Inventory.Domain.Entities;

public class InventoryAdjustment : BaseEntity
{
    public string TenantId { get; private set; } = string.Empty;
    public Guid StoreInventoryId { get; private set; }
    public string AdjustmentType { get; private set; } = string.Empty;
    public decimal Quantity { get; private set; }
    public bool IsPositive { get; private set; }
    public decimal PreviousStock { get; private set; }
    public decimal NewStock { get; private set; }
    public string Reason { get; private set; } = string.Empty;
    public Guid UserId { get; private set; }
    public DateTime AdjustmentDate { get; private set; }

    public StoreInventory StoreInventory { get; private set; } = null!;

    private InventoryAdjustment() { }

    public InventoryAdjustment(
        string tenantId,
        Guid storeInventoryId,
        string adjustmentType,
        decimal quantity,
        bool isPositive,
        decimal previousStock,
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
        AdjustmentDate = DateTime.UtcNow.ToBusinessDate();
    }
}
