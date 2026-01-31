using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Profitzen.Product.Application.DTOs;
using Profitzen.Product.Infrastructure;
using Profitzen.Common.Http;
using System.Text.Json;

namespace Profitzen.Product.Application.Services;

public class ProductService : IProductService
{
    private readonly ProductDbContext _context;
    private readonly IDataEnrichmentService _enrichmentService;
    private readonly ServiceHttpClient _serviceHttpClient;
    private readonly IConfiguration _configuration;
    private readonly ILogger<ProductService> _logger;

    public ProductService(
        ProductDbContext context,
        IDataEnrichmentService enrichmentService,
        ServiceHttpClient serviceHttpClient,
        IConfiguration configuration,
        ILogger<ProductService> logger)
    {
        _context = context;
        _enrichmentService = enrichmentService;
        _serviceHttpClient = serviceHttpClient;
        _configuration = configuration;
        _logger = logger;
    }

    public async Task<IEnumerable<ProductDto>> GetProductsAsync(string tenantId, Guid? storeId = null, bool includeStock = true)
    {
        _logger.LogDebug("GetProductsAsync called for tenant: {TenantId}, store: {StoreId}", tenantId, storeId);
        
        // Load entities first with all navigation properties
        var productEntities = await _context.Products
            .AsNoTracking()
            .Include(p => p.PurchaseUOMs)
            .Include(p => p.SaleUOMs)
                .ThenInclude(su => su.Prices)
                    .ThenInclude(price => price.PriceList)
            .Where(p => p.TenantId == tenantId)
            .ToListAsync();

        _logger.LogDebug("Retrieved {Count} product entities", productEntities.Count);
        
        // Debug: Check if PurchaseUOMs are loaded
        foreach(var entity in productEntities.Take(3))
        {
            _logger.LogDebug("Entity {ProductName}: PurchaseUOMs count = {Count}", entity.Name, entity.PurchaseUOMs?.Count ?? 0);
            if (entity.PurchaseUOMs != null && entity.PurchaseUOMs.Any())
            {
                foreach(var pu in entity.PurchaseUOMs)
                {
                    _logger.LogDebug("  - UOM {UomId}, Conversion: {Conversion}, IsDefault: {IsDefault}", pu.UOMId, pu.ConversionToBase, pu.IsDefault);
                }
            }
        }

        // Project to DTOs in memory where navigation properties are available
        var products = productEntities.Select(p =>
        {
            var defaultPurchaseUOM = p.PurchaseUOMs?.FirstOrDefault(pu => pu.IsDefault);
            var conversionFactor = defaultPurchaseUOM?.ConversionToBase ?? 1m;
            var unitCost = p.PurchasePrice / (conversionFactor > 0 ? conversionFactor : 1m);
            
            return new ProductDto
            {
                Id = p.Id,
                Code = p.Code,
                Barcode = p.Barcode,
                ShortScanCode = p.ShortScanCode,
                Name = p.Name,
                Description = p.Description,
                ImageUrl = p.ImageUrl,
                CategoryId = p.CategoryId,
                CategoryName = p.CategoryName,
                PurchasePrice = p.PurchasePrice,
                SalePrice = p.SalePrice,
                WholesalePrice = p.WholesalePrice,
                IsActive = p.IsActive,
                BaseUOMId = p.BaseUOMId,
                BaseUOMCode = null,
                BaseUOMName = null,
                AllowFractional = p.AllowFractional,
                PurchaseConversionMethod = p.PurchaseConversionMethod,
                UnitCost = unitCost,  // CRITICAL: Set it here so it's included in the DTO
                PurchaseUOMId = defaultPurchaseUOM?.UOMId,
                PurchaseUOMs = p.PurchaseUOMs?.Select(pu => new ProductPurchaseUOMDto
                {
                    Id = pu.Id,
                    ProductId = pu.ProductId,
                    UOMId = pu.UOMId,
                    UOMCode = string.Empty,
                    UOMName = string.Empty,
                    ConversionToBase = pu.ConversionToBase,
                    IsDefault = pu.IsDefault,
                    IsActive = pu.IsActive
                }).ToList() ?? new List<ProductPurchaseUOMDto>(),
                SaleUOMs = p.SaleUOMs?.Select(su => new ProductSaleUOMDto
                {
                    Id = su.Id,
                    ProductId = su.ProductId,
                    UOMId = su.UOMId,
                    UOMCode = string.Empty,
                    UOMName = string.Empty,
                    ConversionToBase = su.ConversionToBase,
                    Price = su.Price,
                    IsDefault = su.IsDefault,
                    IsActive = su.IsActive,
                    Prices = su.Prices?.Select(price => new ProductSaleUOMPriceDto
                    {
                        Id = price.Id,
                        ProductSaleUOMId = price.ProductSaleUOMId,
                        PriceListId = price.PriceListId,
                        PriceListName = price.PriceList?.Name ?? string.Empty,
                        PriceListCode = price.PriceList?.Code ?? string.Empty,
                        Price = price.Price
                    }).ToList() ?? new List<ProductSaleUOMPriceDto>()
                }).ToList() ?? new List<ProductSaleUOMDto>(),
                CreatedAt = p.CreatedAt,
                UpdatedAt = p.UpdatedAt
            };
        }).ToList();

        _logger.LogDebug("Mapped to {Count} DTOs", products.Count);
        _logger.LogDebug("Retrieved {Count} products", products.Count);
        
        // Log first few products with their UnitCost
        foreach(var product in products.Take(5)) {
            _logger.LogDebug("Product: {ProductName}, PurchasePrice: {Price}, UnitCost: {UnitCost}", product.Name, product.PurchasePrice, product.UnitCost);
        }
        
        _logger.LogDebug("Now enriching...");
        await _enrichmentService.EnrichProductsAsync(products, tenantId, storeId);
        
        // Explicitly enrich with stock data using the robust internal endpoint
        if (includeStock && storeId.HasValue)
        {
            await EnrichWithStockDataAsync(products, storeId.Value, tenantId);
        }
        
        _logger.LogDebug("Enrichment complete");

        return products;
    }

