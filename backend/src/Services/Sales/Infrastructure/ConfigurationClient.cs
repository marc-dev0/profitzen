using System.Net.Http.Json;

namespace Profitzen.Sales.Infrastructure;

public interface IConfigurationClient
{
    Task<string> IncrementSeriesNumberAsync(string tenantId, Guid storeId, string documentType, string token);
}

public class ConfigurationClient : IConfigurationClient
{
    private readonly HttpClient _httpClient;
    private readonly IConfiguration _configuration;
    private readonly ILogger<ConfigurationClient> _logger;

    public ConfigurationClient(HttpClient httpClient, IConfiguration configuration, ILogger<ConfigurationClient> logger)
    {
        _httpClient = httpClient;
        _configuration = configuration;
        _logger = logger;
        
        var baseUrl = _configuration["Services:ConfigurationUrl"] ?? "http://localhost:5004";
        _httpClient.BaseAddress = new Uri(baseUrl);
    }

    public async Task<string> IncrementSeriesNumberAsync(string tenantId, Guid storeId, string documentType, string token)
    {
        try
        {
            // First get the series code (next-number endpoint returns seriesCode + number)
            // But we have an endpoint that just gets next number info: GetNextDocumentNumber
            // And another one that increments: IncrementSeriesNumber
            // We need to find the active series for the store first.
            // Let's rely on ConfigurationService logic:
            // 1. Get Series Code for Store+DocType
            // 2. Increment it.
            
            // Actually, let's just use the 'next-number' endpoint to get the series code and next number PREVIEW,
            // but for incrementing, we need to be atomic.
            // The ConfigurationController has IncrementSeriesNumber(seriesCode).
            
            // So we need:
            // 1. Get the Series Code: GET /api/configuration/series/next-number?documentType=X&storeId=Y
            //    Response: { seriesCode: "F001", nextNumber: "000001", fullNumber: "F001-000001" }
            // 2. POST /api/configuration/series/{seriesCode}/increment
            
            _httpClient.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);
            _httpClient.DefaultRequestHeaders.Add("TenantId", tenantId); // Some endpoints might check header

            var nextResponse = await _httpClient.GetFromJsonAsync<NextDocumentNumberResponse>($"/api/configuration/series/next-number?documentType={documentType}&storeId={storeId}");
            
            if (nextResponse == null || string.IsNullOrEmpty(nextResponse.SeriesCode))
            {
                 throw new InvalidOperationException($"No active series found for {documentType} in store {storeId}");
            }

            var incrementResponse = await _httpClient.PostAsync($"/api/configuration/series/{nextResponse.SeriesCode}/increment", null);
            incrementResponse.EnsureSuccessStatusCode();
            
            var result = await incrementResponse.Content.ReadFromJsonAsync<IncrementResponse>();
            return result?.FullDocumentNumber ?? throw new InvalidOperationException("Failed to get incremented number");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting document number for Store {StoreId} Type {Type}", storeId, documentType);
            // Fallback for demo/dev robustness? No, this is critical.
            throw; 
        }
    }
}

public record NextDocumentNumberResponse(string SeriesCode, string NextNumber, string FullDocumentNumber);
public record IncrementResponse(string FullDocumentNumber);
