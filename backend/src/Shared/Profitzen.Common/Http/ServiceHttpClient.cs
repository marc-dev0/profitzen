using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;
using System.Net.Http.Headers;

namespace Profitzen.Common.Http;

public class ServiceHttpClient
{
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IHttpContextAccessor _httpContextAccessor;
    private readonly string _serviceApiKey;

    public ServiceHttpClient(
        IHttpClientFactory httpClientFactory,
        IHttpContextAccessor httpContextAccessor,
        IConfiguration configuration)
    {
        _httpClientFactory = httpClientFactory;
        _httpContextAccessor = httpContextAccessor;
        _serviceApiKey = configuration["Services:ApiKey"] ?? "internal-service-key-change-in-production";
    }

    public HttpClient CreateClient(string? name = null, string? tenantId = null)
    {
        var client = string.IsNullOrEmpty(name)
            ? _httpClientFactory.CreateClient()
            : _httpClientFactory.CreateClient(name);

        client.DefaultRequestHeaders.Add("X-Service-Key", _serviceApiKey);

        var tenantIdToUse = tenantId ?? _httpContextAccessor.HttpContext?.User?.FindFirst("TenantId")?.Value;
        if (!string.IsNullOrEmpty(tenantIdToUse))
        {
            client.DefaultRequestHeaders.Add("X-Tenant-Id", tenantIdToUse);
        }

        return client;
    }

    public HttpClient CreateClientWithAuth(string? name = null, string? bearerToken = null, string? tenantId = null)
    {
        var client = CreateClient(name, tenantId);

        if (!string.IsNullOrEmpty(bearerToken))
        {
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", bearerToken);
        }

        return client;
    }
}
