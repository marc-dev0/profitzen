using Profitzen.Configuration.Application.DTOs;

namespace Profitzen.Configuration.Application.Services;

public interface IConfigurationService
{
    Task<IEnumerable<DocumentSeriesDto>> GetDocumentSeriesAsync(string tenantId, string? documentType = null);
    Task<DocumentSeriesDto?> GetDocumentSeriesByIdAsync(Guid id);
    Task<DocumentSeriesDto> CreateDocumentSeriesAsync(CreateDocumentSeriesRequest request, string tenantId, Guid userId);
    Task<DocumentSeriesDto> UpdateDocumentSeriesAsync(Guid id, UpdateDocumentSeriesRequest request, Guid userId);
    Task<NextDocumentNumberDto> GetNextDocumentNumberAsync(string tenantId, string documentType, Guid? storeId = null);
    Task<string> IncrementSeriesNumberAsync(string tenantId, string seriesCode);
    
    Task<CompanySettingsDto?> GetCompanySettingsAsync(string tenantId);
    Task<CompanySettingsDto> UpdateCompanySettingsAsync(string tenantId, UpdateCompanySettingsRequest request);
    Task<string> UpdateCompanyLogoAsync(string tenantId, string logoUrl);
}
