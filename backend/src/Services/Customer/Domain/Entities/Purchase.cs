using Profitzen.Common.Domain;

namespace Profitzen.Customer.Domain.Entities;

public class Purchase : BaseEntity
{
    public string TenantId { get; private set; } = string.Empty;
    public Guid CustomerId { get; private set; }
    public Guid SaleId { get; private set; }
    public decimal TotalAmount { get; private set; }
    public DateTime PurchaseDate { get; private set; }

    public Customer Customer { get; private set; } = null!;

    private Purchase() { }

    public Purchase(string tenantId, Guid customerId, Guid saleId, decimal totalAmount)
    {
        TenantId = tenantId;
        CustomerId = customerId;
        SaleId = saleId;
        TotalAmount = totalAmount;
        PurchaseDate = DateTime.UtcNow;
    }
}
