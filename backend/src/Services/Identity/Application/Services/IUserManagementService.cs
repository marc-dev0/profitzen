using Profitzen.Identity.Application.DTOs;

namespace Profitzen.Identity.Application.Services;

public interface IUserManagementService
{
    Task<IEnumerable<UserDto>> GetUsersAsync(string tenantId);
    Task<UserDto?> GetUserByIdAsync(Guid id);
    Task<UserDto> CreateUserAsync(CreateUserRequest request, string tenantId, Guid createdBy);
    Task<UserDto> UpdateUserAsync(Guid id, UpdateUserRequest request, Guid updatedBy);
    Task<bool> ActivateUserAsync(Guid id, Guid updatedBy);
    Task<bool> DeactivateUserAsync(Guid id, Guid updatedBy);
    Task<bool> DeleteUserAsync(Guid id, Guid deletedBy);
    Task<bool> ChangePasswordAsync(Guid userId, ChangePasswordRequest request);
}
