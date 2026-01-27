using Profitzen.Common.Domain;
using Profitzen.Inventory.Domain.Enums;

namespace Profitzen.Inventory.Domain.Entities;

public class Purchase : BaseEntity
{
    public string TenantId { get; private set; } = string.Empty;
    public string PurchaseNumber { get; private set; }
    public Guid SupplierId { get; private set; }
    public Guid StoreId { get; private set; }
    public string DocumentType { get; private set; }
    public DateTime PurchaseDate { get; private set; }
    public PurchaseStatus Status { get; private set; }
    public DateTime? ReceivedDate { get; private set; }
    public Guid? ReceivedByUserId { get; private set; }
    public decimal TotalAmount { get; private set; }
    public string? InvoiceNumber { get; private set; }
    public string? Notes { get; private set; }
    public Guid CreatedByUserId { get; private set; }

    public Supplier Supplier { get; private set; } = null!;
    public ICollection<PurchaseDetail> Details { get; private set; } = [];

    private Purchase() { }

    public Purchase(
        string tenantId,
        string purchaseNumber,
        Guid supplierId,
        Guid storeId,
        string documentType,
        DateTime purchaseDate,
        string? invoiceNumber,
        string? notes,
        Guid createdByUserId)
    {
        TenantId = tenantId;
        PurchaseNumber = purchaseNumber;
        SupplierId = supplierId;
        StoreId = storeId;
        DocumentType = documentType;
        PurchaseDate = purchaseDate;
        InvoiceNumber = invoiceNumber;
        Notes = notes;
        CreatedByUserId = createdByUserId;
        TotalAmount = 0;
        Status = PurchaseStatus.Pending;
    }

    public void AddDetail(PurchaseDetail detail)
    {
        Details.Add(detail);
        CalculateTotal();
    }

    public void CalculateTotal()
    {
        TotalAmount = Details.Sum(d => d.Subtotal);
    }

    public void MarkAsReceived(Guid receivedByUserId)
    {
        if (Status != PurchaseStatus.Pending)
            throw new InvalidOperationException("Only pending purchases can be marked as received");

        Status = PurchaseStatus.Received;
        ReceivedDate = DateTime.UtcNow;
        ReceivedByUserId = receivedByUserId;
        UpdatedAt = DateTime.UtcNow;
    }

    public void Complete()
    {
        if (Status != PurchaseStatus.Received)
            throw new InvalidOperationException("Only received purchases can be completed");

        Status = PurchaseStatus.Completed;
        UpdatedAt = DateTime.UtcNow;
    }

    public void Cancel()
    {
        if (Status == PurchaseStatus.Completed)
            throw new InvalidOperationException("Cannot cancel completed purchases");

        Status = PurchaseStatus.Cancelled;
        UpdatedAt = DateTime.UtcNow;
    }
}