    public async Task<ProductDto?> GetProductByIdAsync(Guid id)
    {
        var product = await _context.Products
            .Include(p => p.PurchaseUOMs)
            .Include(p => p.SaleUOMs)
                .ThenInclude(su => su.Prices)
                    .ThenInclude(price => price.PriceList)
            .FirstOrDefaultAsync(p => p.Id == id);

        if (product == null) return null;

        var productDto = new ProductDto
        {
            Id = product.Id,
            Code = product.Code,
            Barcode = product.Barcode,
            ShortScanCode = product.ShortScanCode,
            Name = product.Name,
            Description = product.Description,
            ImageUrl = product.ImageUrl,
            CategoryId = product.CategoryId,
            CategoryName = product.CategoryName,
            PurchasePrice = product.PurchasePrice,
            SalePrice = product.SalePrice,
            WholesalePrice = product.WholesalePrice,
            IsActive = product.IsActive,
            BaseUOMId = product.BaseUOMId,
            BaseUOMCode = null,
            BaseUOMName = null,
            AllowFractional = product.AllowFractional,
            PurchaseConversionMethod = product.PurchaseConversionMethod,
            PurchaseUOMId = product.PurchaseUOMs.Where(pu => pu.IsDefault).Select(pu => (Guid?)pu.UOMId).FirstOrDefault(),
            PurchaseUOMs = product.PurchaseUOMs.Select(pu => new ProductPurchaseUOMDto
            {
                Id = pu.Id,
                ProductId = pu.ProductId,
                UOMId = pu.UOMId,
                UOMCode = string.Empty,
                UOMName = string.Empty,
                ConversionToBase = pu.ConversionToBase,
                IsDefault = pu.IsDefault,
                IsActive = pu.IsActive
            }).ToList(),
            SaleUOMs = product.SaleUOMs.Select(su => new ProductSaleUOMDto
            {
                Id = su.Id,
                ProductId = su.ProductId,
                UOMId = su.UOMId,
                UOMCode = string.Empty,
                UOMName = string.Empty,
                ConversionToBase = su.ConversionToBase,
                Price = su.Price,
                IsDefault = su.IsDefault,
                IsActive = su.IsActive,
                Prices = su.Prices.Select(p => new ProductSaleUOMPriceDto
                {
                    Id = p.Id,
                    ProductSaleUOMId = p.ProductSaleUOMId,
                    PriceListId = p.PriceListId,
                    PriceListName = p.PriceList.Name,
                    PriceListCode = p.PriceList.Code,
                    Price = p.Price
                }).ToList()
            }).ToList(),
            CreatedAt = product.CreatedAt,
            UpdatedAt = product.UpdatedAt
        };

        await _enrichmentService.EnrichProductAsync(productDto, product.TenantId);

        return productDto;
    }

