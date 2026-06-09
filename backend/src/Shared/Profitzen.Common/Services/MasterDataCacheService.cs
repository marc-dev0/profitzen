using Sagr.Http;
using System.Text.Json;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace Profitzen.Common.Services;

public interface IMasterDataCacheService
{
    Task<(string Code, string Name)?> GetUOMAsync(Guid uomId, string? tenantId = null);
    Task<string?> GetCategoryNameAsync(Guid categoryId, string? tenantId = null);
}

public class MasterDataCacheService : IMasterDataCacheService
{
    private readonly ServiceHttpClient _serviceHttpClient;
    private readonly IConfiguration _configuration;
    private readonly ILogger<MasterDataCacheService> _logger;

    private static Dictionary<Guid, (string Code, string Name)> _uomCache = new();
    private static Dictionary<Guid, string> _categoryCache = new();
    private static DateTime _lastCacheUpdate = DateTime.MinValue;
    private static readonly TimeSpan _cacheExpiration = TimeSpan.FromMinutes(10);
    private static readonly object _cacheLock = new();

    public MasterDataCacheService(
        ServiceHttpClient serviceHttpClient,
        IConfiguration configuration,
        ILogger<MasterDataCacheService> logger)
    {
        _serviceHttpClient = serviceHttpClient;
        _configuration = configuration;
        _logger = logger;
    }

    public async Task<(string Code, string Name)?> GetUOMAsync(Guid uomId, string? tenantId = null)
    {
        await RefreshCacheIfNeededAsync(tenantId);

        lock (_cacheLock)
        {
            if (_uomCache.TryGetValue(uomId, out var uom))
            {
                return uom;
            }
        }

        // Not found, try force refresh
        _logger.LogInformation("UOM {UOMId} not found in cache, forcing refresh", uomId);
        await ForceRefreshCacheAsync(tenantId);

        lock (_cacheLock)
        {
            if (_uomCache.TryGetValue(uomId, out var uom))
            {
                return uom;
            }
        }

        _logger.LogWarning("UOM {UOMId} not found even after refresh.", uomId);
        return null;
    }

    public async Task<string?> GetCategoryNameAsync(Guid categoryId, string? tenantId = null)
    {
        await RefreshCacheIfNeededAsync(tenantId);

        lock (_cacheLock)
        {
            if (_categoryCache.TryGetValue(categoryId, out var categoryName))
            {
                return categoryName;
            }
        }
        
        // Try force refresh for categories too
        await ForceRefreshCacheAsync(tenantId);

        lock (_cacheLock)
        {
            if (_categoryCache.TryGetValue(categoryId, out var categoryName))
            {
                return categoryName;
            }
        }

        return null;
    }

    private async Task RefreshCacheIfNeededAsync(string? tenantId = null)
    {
        if (DateTime.UtcNow - _lastCacheUpdate < _cacheExpiration)
        {
            lock (_cacheLock)
            {
                if (_uomCache.Count > 0 || _categoryCache.Count > 0)
                {
                    return;
                }
            }
        }

        await ForceRefreshCacheAsync(tenantId);
    }

    private async Task ForceRefreshCacheAsync(string? tenantId = null)
    {
        await Task.WhenAll(
            LoadUOMsAsync(tenantId),
            LoadCategoriesAsync(tenantId)
        );

        lock (_cacheLock)
        {
            _lastCacheUpdate = DateTime.UtcNow;
        }
    }

    private async Task LoadUOMsAsync(string? tenantId = null)
    {
        try
        {
            var masterDataUrl = _configuration["Services:MasterData:Url"] ?? "http://localhost:5007";
            var client = _serviceHttpClient.CreateClient(tenantId: tenantId);

            _logger.LogInformation("Loading UOMs from Master Data Service for tenant: {TenantId}", tenantId ?? "default");

            var response = await client.GetAsync($"{masterDataUrl}/api/master-data/values?typeCode=UOM");

            if (response.IsSuccessStatusCode)
            {
                var content = await response.Content.ReadAsStringAsync();
                _logger.LogInformation("Master Data JSON: {Content}", content);
                var uoms = JsonSerializer.Deserialize<List<MasterDataValueDto>>(content, new JsonSerializerOptions
                {
                    PropertyNameCaseInsensitive = true
                });

                if (uoms != null)
                {
                    lock (_cacheLock)
                    {
                        _uomCache = uoms.ToDictionary(
                            u => u.Id, 
                            u => (
                                !string.IsNullOrEmpty(u.Code) ? u.Code : (!string.IsNullOrEmpty(u.Value) ? u.Value : "UND"),
                                !string.IsNullOrEmpty(u.Name) ? u.Name : (!string.IsNullOrEmpty(u.Description) ? u.Description : (!string.IsNullOrEmpty(u.Value) ? u.Value : "Unidad"))
                            )
                        );
                        _logger.LogInformation("Loaded {Count} UOMs into cache", _uomCache.Count);
                    }
                }
            }
            else
            {
                _logger.LogWarning("Failed to load UOMs. Status: {Status}", response.StatusCode);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error loading UOMs from Master Data Service");
        }
    }

    private async Task LoadCategoriesAsync(string? tenantId = null)
    {
        try
        {
            var masterDataUrl = _configuration["Services:MasterData:Url"] ?? "http://localhost:5007";
            var client = _serviceHttpClient.CreateClient(tenantId: tenantId);

            _logger.LogInformation("Loading categories from Master Data Service for tenant: {TenantId}", tenantId ?? "default");

            var response = await client.GetAsync($"{masterDataUrl}/api/master-data/values?typeCode=CATEGORY");

            if (response.IsSuccessStatusCode)
            {
                var content = await response.Content.ReadAsStringAsync();
                var categories = JsonSerializer.Deserialize<List<MasterDataValueDto>>(content, new JsonSerializerOptions
                {
                    PropertyNameCaseInsensitive = true
                });

                if (categories != null)
                {
                    lock (_cacheLock)
                    {
                        _categoryCache = categories.ToDictionary(
                            c => c.Id, 
                            c => !string.IsNullOrEmpty(c.Name) ? c.Name : (!string.IsNullOrEmpty(c.Description) ? c.Description : "Sin Categoría")
                        );
                        _logger.LogInformation("Loaded {Count} categories into cache", _categoryCache.Count);
                    }
                }
            }
            else
            {
                _logger.LogWarning("Failed to load categories. Status: {Status}", response.StatusCode);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error loading categories from Master Data Service");
        }
    }

    private class MasterDataValueDto
    {
        public Guid Id { get; set; }
        public string Code { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string Value { get; set; } = string.Empty; // Fallback
        public string Description { get; set; } = string.Empty; // Fallback
    }
}
