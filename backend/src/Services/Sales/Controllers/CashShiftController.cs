using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Profitzen.Sales.Application.Services;
using Profitzen.Sales.Domain.Entities;
using System.Linq;
using System.Security.Claims;
using Microsoft.Extensions.Logging;

namespace Profitzen.Sales.Controllers;

[ApiController]
[Route("api/sales/cash-shifts")]
[Authorize]
public class CashShiftController : ControllerBase
{
    private readonly ICashShiftService _cashShiftService;
    private readonly ILogger<CashShiftController> _logger;

    public CashShiftController(ICashShiftService cashShiftService, ILogger<CashShiftController> logger)
    {
        _cashShiftService = cashShiftService;
        _logger = logger;
    }

    [HttpGet("open")]
    public async Task<IActionResult> GetOpenShift([FromQuery] Guid storeId)
    {
        var tenantId = GetCurrentTenantId();
        var shift = await _cashShiftService.GetOpenShiftAsync(tenantId, storeId);
        
        if (shift == null) return NoContent();
        
        // If open, let's refresh details to show current stats
        var details = await _cashShiftService.GetShiftDetailsAsync(shift.Id);
        return Ok(details);
    }

    [HttpPost("open")]
    public async Task<IActionResult> OpenShift([FromBody] OpenShiftRequest request)
    {
        var tenantId = GetCurrentTenantId();
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
        
        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized(new { message = "No se pudo identificar al usuario." });
        }

        var userName = User.Identity?.Name ?? "Usuario"; // Fallback name

        try
        {
            var shift = await _cashShiftService.OpenShiftAsync(tenantId, request.StoreId, userId, userName, request.StartAmount);
            return Ok(shift);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("{id}/close")]
    public async Task<IActionResult> CloseShift(Guid id, [FromBody] CloseShiftRequest request)
    {
        try
        {
            var shift = await _cashShiftService.CloseShiftAsync(id, request.ActualEndAmount, request.Notes);
            return Ok(shift);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("{id}/movements")]
    public async Task<IActionResult> AddMovement(Guid id, [FromBody] AddMovementRequest request)
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
        
        if (string.IsNullOrEmpty(userId))
        {
             userId = User.Identity?.Name ?? "System";
        }

        try
        {
            var movement = await _cashShiftService.AddMovementAsync(id, request.Type, request.Amount, request.Description, userId);
            return Ok(movement);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error adding movement to shift {ShiftId}", id);
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpGet]
    public async Task<IActionResult> GetHistory([FromQuery] Guid storeId, [FromQuery] DateTime? from, [FromQuery] DateTime? to)
    {
        var tenantId = GetCurrentTenantId();
        var history = await _cashShiftService.GetHistoryAsync(tenantId, storeId, from, to);
        return Ok(history);
    }

    private string GetCurrentTenantId()
    {
        var tenantId = User.FindFirst("TenantId")?.Value;
        if (string.IsNullOrEmpty(tenantId)) tenantId = User.FindFirst("tenant_id")?.Value;
        return tenantId ?? string.Empty;
    }
}

public class OpenShiftRequest
{
    public Guid StoreId { get; set; }
    public decimal StartAmount { get; set; }
}

public class CloseShiftRequest
{
    public decimal ActualEndAmount { get; set; }
    public string Notes { get; set; } = string.Empty;
}

public class AddMovementRequest
{
    public string Type { get; set; } = string.Empty; // IN, OUT
    public decimal Amount { get; set; }
    public string Description { get; set; } = string.Empty;
}