    public async Task<ProductDto?> GetProductByCodeAsync(string code, string tenantId)
    {
        var product = await _context.Products
            .FirstOrDefaultAsync(p => p.Code == code && p.TenantId == tenantId);

        if (product == null) return null;

        return new ProductDto
        {
            Id = product.Id,
            Code = product.Code,
            Name = product.Name,
            Description = product.Description,
            ImageUrl = product.ImageUrl,
            CategoryId = product.CategoryId,
            CategoryName = null,
            PurchasePrice = product.PurchasePrice,
            SalePrice = product.SalePrice,
            WholesalePrice = product.WholesalePrice,
            IsActive = product.IsActive,
            CreatedAt = product.CreatedAt,
            UpdatedAt = product.UpdatedAt
        };
    }

    public async Task<IEnumerable<ProductDto>> SearchProductsAsync(string searchTerm, string tenantId, Guid storeId, bool includeStock = true)
    {
        var term = searchTerm.ToLower();

        // 1. Fetch ENTITIES first (not DTOs) to allow complex in-memory calculations
        var productEntities = await _context.Products
            .Include(p => p.PurchaseUOMs)
            .Include(p => p.SaleUOMs)
            .Where(p => p.TenantId == tenantId &&
                        p.IsActive &&
                        (p.Code.ToLower().Contains(term) ||
                         p.Name.ToLower().Contains(term) ||
                         (p.Barcode != null && p.Barcode.ToLower().Contains(term)) ||
                         (p.ShortScanCode != null && p.ShortScanCode.ToLower().Contains(term))))
            .Take(20)
            .ToListAsync();

        // 2. Map to DTOs in memory with correct UnitCost calculation
        var products = productEntities.Select(p =>
        {
            var defaultPurchaseUOM = p.PurchaseUOMs?.FirstOrDefault(pu => pu.IsDefault);
            var conversionFactor = defaultPurchaseUOM?.ConversionToBase ?? 1m;
            // Avoid division by zero
            if (conversionFactor <= 0) conversionFactor = 1m;
            
            var unitCost = p.PurchasePrice / conversionFactor;

            return new ProductDto
            {
                Id = p.Id,
                Code = p.Code,
                Barcode = p.Barcode,
                ShortScanCode = p.ShortScanCode,
                Name = p.Name,
                Description = p.Description,
                ImageUrl = p.ImageUrl,
                CategoryId = p.CategoryId,
                CategoryName = p.CategoryName,
                PurchasePrice = p.PurchasePrice,
                SalePrice = p.SalePrice,
                WholesalePrice = p.WholesalePrice,
                IsActive = p.IsActive,
                BaseUOMId = p.BaseUOMId,
                AllowFractional = p.AllowFractional,
                PurchaseConversionMethod = p.PurchaseConversionMethod,
                UnitCost = unitCost, // Correctly calculated here
                PurchaseUOMId = defaultPurchaseUOM?.UOMId,
                CreatedAt = p.CreatedAt,
                UpdatedAt = p.UpdatedAt,
                PurchaseUOMs = p.PurchaseUOMs?.Select(pu => new ProductPurchaseUOMDto
                {
                    Id = pu.Id,
                    ProductId = pu.ProductId,
                    UOMId = pu.UOMId,
                    UOMCode = string.Empty,
                    UOMName = string.Empty,
                    ConversionToBase = pu.ConversionToBase,
                    IsDefault = pu.IsDefault
                }).ToList() ?? new List<ProductPurchaseUOMDto>(),
                SaleUOMs = p.SaleUOMs?.Select(su => new ProductSaleUOMDto
                {
                    Id = su.Id,
                    ProductId = su.ProductId,
                    UOMId = su.UOMId,
                    UOMCode = string.Empty,
                    UOMName = string.Empty,
                    ConversionToBase = su.ConversionToBase,
                    IsDefault = su.IsDefault
                }).ToList() ?? new List<ProductSaleUOMDto>()
            };
        }).ToList();
        
        // Debug
        _logger.LogDebug("Search found {Count} products", products.Count);
        foreach(var p in products) {
             _logger.LogDebug("Search Result: {ProductName}, Price: {Price}, UnitCost: {UnitCost}", p.Name, p.PurchasePrice, p.UnitCost);
        }

        await _enrichmentService.EnrichProductsAsync(products, tenantId);
        if (includeStock)
        {
            await EnrichWithStockDataAsync(products, storeId, tenantId);
        }

        return products;
    }

