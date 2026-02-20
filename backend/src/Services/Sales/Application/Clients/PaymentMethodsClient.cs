using System.Text;
using System.Text.Json;

namespace Profitzen.Sales.Application.Clients;

public class PaymentMethodsClient
{
    private readonly HttpClient _httpClient;
    private readonly ILogger<PaymentMethodsClient> _logger;

    public PaymentMethodsClient(HttpClient httpClient, ILogger<PaymentMethodsClient> logger)
    {
        _httpClient = httpClient;
        _logger = logger;
    }

    public async Task<CachedSaleCalculation?> GetCachedCalculationAsync(string cacheKey)
    {
        try
        {
            _logger.LogInformation("Retrieving cached calculation: {CacheKey}", cacheKey);
            
            var response = await _httpClient.GetAsync($"/api/payment-methods/get-calculation/{cacheKey}");
            
            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning("Failed to retrieve cached calculation: {CacheKey}, Status: {Status}", 
                    cacheKey, response.StatusCode);
                return null;
            }

            var json = await response.Content.ReadAsStringAsync();
            var result = JsonSerializer.Deserialize<CachedSaleCalculation>(json, new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            });

            _logger.LogInformation("Successfully retrieved cached calculation: {CacheKey}", cacheKey);
            return result;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving cached calculation: {CacheKey}", cacheKey);
            return null;
        }
    }
}

public class CachedSaleCalculation
{
    public string CacheKey { get; set; } = string.Empty;
    public List<CachedItemCalculation> Items { get; set; } = new();
    public decimal Subtotal { get; set; }
    public decimal TaxAmount { get; set; }
    public decimal Total { get; set; }
    public decimal RoundingAdjustment { get; set; }
    public decimal FinalTotal { get; set; }
    public decimal AmountReceived { get; set; }
    public decimal ChangeAmount { get; set; }
    public bool IsPaymentSufficient { get; set; }
}

public class CachedItemCalculation
{
    public Guid ProductId { get; set; }
    public string ProductName { get; set; } = string.Empty;
    public string ProductCode { get; set; } = string.Empty;
    public decimal Quantity { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal DiscountAmount { get; set; }
    public decimal Subtotal { get; set; }
    public decimal ConversionToBase { get; set; }
    public Guid? UOMId { get; set; }
    public string? UOMCode { get; set; }
}
