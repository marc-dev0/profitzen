using Profitzen.Inventory.Domain.Enums;

namespace Profitzen.Inventory.Domain.Entities;

public class Transfer
{
    public Guid Id { get; set; }
    public string TransferNumber { get; set; } = string.Empty; // e.g., TRF-20240126-XXXX
    
    public Guid OriginStoreId { get; set; }
    public Guid DestinationStoreId { get; set; }
    
    public TransferStatus Status { get; set; } = TransferStatus.InTransit;
    
    public string TenantId { get; set; } = string.Empty;
    
    // User who requested/initiated the transfer (selected from combo)
    public Guid RequestedByUserId { get; set; }
    
    // User who received/completed the transfer (system assigned at reception)
    public Guid? ReceivedByUserId { get; set; }
    
    public string? Notes { get; set; }
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? CompletedAt { get; set; }
    
    // Navigation properties
    public virtual ICollection<TransferDetail> Details { get; set; } = new List<TransferDetail>();
}
