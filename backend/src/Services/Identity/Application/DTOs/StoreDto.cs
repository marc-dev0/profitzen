namespace Profitzen.Identity.Application.DTOs;

public record StoreDto(
    Guid Id,
    string Name,
    string TenantId,
    string Address,
    string? Phone,
    string? Email,
    bool IsActive,
    DateTime CreatedAt,
    DateTime UpdatedAt
);

public record CreateStoreRequest(
    string Name,
    string Address,
    string? Phone = null,
    string? Email = null
);

public record UpdateStoreRequest(
    string Name,
    string Address,
    string? Phone = null,
    string? Email = null
);
