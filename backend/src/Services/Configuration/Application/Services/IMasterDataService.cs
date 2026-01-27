using Profitzen.Configuration.Application.DTOs;

namespace Profitzen.Configuration.Application.Services;

public interface IMasterDataService
{
    Task<IEnumerable<MasterDataTypeDto>> GetMasterDataTypesAsync();
    Task<IEnumerable<MasterDataValueDto>> GetMasterDataValuesByTypeAsync(string typeCode, string tenantId, bool includeInactive = false);
    Task<MasterDataValueDto?> GetMasterDataValueByIdAsync(Guid id);
    Task<MasterDataValueDto> CreateMasterDataValueAsync(CreateMasterDataValueRequest request, string tenantId, Guid userId);
    Task<MasterDataValueDto> UpdateMasterDataValueAsync(Guid id, UpdateMasterDataValueRequest request, Guid userId);
    Task<bool> DeleteMasterDataValueAsync(Guid id, Guid userId);
}
