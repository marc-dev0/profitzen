namespace Profitzen.Inventory.Domain.Entities;

public class TransferDetail
{
    public Guid Id { get; set; }
    public Guid TransferId { get; set; }
    public Guid ProductId { get; set; }
    public decimal Quantity { get; set; }
    
    // Navigation
    public virtual Transfer Transfer { get; set; } = null!;
}
