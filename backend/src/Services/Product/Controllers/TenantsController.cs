using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Profitzen.Product.Application.Services;

namespace Profitzen.Product.Controllers;

[ApiController]
[Route("api/tenants")]
[Authorize(Policy = "AllowServiceAuth")]
public class TenantsController : ControllerBase
{
    private readonly ITenantInitializationService _initializationService;
    private readonly ILogger<TenantsController> _logger;

    public TenantsController(
        ITenantInitializationService initializationService,
        ILogger<TenantsController> logger)
    {
        _initializationService = initializationService;
        _logger = logger;
    }

    [HttpPost("initialize")]
    public async Task<IActionResult> InitializeTenant([FromBody] InitializeTenantRequest request)
    {
        try
        {
            await _initializationService.InitializeTenantAsync(request.TenantId);
            return Ok(new { message = "Tenant initialized successfully" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error initializing tenant {TenantId}", request.TenantId);
            return StatusCode(500, new { error = "Failed to initialize tenant" });
        }
    }
}

public record InitializeTenantRequest(string TenantId);
