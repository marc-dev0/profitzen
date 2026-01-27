using Profitzen.Product.Application.DTOs;

namespace Profitzen.Product.Application.Services;

public interface IPriceListService
{
    Task<IEnumerable<PriceListDto>> GetAllAsync(string tenantId);
    Task<PriceListDto?> GetByIdAsync(Guid id, string tenantId);
    Task<PriceListDto?> GetByCodeAsync(string code, string tenantId);
    Task<PriceListDto?> GetDefaultAsync(string tenantId);
    Task<PriceListDto> CreateAsync(CreatePriceListDto dto, string tenantId, string userId);
    Task<PriceListDto> UpdateAsync(Guid id, UpdatePriceListDto dto, string tenantId, string userId);
    Task<bool> SetAsDefaultAsync(Guid id, string tenantId, string userId);
    Task<bool> ActivateAsync(Guid id, string tenantId, string userId);
    Task<bool> DeactivateAsync(Guid id, string tenantId, string userId);
    Task<bool> DeleteAsync(Guid id, string tenantId);
}
