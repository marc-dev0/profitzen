using Profitzen.Inventory.Domain.Enums;

namespace Profitzen.Inventory.Application.DTOs;

public record TransferDto(
    Guid Id,
    string TransferNumber,
    Guid OriginStoreId,
    string OriginStoreName,
    Guid DestinationStoreId,
    string DestinationStoreName,
    TransferStatus Status,
    string StatusName,
    Guid RequestedByUserId,
    string RequestedByUserName,
    Guid? ReceivedByUserId,
    string? ReceivedByUserName,
    string? Notes,
    DateTime CreatedAt,
    DateTime? CompletedAt,
    List<TransferDetailDto> Details
);

public record TransferDetailDto(
    Guid Id,
    Guid ProductId,
    string ProductCode,
    string ProductName,
    decimal Quantity
);

public record CreateTransferRequest
{
    public Guid OriginStoreId { get; init; }
    public Guid DestinationStoreId { get; init; }
    public Guid RequestedByUserId { get; init; } // Selected from combo
    public string? Notes { get; init; }
    public List<CreateTransferDetailRequest> Items { get; init; } = new();
}

public record CreateTransferDetailRequest
{
    public Guid ProductId { get; init; }
    public decimal Quantity { get; init; }
}

public record UpdateTransferStatusRequest
{
    public TransferStatus NewStatus { get; init; }
}
