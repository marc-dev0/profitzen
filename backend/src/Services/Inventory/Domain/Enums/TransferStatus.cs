namespace Profitzen.Inventory.Domain.Enums;

public enum TransferStatus
{
    // The transfer is created and stock is deducted from origin, but not yet added to destination.
    InTransit = 0,
    
    // The transfer has been received at destination.
    Completed = 1,
    
    // The transfer was cancelled (stock returned to origin).
    Cancelled = 2
}
