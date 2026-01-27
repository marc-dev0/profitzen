using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Profitzen.Configuration.Application.DTOs;
using Profitzen.Configuration.Application.Services;
using System.Security.Claims;

namespace Profitzen.Configuration.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ConfigurationController : ControllerBase
{
    private readonly IConfigurationService _configurationService;

    public ConfigurationController(IConfigurationService configurationService)
    {
        _configurationService = configurationService;
    }

    private string GetCurrentTenantId()
    {
        return User.FindFirstValue("tenantId")
            ?? throw new UnauthorizedAccessException("Tenant ID not found in token");
    }

    private Guid GetCurrentUserId()
    {
        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return Guid.TryParse(userIdClaim, out var userId)
            ? userId
            : throw new UnauthorizedAccessException("User ID not found in token");
    }

    [HttpGet("series")]
    public async Task<IActionResult> GetDocumentSeries([FromQuery] string? documentType = null)
    {
        var tenantId = GetCurrentTenantId();
        var series = await _configurationService.GetDocumentSeriesAsync(tenantId, documentType);
        return Ok(series);
    }

    [HttpGet("series/{id}")]
    public async Task<IActionResult> GetDocumentSeriesById(Guid id)
    {
        var series = await _configurationService.GetDocumentSeriesByIdAsync(id);
        if (series == null)
            return NotFound();

        return Ok(series);
    }

    [HttpPost("series")]
    public async Task<IActionResult> CreateDocumentSeries([FromBody] CreateDocumentSeriesRequest request)
    {
        var tenantId = GetCurrentTenantId();
        var userId = GetCurrentUserId();
        var series = await _configurationService.CreateDocumentSeriesAsync(request, tenantId, userId);
        return CreatedAtAction(nameof(GetDocumentSeriesById), new { id = series.Id }, series);
    }

    [HttpPut("series/{id}")]
    public async Task<IActionResult> UpdateDocumentSeries(Guid id, [FromBody] UpdateDocumentSeriesRequest request)
    {
        var userId = GetCurrentUserId();
        var series = await _configurationService.UpdateDocumentSeriesAsync(id, request, userId);
        return Ok(series);
    }

    [HttpGet("series/next-number")]
    public async Task<IActionResult> GetNextDocumentNumber([FromQuery] string documentType, [FromQuery] Guid? storeId = null)
    {
        var tenantId = GetCurrentTenantId();
        var nextNumber = await _configurationService.GetNextDocumentNumberAsync(tenantId, documentType, storeId);
        return Ok(nextNumber);
    }

    [HttpPost("series/{seriesCode}/increment")]
    public async Task<IActionResult> IncrementSeriesNumber(string seriesCode)
    {
        var tenantId = GetCurrentTenantId();
        var fullDocumentNumber = await _configurationService.IncrementSeriesNumberAsync(tenantId, seriesCode);
        return Ok(new { FullDocumentNumber = fullDocumentNumber });
    }
}
