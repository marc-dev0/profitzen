using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using System.Security.Claims;

namespace Profitzen.Common.Middleware;

public class ServiceAuthenticationMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<ServiceAuthenticationMiddleware> _logger;
    private readonly string _serviceApiKey;
    private readonly string _defaultTenantId;

    public ServiceAuthenticationMiddleware(
        RequestDelegate next,
        IConfiguration configuration,
        ILogger<ServiceAuthenticationMiddleware> logger)
    {
        _next = next;
        _logger = logger;
        _serviceApiKey = configuration["Services:ApiKey"] ?? "internal-service-key-change-in-production";
        _defaultTenantId = configuration["Services:DefaultTenantId"] ?? "DEMO";
    }

    public async Task InvokeAsync(HttpContext context)
    {
        if (context.Request.Headers.TryGetValue("X-Service-Key", out var serviceKey))
        {
            if (serviceKey == _serviceApiKey)
            {
                context.Items["IsServiceRequest"] = true;

                if (context.User?.Identity?.IsAuthenticated != true)
                {
                    var tenantId = context.Request.Headers.TryGetValue("X-Tenant-Id", out var tenantIdHeader)
                        ? tenantIdHeader.ToString()
                        : _defaultTenantId;

                    var claims = new List<Claim>
                    {
                        new Claim(ClaimTypes.NameIdentifier, "service"),
                        new Claim(ClaimTypes.Name, "Internal Service"),
                        new Claim("TenantId", tenantId)
                    };

                    var identity = new ClaimsIdentity(claims, "ServiceKey");
                    context.User = new ClaimsPrincipal(identity);

                    _logger.LogDebug("Service-to-service request authenticated with TenantId: {TenantId}", tenantId);
                }
            }
            else
            {
                _logger.LogWarning("Invalid service key provided");
            }
        }

        await _next(context);
    }
}
