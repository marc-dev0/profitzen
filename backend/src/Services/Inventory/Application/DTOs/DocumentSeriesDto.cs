namespace Profitzen.Inventory.Application.DTOs;

public record DocumentSeriesDto(
    Guid Id,
    string SeriesCode,
    string DocumentType,
    string DocumentTypeName,
    int CurrentNumber,
    Guid StoreId,
    bool IsActive,
    bool IsDefault,
    DateTime CreatedAt
);

public record CreateDocumentSeriesRequest
{
    public string SeriesCode { get; init; } = string.Empty;
    public string DocumentType { get; init; } = string.Empty;
    public string DocumentTypeName { get; init; } = string.Empty;
    public Guid StoreId { get; init; }
    public bool IsDefault { get; init; }
}

public record UpdateDocumentSeriesRequest
{
    public bool IsActive { get; init; }
    public bool IsDefault { get; init; }
}

public record NextDocumentNumberDto(
    string SeriesCode,
    string NextNumber,
    string FullDocumentNumber
);
