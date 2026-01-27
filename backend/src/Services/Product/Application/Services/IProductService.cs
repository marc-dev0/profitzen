using Profitzen.Product.Application.DTOs;

namespace Profitzen.Product.Application.Services;

public interface IProductService
{
    Task<IEnumerable<ProductDto>> GetProductsAsync(string tenantId, Guid? storeId = null);
    Task<ProductDto?> GetProductByIdAsync(Guid id);
    Task<ProductDto?> GetProductByCodeAsync(string code, string tenantId);
    Task<IEnumerable<ProductDto>> SearchProductsAsync(string searchTerm, string tenantId, Guid storeId);
    Task<ProductDto> CreateProductAsync(CreateProductRequest request, string tenantId, Guid userId);
    Task<ProductDto> UpdateProductAsync(Guid id, UpdateProductRequest request, Guid userId);
    Task<bool> DeleteProductAsync(Guid id, Guid userId);
    Task UpdatePurchasePriceAsync(Guid productId, decimal purchasePrice);

    Task<IEnumerable<CategoryDto>> GetCategoriesAsync(string tenantId);
    Task<CategoryDto?> GetCategoryByIdAsync(Guid id);
    Task<CategoryDto> CreateCategoryAsync(CreateCategoryRequest request, string tenantId, Guid userId);
    Task<CategoryDto> UpdateCategoryAsync(Guid id, UpdateCategoryRequest request, Guid userId);
    Task<bool> DeleteCategoryAsync(Guid id, Guid userId);

    Task<IEnumerable<ProductUOMConversionDto>> GetProductConversionsAsync(Guid productId);
    Task<ProductUOMConversionDto> CreateProductConversionAsync(Guid productId, CreateProductUOMConversionRequest request, Guid userId);

    Task<IEnumerable<ProductPurchaseUOMDto>> GetProductPurchaseUOMsAsync(Guid productId);
    Task<ProductPurchaseUOMDto> AddProductPurchaseUOMAsync(Guid productId, CreateProductPurchaseUOMRequest request, Guid userId);
    Task<bool> RemoveProductPurchaseUOMAsync(Guid productId, Guid uomId, Guid userId);

    Task<IEnumerable<ProductSaleUOMDto>> GetProductSaleUOMsAsync(Guid productId);
    Task<ProductSaleUOMDto> AddProductSaleUOMAsync(Guid productId, CreateProductSaleUOMRequest request, Guid userId);
    Task<bool> RemoveProductSaleUOMAsync(Guid productId, Guid uomId, Guid userId);
}
