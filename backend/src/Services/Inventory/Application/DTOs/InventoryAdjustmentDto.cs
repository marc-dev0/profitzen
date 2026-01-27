namespace Profitzen.Inventory.Application.DTOs;

public record InventoryAdjustmentDto(
    Guid Id,
    Guid StoreInventoryId,
    string ProductCode,
    string ProductName,
    string AdjustmentType,
    int Quantity,
    bool IsPositive,
    int PreviousStock,
    int NewStock,
    string Reason,
    Guid UserId,
    string UserName,
    DateTime AdjustmentDate
);

public record CreateInventoryAdjustmentRequest
{
    public Guid StoreInventoryId { get; init; }
    public string AdjustmentType { get; init; } = string.Empty;
    public int Quantity { get; init; }
    public bool IsPositive { get; init; }
    public string Reason { get; init; } = string.Empty;
    public Guid? UOMId { get; init; }
    public string? UOMCode { get; init; }
    public int? OriginalQuantity { get; init; }
    public int? ConversionFactor { get; init; }
}

public record BatchInventoryAdjustmentRequest
{
    public Guid StoreId { get; init; } // Context for the batch
    public List<BatchAdjustmentItem> Items { get; init; } = new();
    public string AdjustmentType { get; init; } = string.Empty;
    public string Reason { get; init; } = string.Empty;
    public bool IsPositive { get; init; }
}

public record BatchAdjustmentItem
{
    public Guid? StoreInventoryId { get; init; } // Optional if ProductId provided
    public Guid? ProductId { get; init; } // Optional if StoreInventoryId provided (but needed for new items)
    public int Quantity { get; init; }

    public Guid? UOMId { get; init; }
    public string? UOMCode { get; init; }
    public int? OriginalQuantity { get; init; }
    public int? ConversionFactor { get; init; }
}

public record InventoryMovementDto(
    Guid Id,
    Guid StoreInventoryId,
    Guid ProductId,
    string ProductCode,
    string ProductName,
    string MovementType,
    int Quantity,
    string Reason,
    Guid UserId,
    string? UserName,
    DateTime MovementDate,
    string? UOMCode,
    int? OriginalQuantity,
    int? ConversionFactor,
    string? Barcode = null,
    string? ShortScanCode = null
);

public record TransferStockRequest
{
    public Guid SourceStoreId { get; init; }
    public Guid DestinationStoreId { get; init; }
    public Guid ProductId { get; init; }
    public int Quantity { get; init; }
    public string Reason { get; init; } = string.Empty;
    public Guid? UOMId { get; init; }
    public string? UOMCode { get; init; }
    public int? OriginalQuantity { get; init; }
    public int? ConversionFactor { get; init; }
}

public record TransferStockBatchRequest
{
    public Guid SourceStoreId { get; init; }
    public Guid DestinationStoreId { get; init; }
    public List<TransferItem> Items { get; init; } = new();
    public string Reason { get; init; } = string.Empty;
}

public record TransferItem
{
    public Guid ProductId { get; init; }
    public int Quantity { get; init; }
    public Guid? UOMId { get; init; }
    public string? UOMCode { get; init; }
    public int? OriginalQuantity { get; init; }
    public int? ConversionFactor { get; init; }
}
