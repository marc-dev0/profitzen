namespace Profitzen.Inventory.Application.DTOs;

public record SupplierDto(
    Guid Id,
    string Code,
    string Name,
    string? ContactName,
    string? Phone,
    string? Email,
    string? Address,
    string? TaxId,
    bool IsActive,
    DateTime CreatedAt
);

public record CreateSupplierRequest
{
    public string Name { get; init; } = string.Empty;
    public string? ContactName { get; init; }
    public string? Phone { get; init; }
    public string? Email { get; init; }
    public string? Address { get; init; }
    public string? TaxId { get; init; }
}

public record UpdateSupplierRequest
{
    public string Name { get; init; } = string.Empty;
    public string? ContactName { get; init; }
    public string? Phone { get; init; }
    public string? Email { get; init; }
    public string? Address { get; init; }
    public string? TaxId { get; init; }
    public bool IsActive { get; init; }
}
