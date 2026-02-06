using System.Net.Http.Json;
using Profitzen.Common.Http;
using Profitzen.Sales.Application.DTOs;

namespace Profitzen.Sales.Application.Services;

public class CustomerClient : ICustomerClient
{
    private readonly ServiceHttpClient _serviceHttpClient;
    private readonly IConfiguration _configuration;
    private readonly ILogger<CustomerClient> _logger;

    public CustomerClient(
        ServiceHttpClient serviceHttpClient,
        IConfiguration configuration,
        ILogger<CustomerClient> logger)
    {
        _serviceHttpClient = serviceHttpClient;
        _configuration = configuration;
        _logger = logger;
    }

    public async Task<CustomerDto?> GetCustomerByIdAsync(Guid customerId, string? tenantId = null)
    {
        var customerServiceUrl = _configuration["Services:Customer:Url"];
        if (string.IsNullOrEmpty(customerServiceUrl))
        {
            _logger.LogWarning("Customer service URL not configured.");
            return null;
        }

        try
        {
            _logger.LogInformation("Fetching customer from Customer Service. URL: {Url}, CustomerId: {CustomerId}",
                customerServiceUrl, customerId);

            // We use CreateClient which internally looks up the current HttpContext to find the TenantId if not provided.
            // AND crucially, we want to forward the Bearer token if we are acting on behalf of a user.
            
            // ServiceHttpClient by default adds X-Service-Key and X-Tenant-Id.
            // But for [Authorize] endpoints, we usually need the User's Bearer token too.
            // ServiceHttpClient doesn't automatically forward the Bearer token in CreateClient(), only in CreateClientWithAuth() (which doesn't exist in the one showed but likely exists in the class or should be used if it was there).
            // Wait, I saw CreateClientWithAuth in Step 439! It takes (name, bearerToken, tenantId).
            
            // We need to extract the current token to forward it.
            // Typically done via IHttpContextAccessor (which ServiceHttpClient has, but acts on it differently).
            
            // Let's use the helper if available, or just standard CreateClient and see if ServiceHttpClient does it? 
            // Step 439 shows CreateClientWithAuth takes a bearerToken. It doesn't auto-extract it.
            // So we must manually get it. Since we are inside a Service, we don't have direct access to HttpContext here unless injected.
            // But wait, ServiceHttpClient HAS IHttpContextAccessor. Does it expose a way to get the token? No.
            // But we can just use CreateClient() and hope the service-to-service key is enough?
            // The error was 401. If the target service requires User Auth, we MUST forward the user token.
            
            // Correction: ServiceHttpClient doesn't seem to have a method to "ForwardCurrentBearerToken".
            // So we rely on "X-Service-Key". The target service (Customer) likely supports Service Auth Scheme OR User Auth.
            // If CustomerController uses [Authorize], it usually defaults to Bearer.
            // Does it support "Service" policy?
            // In SalesService Program.cs we saw `builder.Services.AddServiceAuth();`. CustomerService likely has the same.
            // If so, `X-Service-Key` should be enough IF the controller allows it.
            // BUT, if the controller ONLY allows "Bearer", we are stuck unless we forward the token.
            
            // Let's TRY to pass the TenantId first, as that ensures Multitenancy works.
            var client = _serviceHttpClient.CreateClient(tenantId: tenantId);

            var response = await client.GetAsync($"{customerServiceUrl}/api/customer/internal/customers/{customerId}");

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning("Customer not found or error. Status: {Status}", response.StatusCode);
                return null;
            }

            return await response.Content.ReadFromJsonAsync<CustomerDto>();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error calling Customer Service for CustomerId: {CustomerId}", customerId);
            return null;
        }
    }

    public async Task<bool> CreateCreditAsync(Guid customerId, Guid storeId, decimal amount, DateTime? dueDate, string notes, string tenantId)
    {
        var customerServiceUrl = _configuration["Services:Customer:Url"];
        if (string.IsNullOrEmpty(customerServiceUrl))
        {
            _logger.LogWarning("Customer service URL not configured. Credit creation skipped.");
            return false;
        }

        try
        {
            _logger.LogInformation("Creating credit in Customer Service. CustomerId: {CustomerId}, StoreId: {StoreId}, Amount: {Amount}",
                customerId, storeId, amount);

            var client = _serviceHttpClient.CreateClient(tenantId: tenantId);

            var request = new 
            {
                CustomerId = customerId,
                StoreId = storeId,
                Amount = amount,
                DueDate = dueDate,
                Notes = notes
            };

            var response = await client.PostAsJsonAsync($"{customerServiceUrl}/api/customer/internal/credits", request);

            if (response.IsSuccessStatusCode)
            {
                _logger.LogInformation("Credit created successfully.");
                return true;
            }

            var error = await response.Content.ReadAsStringAsync();
            _logger.LogError("Failed to create credit. Status: {Status}, Error: {Error}", response.StatusCode, error);
            return false;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error calling Customer Service to create credit.");
            return false;
        }
    }

    public async Task<bool> RefundCreditAsync(Guid customerId, string reference, string tenantId)
    {
        var customerServiceUrl = _configuration["Services:Customer:Url"];
        if (string.IsNullOrEmpty(customerServiceUrl))
        {
            _logger.LogWarning("Customer service URL not configured. Credit refund skipped.");
            return false;
        }

        try
        {
            _logger.LogInformation("Refunding credit in Customer Service. CustomerId: {CustomerId}, Reference: {Reference}",
                customerId, reference);

            var client = _serviceHttpClient.CreateClient(tenantId: tenantId);

            var request = new 
            {
                CustomerId = customerId,
                Reference = reference
            };

            var response = await client.PostAsJsonAsync($"{customerServiceUrl}/api/customer/internal/credits/refund", request);

            if (response.IsSuccessStatusCode)
            {
                _logger.LogInformation("Credit refunded successfully.");
                return true;
            }

            var error = await response.Content.ReadAsStringAsync();
            _logger.LogError("Failed to refund credit. Status: {Status}, Error: {Error}", response.StatusCode, error);
            return false;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error calling Customer Service to refund credit.");
            return false;
        }
    }
}
