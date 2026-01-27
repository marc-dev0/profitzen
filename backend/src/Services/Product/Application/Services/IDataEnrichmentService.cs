using Profitzen.Product.Application.DTOs;

namespace Profitzen.Product.Application.Services;

public interface IDataEnrichmentService
{
    Task EnrichProductsAsync(IEnumerable<ProductDto> products, string? tenantId = null, Guid? storeId = null);
    Task EnrichProductAsync(ProductDto product, string? tenantId = null, Guid? storeId = null);
}
