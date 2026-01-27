using Profitzen.Common.Domain;

namespace Profitzen.Inventory.Domain.Entities;

public class PurchaseDetail : BaseEntity
{
    public string TenantId { get; private set; } = string.Empty;
    public Guid PurchaseId { get; private set; }
    public Guid ProductId { get; private set; }
    public Guid UOMId { get; private set; }
    public decimal Quantity { get; private set; }
    public decimal UnitPrice { get; private set; }
    public decimal Subtotal { get; private set; }
    public decimal? BonusQuantity { get; private set; }
    public Guid? BonusUOMId { get; private set; }

    public Purchase Purchase { get; private set; } = null!;

    private PurchaseDetail() { }

    public PurchaseDetail(
        string tenantId,
        Guid purchaseId,
        Guid productId,
        Guid uomId,
        decimal quantity,
        decimal unitPrice,
        decimal? bonusQuantity = null,
        Guid? bonusUOMId = null)
    {
        if (quantity <= 0)
            throw new ArgumentException("Quantity must be greater than zero", nameof(quantity));
        if (unitPrice < 0)
            throw new ArgumentException("Unit price cannot be negative", nameof(unitPrice));
        if (bonusQuantity.HasValue && bonusQuantity.Value < 0)
            throw new ArgumentException("Bonus quantity cannot be negative", nameof(bonusQuantity));

        TenantId = tenantId;
        PurchaseId = purchaseId;
        ProductId = productId;
        UOMId = uomId;
        Quantity = quantity;
        UnitPrice = unitPrice;
        BonusQuantity = bonusQuantity;
        BonusUOMId = bonusUOMId;
        Subtotal = quantity * unitPrice;
    }

    public void UpdateQuantity(decimal quantity)
    {
        if (quantity <= 0)
            throw new ArgumentException("Quantity must be greater than zero", nameof(quantity));
        Quantity = quantity;
        Subtotal = quantity * UnitPrice;
        UpdatedAt = DateTime.UtcNow;
    }

    public void UpdateUnitPrice(decimal unitPrice)
    {
        if (unitPrice < 0)
            throw new ArgumentException("Unit price cannot be negative", nameof(unitPrice));
        UnitPrice = unitPrice;
        Subtotal = Quantity * unitPrice;
        UpdatedAt = DateTime.UtcNow;
    }

    public void SetBonus(decimal? bonusQuantity, Guid? bonusUOMId)
    {
        if (bonusQuantity.HasValue && bonusQuantity.Value < 0)
            throw new ArgumentException("Bonus quantity cannot be negative", nameof(bonusQuantity));
        BonusQuantity = bonusQuantity;
        BonusUOMId = bonusUOMId;
        UpdatedAt = DateTime.UtcNow;
    }
}
