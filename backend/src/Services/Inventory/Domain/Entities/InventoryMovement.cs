using Profitzen.Common.Domain;
using Profitzen.Inventory.Domain.Enums;

namespace Profitzen.Inventory.Domain.Entities;

public class InventoryMovement : BaseEntity
{
    public string TenantId { get; private set; } = string.Empty;
    public Guid StoreInventoryId { get; private set; }
    public decimal Quantity { get; private set; }
    public InventoryMovementType Type { get; private set; }
    public string Reason { get; private set; } = string.Empty;
    public Guid UserId { get; private set; }
    public DateTime MovementDate { get; private set; }

    public Guid? UOMId { get; private set; }
    public string? UOMCode { get; private set; }
    public decimal? OriginalQuantity { get; private set; }
    public decimal? ConversionFactor { get; private set; }

    public StoreInventory StoreInventory { get; private set; } = null!;

    private InventoryMovement() { }

    public InventoryMovement(string tenantId, Guid storeInventoryId, decimal quantity, InventoryMovementType type,
                           string reason, Guid userId)
    {
        TenantId = tenantId;
        StoreInventoryId = storeInventoryId;
        Quantity = quantity;
        Type = type;
        Reason = reason;
        UserId = userId;
        MovementDate = DateTime.UtcNow;
    }

    public InventoryMovement(string tenantId, Guid storeInventoryId, decimal quantity, InventoryMovementType type,
                           string reason, Guid userId, Guid? uomId, string? uomCode, decimal? originalQuantity, decimal? conversionFactor)
        : this(tenantId, storeInventoryId, quantity, type, reason, userId)
    {
        UOMId = uomId;
        UOMCode = uomCode;
        OriginalQuantity = originalQuantity;
        ConversionFactor = conversionFactor;
    }
}