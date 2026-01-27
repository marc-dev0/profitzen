using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Profitzen.Configuration.Application.DTOs;
using Profitzen.Configuration.Application.Services;
using System.Security.Claims;

namespace Profitzen.Configuration.Controllers;

[ApiController]
[Route("api/master-data")]
[Authorize(Policy = "AllowServiceAuth")]
public class MasterDataController : ControllerBase
{
    private readonly IMasterDataService _masterDataService;

    public MasterDataController(IMasterDataService masterDataService)
    {
        _masterDataService = masterDataService;
    }

    private Guid GetCurrentUserId()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return Guid.TryParse(userIdClaim, out var userId) ? userId : Guid.Empty;
    }

    private string GetCurrentTenantId()
    {
        return User.FindFirst("TenantId")?.Value ?? string.Empty;
    }

    [HttpGet("types")]
    public async Task<IActionResult> GetTypes()
    {
        var types = await _masterDataService.GetMasterDataTypesAsync();
        return Ok(types);
    }

    [HttpGet("values")]
    public async Task<IActionResult> GetValues([FromQuery] string? typeCode = null, [FromQuery] bool includeInactive = false)
    {
        if (string.IsNullOrEmpty(typeCode))
            return BadRequest(new { message = "typeCode query parameter is required" });

        var tenantId = GetCurrentTenantId();
        var values = await _masterDataService.GetMasterDataValuesByTypeAsync(typeCode, tenantId, includeInactive);
        return Ok(values);
    }

    [HttpGet("values/{typeCode}")]
    public async Task<IActionResult> GetValuesByType(string typeCode, [FromQuery] bool includeInactive = false)
    {
        var tenantId = GetCurrentTenantId();
        var values = await _masterDataService.GetMasterDataValuesByTypeAsync(typeCode, tenantId, includeInactive);
        return Ok(values);
    }

    [HttpGet("values/by-id/{id:guid}")]
    public async Task<IActionResult> GetValueById(Guid id)
    {
        var value = await _masterDataService.GetMasterDataValueByIdAsync(id);
        if (value == null)
            return NotFound();

        return Ok(value);
    }

    [HttpPost("values")]
    public async Task<IActionResult> CreateValue([FromBody] CreateMasterDataValueRequest request)
    {
        try
        {
            var tenantId = GetCurrentTenantId();
            var userId = GetCurrentUserId();
            var value = await _masterDataService.CreateMasterDataValueAsync(request, tenantId, userId);
            return CreatedAtAction(nameof(GetValueById), new { id = value.Id }, value);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPut("values/{id:guid}")]
    public async Task<IActionResult> UpdateValue(Guid id, [FromBody] UpdateMasterDataValueRequest request)
    {
        try
        {
            var userId = GetCurrentUserId();
            var value = await _masterDataService.UpdateMasterDataValueAsync(id, request, userId);
            return Ok(value);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpDelete("values/{id:guid}")]
    public async Task<IActionResult> DeleteValue(Guid id)
    {
        var userId = GetCurrentUserId();
        var result = await _masterDataService.DeleteMasterDataValueAsync(id, userId);
        if (!result)
            return NotFound();

        return NoContent();
    }
}
