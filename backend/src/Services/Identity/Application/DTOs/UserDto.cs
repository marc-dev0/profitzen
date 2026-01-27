using Profitzen.Identity.Domain.Enums;

namespace Profitzen.Identity.Application.DTOs;

public record UserDto(
    Guid Id,
    string Email,
    string FirstName,
    string LastName,
    string? Phone,
    UserRole Role,
    string RoleName,
    List<Guid> StoreIds,
    List<string> StoreNames,
    string TenantId,
    bool IsActive,
    DateTime CreatedAt
);

public record CreateUserRequest(
    string Email,
    string Password,
    string FirstName,
    string LastName,
    string? Phone,
    UserRole Role,
    List<Guid> StoreIds
);

public record UpdateUserRequest(
    string FirstName,
    string LastName,
    string? Phone,
    UserRole Role,
    List<Guid> StoreIds
);

public record ChangePasswordRequest(
    string CurrentPassword,
    string NewPassword
);