    private async Task EnrichWithStockDataAsync(List<ProductDto> products, Guid storeId, string tenantId)
    {
        if (products.Count == 0 || storeId == Guid.Empty)
            return;

        try
        {
            var inventoryServiceUrl = _configuration["Services:Inventory:Url"];
            if (string.IsNullOrEmpty(inventoryServiceUrl))
                return;

            var client = _serviceHttpClient.CreateClient(tenantId: tenantId);
            // Use the internal endpoint which allows service-to-service authentication
            var response = await client.GetAsync($"{inventoryServiceUrl}/api/inventory/store-inventory/internal?storeId={storeId}");

            if (!response.IsSuccessStatusCode)
                return;

            var content = await response.Content.ReadAsStringAsync();
            var stockData = JsonSerializer.Deserialize<List<StoreInventoryDto>>(content, new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            });

            if (stockData == null)
                return;

            var stockLookup = stockData
                .Where(s => s.StoreId == storeId)
                .ToDictionary(s => s.ProductId, s => s);

            foreach (var product in products)
            {
                if (stockLookup.TryGetValue(product.Id, out var stock))
                {
                    product.CurrentStock = stock.CurrentStock;
                    product.MinimumStock = stock.MinimumStock;
                }
                else
                {
                    product.CurrentStock = 0;
                    product.MinimumStock = 0;
                }
            }
        }
        catch (Exception)
        {
            foreach (var product in products)
            {
                product.CurrentStock = 0;
                product.MinimumStock = 0;
            }
        }
    }

    private record StoreInventoryDto(
        Guid Id,
        Guid ProductId,
        string ProductCode,
        string ProductName,
        Guid StoreId,
        int CurrentStock,
        int MinimumStock,
        bool IsLowStock,
        DateTime CreatedAt,
        string? Barcode = null,
        string? ShortScanCode = null,
        decimal UnitCost = 0
    );

    public async Task<ProductDto> CreateProductAsync(CreateProductRequest request, string tenantId, Guid userId)
    {
        var defaultUOMId = Guid.Parse("10000000-0000-0000-0000-000000000001");

        var code = string.IsNullOrWhiteSpace(request.Code)
            ? await GenerateProductCodeAsync(tenantId)
            : request.Code;

        var product = new Domain.Entities.Product(
            code,
            request.Name,
            request.Description,
            request.CategoryId,
            request.PurchasePrice,
            request.SalePrice,
            request.WholesalePrice,
            tenantId,
            request.BaseUOMId ?? defaultUOMId,
            request.Barcode,
            request.AllowFractional,
            null,
            request.ShortScanCode,
            request.PurchaseConversionMethod ?? "base"
        );

        if (!string.IsNullOrEmpty(request.ImageUrl))
        {
            product.SetImage(request.ImageUrl);
        }

        _context.Products.Add(product);
        await _context.SaveChangesAsync();

        foreach (var purchaseUOM in request.PurchaseUOMs)
        {
            var productPurchaseUOM = new Domain.Entities.ProductPurchaseUOM(
                product.Id,
                purchaseUOM.UOMId,
                purchaseUOM.ConversionToBase,
                purchaseUOM.IsDefault
            );
            _context.ProductPurchaseUOMs.Add(productPurchaseUOM);
        }

        var allPriceLists = await _context.PriceLists
            .Where(pl => pl.TenantId == tenantId && pl.IsActive)
            .ToListAsync();

        foreach (var saleUOM in request.SaleUOMs)
        {
            var productSaleUOM = new Domain.Entities.ProductSaleUOM(
                product.Id,
                saleUOM.UOMId,
                saleUOM.ConversionToBase,
                saleUOM.Price,
                saleUOM.IsDefault
            );
            _context.ProductSaleUOMs.Add(productSaleUOM);
            await _context.SaveChangesAsync();

            if (saleUOM.PricesByList != null && saleUOM.PricesByList.Any())
            {
                foreach (var priceByList in saleUOM.PricesByList)
                {
                    var productSaleUOMPrice = new Domain.Entities.ProductSaleUOMPrice(
                        productSaleUOM.Id,
                        priceByList.PriceListId,
                        priceByList.Price
                    );
                    _context.ProductSaleUOMPrices.Add(productSaleUOMPrice);
                }
            }
            else
            {
                foreach (var priceList in allPriceLists)
                {
                    var productSaleUOMPrice = new Domain.Entities.ProductSaleUOMPrice(
                        productSaleUOM.Id,
                        priceList.Id,
                        0
                    );
                    _context.ProductSaleUOMPrices.Add(productSaleUOMPrice);
                }
            }
        }

        await _context.SaveChangesAsync();

        await CreateInitialInventoryAsync(product.Id, tenantId);

        return (await GetProductByIdAsync(product.Id))!;
    }

    private async Task CreateInitialInventoryAsync(Guid productId, string tenantId)
    {
        try
        {
            var inventoryServiceUrl = _configuration["Services:Inventory:Url"];
            if (string.IsNullOrEmpty(inventoryServiceUrl))
            {
                _logger.LogWarning("Inventory service URL not configured, skipping initial inventory creation");
                return;
            }

            var storesResponse = await _serviceHttpClient.CreateClient(tenantId: tenantId)
                .GetAsync($"{_configuration["Services:Identity:Url"]}/api/stores?tenantId={tenantId}");

            if (!storesResponse.IsSuccessStatusCode)
            {
                _logger.LogWarning("Failed to get stores for tenant {TenantId}, skipping initial inventory creation", tenantId);
                return;
            }

            var stores = await storesResponse.Content.ReadFromJsonAsync<List<StoreDto>>();
            if (stores == null || !stores.Any())
            {
                _logger.LogWarning("No stores found for tenant {TenantId}, skipping initial inventory creation", tenantId);
                return;
            }

            foreach (var store in stores)
            {
                try
                {
                    var inventoryRequest = new
                    {
                        ProductId = productId,
                        MinimumStock = 10
                    };

                    var client = _serviceHttpClient.CreateClient(tenantId: tenantId);
                    var response = await client.PostAsJsonAsync(
                        $"{inventoryServiceUrl}/api/inventory/store-inventory",
                        inventoryRequest
                    );

                    if (response.IsSuccessStatusCode)
                    {
                        _logger.LogInformation("Created initial inventory for product {ProductId} in store {StoreId}", productId, store.Id);
                    }
                    else
                    {
                        _logger.LogWarning("Failed to create initial inventory for product {ProductId} in store {StoreId}. Status: {StatusCode}",
                            productId, store.Id, response.StatusCode);
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error creating initial inventory for product {ProductId} in store {StoreId}", productId, store.Id);
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in CreateInitialInventoryAsync for product {ProductId}", productId);
        }
    }

    private record StoreDto(Guid Id, string Code, string Name, string TenantId);

    private async Task<string> GenerateProductCodeAsync(string tenantId)
    {
        var lastProduct = await _context.Products
            .Where(p => p.TenantId == tenantId && p.Code.StartsWith("PROD-"))
            .OrderByDescending(p => p.Code)
            .FirstOrDefaultAsync();

        if (lastProduct == null)
        {
            return "PROD-000001";
        }

        var lastNumber = int.Parse(lastProduct.Code.Substring(5));
        return $"PROD-{(lastNumber + 1):D6}";
    }

    public async Task<ProductDto> UpdateProductAsync(Guid id, UpdateProductRequest request, Guid userId)
    {
        var product = await _context.Products
            .Include(p => p.PurchaseUOMs)
            .Include(p => p.SaleUOMs)
                .ThenInclude(su => su.Prices)
            .FirstOrDefaultAsync(p => p.Id == id);

        if (product == null)
            throw new InvalidOperationException("Product not found");

        product.Update(request.Name, request.Description ?? string.Empty, request.CategoryId, null, request.PurchaseConversionMethod);
        product.UpdatePrices(request.PurchasePrice, request.SalePrice, request.WholesalePrice);

        if (!string.IsNullOrEmpty(request.Code))
        {
            product.SetCode(request.Code);
        }

        if (!string.IsNullOrEmpty(request.Barcode))
        {
            product.SetBarcode(request.Barcode);
        }

        if (request.ShortScanCode != null) // Allow setting to empty string to clear? or just check null
        {
            product.SetShortScanCode(request.ShortScanCode);
        }

        if (!string.IsNullOrEmpty(request.ImageUrl))
        {
            product.SetImage(request.ImageUrl);
        }

        if (request.IsActive && !product.IsActive)
        {
            product.Activate();
        }
        else if (!request.IsActive && product.IsActive)
        {
            product.Deactivate();
        }

        if (request.PurchaseUOMs != null)
        {
            var existingPurchaseUOMs = product.PurchaseUOMs.ToList();
            foreach (var existingUOM in existingPurchaseUOMs)
            {
                _context.ProductPurchaseUOMs.Remove(existingUOM);
            }

            foreach (var purchaseUOMRequest in request.PurchaseUOMs)
            {
                var purchaseUOM = new Domain.Entities.ProductPurchaseUOM(
                    product.Id,
                    purchaseUOMRequest.UOMId,
                    purchaseUOMRequest.ConversionToBase,
                    purchaseUOMRequest.IsDefault
                );
                _context.ProductPurchaseUOMs.Add(purchaseUOM);
            }
        }

        if (request.SaleUOMs != null)
        {
            var existingSaleUOMs = product.SaleUOMs.ToList();
            foreach (var existingUOM in existingSaleUOMs)
            {
                var existingPrices = existingUOM.Prices.ToList();
                foreach (var price in existingPrices)
                {
                    _context.ProductSaleUOMPrices.Remove(price);
                }
                _context.ProductSaleUOMs.Remove(existingUOM);
            }

            var allPriceLists = await _context.PriceLists
                .Where(pl => pl.TenantId == product.TenantId && pl.IsActive)
                .ToListAsync();

            foreach (var saleUOMRequest in request.SaleUOMs)
            {
                var saleUOM = new Domain.Entities.ProductSaleUOM(
                    product.Id,
                    saleUOMRequest.UOMId,
                    saleUOMRequest.ConversionToBase,
                    0,
                    saleUOMRequest.IsDefault
                );
                _context.ProductSaleUOMs.Add(saleUOM);

                if (saleUOMRequest.PricesByList != null && saleUOMRequest.PricesByList.Any())
                {
                    await _context.SaveChangesAsync();

                    foreach (var priceByList in saleUOMRequest.PricesByList)
                    {
                        var price = new Domain.Entities.ProductSaleUOMPrice(
                            saleUOM.Id,
                            priceByList.PriceListId,
                            priceByList.Price
                        );
                        _context.ProductSaleUOMPrices.Add(price);
                    }
                }
                else
                {
                    await _context.SaveChangesAsync();

                    foreach (var priceList in allPriceLists)
                    {
                        var price = new Domain.Entities.ProductSaleUOMPrice(
                            saleUOM.Id,
                            priceList.Id,
                            0
                        );
                        _context.ProductSaleUOMPrices.Add(price);
                    }
                }
            }
        }

        await _context.SaveChangesAsync();

        return (await GetProductByIdAsync(id))!;
    }

    public async Task<bool> DeleteProductAsync(Guid id, Guid userId)
    {
        var product = await _context.Products.FindAsync(id);
        if (product == null)
            return false;

        product.Deactivate();
        await _context.SaveChangesAsync();

        return true;
    }

    public async Task<IEnumerable<CategoryDto>> GetCategoriesAsync(string tenantId)
    {
        return await _context.Categories
            .Where(c => c.TenantId == tenantId)
            .Select(c => new CategoryDto
            {
                Id = c.Id,
                Name = c.Name,
                Description = c.Description,
                IsActive = c.IsActive,
                ProductCount = c.Products.Count(p => p.IsActive),
                CreatedAt = c.CreatedAt,
                UpdatedAt = c.UpdatedAt
            })
            .ToListAsync();
    }

    public async Task<CategoryDto?> GetCategoryByIdAsync(Guid id)
    {
        var category = await _context.Categories
            .Include(c => c.Products)
            .FirstOrDefaultAsync(c => c.Id == id);

        if (category == null) return null;

        return new CategoryDto
        {
            Id = category.Id,
            Name = category.Name,
            Description = category.Description,
            IsActive = category.IsActive,
            ProductCount = category.Products.Count(p => p.IsActive),
            CreatedAt = category.CreatedAt,
            UpdatedAt = category.UpdatedAt
        };
    }

    public async Task<CategoryDto> CreateCategoryAsync(CreateCategoryRequest request, string tenantId, Guid userId)
    {
        var category = new Domain.Entities.Category(
            request.Name,
            request.Description,
            tenantId
        );

        _context.Categories.Add(category);
        await _context.SaveChangesAsync();

        return (await GetCategoryByIdAsync(category.Id))!;
    }

    public async Task<CategoryDto> UpdateCategoryAsync(Guid id, UpdateCategoryRequest request, Guid userId)
    {
        var category = await _context.Categories.FindAsync(id);
        if (category == null)
            throw new InvalidOperationException("Category not found");

        category.UpdateDetails(request.Name, request.Description);

        if (request.IsActive && !category.IsActive)
        {
            category.Activate();
        }
        else if (!request.IsActive && category.IsActive)
        {
            category.Deactivate();
        }

        await _context.SaveChangesAsync();

        return (await GetCategoryByIdAsync(id))!;
    }

    public async Task<bool> DeleteCategoryAsync(Guid id, Guid userId)
    {
        var category = await _context.Categories.FindAsync(id);
        if (category == null)
            return false;

        category.Deactivate();
        await _context.SaveChangesAsync();

        return true;
    }


    public async Task<IEnumerable<ProductUOMConversionDto>> GetProductConversionsAsync(Guid productId)
    {
        return await _context.ProductUOMConversions
            .Where(c => c.ProductId == productId)
            .Select(c => new ProductUOMConversionDto
            {
                Id = c.Id,
                ProductId = c.ProductId,
                FromUOMId = c.FromUOMId,
                FromUOMCode = string.Empty,
                FromUOMName = string.Empty,
                ToUOMId = c.ToUOMId,
                ToUOMCode = string.Empty,
                ToUOMName = string.Empty,
                ConversionFactor = c.ConversionFactor,
                IsDefault = c.IsDefault
            })
            .ToListAsync();
    }

    public async Task<ProductUOMConversionDto> CreateProductConversionAsync(Guid productId, CreateProductUOMConversionRequest request, Guid userId)
    {
        var product = await _context.Products.FindAsync(productId);
        if (product == null)
            throw new InvalidOperationException("Product not found");

        var conversion = new Domain.Entities.ProductUOMConversion(
            productId,
            request.FromUOMId,
            request.ToUOMId,
            request.ConversionFactor,
            request.IsDefault
        );

        _context.ProductUOMConversions.Add(conversion);
        await _context.SaveChangesAsync();

        return new ProductUOMConversionDto
        {
            Id = conversion.Id,
            ProductId = conversion.ProductId,
            FromUOMId = conversion.FromUOMId,
            FromUOMCode = string.Empty,
            FromUOMName = string.Empty,
            ToUOMId = conversion.ToUOMId,
            ToUOMCode = string.Empty,
            ToUOMName = string.Empty,
            ConversionFactor = conversion.ConversionFactor,
            IsDefault = conversion.IsDefault
        };
    }

    public async Task<IEnumerable<ProductPurchaseUOMDto>> GetProductPurchaseUOMsAsync(Guid productId)
    {
        return await _context.ProductPurchaseUOMs
            .Where(pu => pu.ProductId == productId && pu.IsActive)
            .Select(pu => new ProductPurchaseUOMDto
            {
                Id = pu.Id,
                ProductId = pu.ProductId,
                UOMId = pu.UOMId,
                UOMCode = string.Empty,
                UOMName = string.Empty,
                ConversionToBase = pu.ConversionToBase,
                IsDefault = pu.IsDefault,
                IsActive = pu.IsActive
            })
            .ToListAsync();
    }

    public async Task<ProductPurchaseUOMDto> AddProductPurchaseUOMAsync(Guid productId, CreateProductPurchaseUOMRequest request, Guid userId)
    {
        var product = await _context.Products.FindAsync(productId);
        if (product == null)
            throw new InvalidOperationException("Product not found");

        var existing = await _context.ProductPurchaseUOMs
            .FirstOrDefaultAsync(pu => pu.ProductId == productId && pu.UOMId == request.UOMId);

        if (existing != null)
            throw new InvalidOperationException("Purchase UOM already exists for this product");

        var productPurchaseUOM = new Domain.Entities.ProductPurchaseUOM(
            productId,
            request.UOMId,
            request.ConversionToBase,
            request.IsDefault
        );

        _context.ProductPurchaseUOMs.Add(productPurchaseUOM);
        await _context.SaveChangesAsync();

        return new ProductPurchaseUOMDto
        {
            Id = productPurchaseUOM.Id,
            ProductId = productPurchaseUOM.ProductId,
            UOMId = productPurchaseUOM.UOMId,
            UOMCode = string.Empty,
            UOMName = string.Empty,
            ConversionToBase = productPurchaseUOM.ConversionToBase,
            IsDefault = productPurchaseUOM.IsDefault,
            IsActive = productPurchaseUOM.IsActive
        };
    }

    public async Task<bool> RemoveProductPurchaseUOMAsync(Guid productId, Guid uomId, Guid userId)
    {
        var productPurchaseUOM = await _context.ProductPurchaseUOMs
            .FirstOrDefaultAsync(pu => pu.ProductId == productId && pu.UOMId == uomId);

        if (productPurchaseUOM == null)
            return false;

        productPurchaseUOM.Deactivate();
        await _context.SaveChangesAsync();

        return true;
    }

    public async Task<IEnumerable<ProductSaleUOMDto>> GetProductSaleUOMsAsync(Guid productId)
    {
        return await _context.ProductSaleUOMs
            .Where(su => su.ProductId == productId && su.IsActive)
            .Select(su => new ProductSaleUOMDto
            {
                Id = su.Id,
                ProductId = su.ProductId,
                UOMId = su.UOMId,
                UOMCode = string.Empty,
                UOMName = string.Empty,
                ConversionToBase = su.ConversionToBase,
                Price = su.Price,
                IsDefault = su.IsDefault,
                IsActive = su.IsActive
            })
            .ToListAsync();
    }

    public async Task<ProductSaleUOMDto> AddProductSaleUOMAsync(Guid productId, CreateProductSaleUOMRequest request, Guid userId)
    {
        var product = await _context.Products.FindAsync(productId);
        if (product == null)
            throw new InvalidOperationException("Product not found");

        var existing = await _context.ProductSaleUOMs
            .FirstOrDefaultAsync(su => su.ProductId == productId && su.UOMId == request.UOMId);

        if (existing != null)
            throw new InvalidOperationException("Sale UOM already exists for this product");

        var productSaleUOM = new Domain.Entities.ProductSaleUOM(
            productId,
            request.UOMId,
            request.ConversionToBase,
            request.Price,
            request.IsDefault
        );

        _context.ProductSaleUOMs.Add(productSaleUOM);
        await _context.SaveChangesAsync();

        return new ProductSaleUOMDto
        {
            Id = productSaleUOM.Id,
            ProductId = productSaleUOM.ProductId,
            UOMId = productSaleUOM.UOMId,
            UOMCode = string.Empty,
            UOMName = string.Empty,
            ConversionToBase = productSaleUOM.ConversionToBase,
            Price = productSaleUOM.Price,
            IsDefault = productSaleUOM.IsDefault,
            IsActive = productSaleUOM.IsActive
        };
    }

    public async Task<bool> RemoveProductSaleUOMAsync(Guid productId, Guid uomId, Guid userId)
    {
        var productSaleUOM = await _context.ProductSaleUOMs
            .FirstOrDefaultAsync(su => su.ProductId == productId && su.UOMId == uomId);

        if (productSaleUOM == null)
            return false;

        productSaleUOM.Deactivate();
        await _context.SaveChangesAsync();

        return true;
    }

    public async Task UpdatePurchasePriceAsync(Guid productId, decimal purchasePrice)
    {
        var product = await _context.Products.FindAsync(productId);
        if (product == null)
            throw new InvalidOperationException("Product not found");

        product.UpdatePurchasePrice(purchasePrice);
        await _context.SaveChangesAsync();
    }
}
