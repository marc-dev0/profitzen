using Profitzen.Identity.Application.DTOs;

namespace Profitzen.Identity.Application.Services;

public interface IStoreService
{
    Task<IEnumerable<StoreDto>> GetStoresAsync(string tenantId);
    Task<StoreDto?> GetStoreByIdAsync(Guid id);
    Task<StoreDto> CreateStoreAsync(CreateStoreRequest request, string tenantId, Guid userId);
    Task<StoreDto> UpdateStoreAsync(Guid id, UpdateStoreRequest request, Guid userId);
    Task<bool> ActivateStoreAsync(Guid id, Guid userId);
    Task<bool> DeactivateStoreAsync(Guid id, Guid userId);
}
