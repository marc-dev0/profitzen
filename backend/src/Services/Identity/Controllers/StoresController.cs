using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Profitzen.Identity.Application.DTOs;
using Profitzen.Identity.Application.Services;
using Profitzen.Identity.Authorization;
using Profitzen.Identity.Domain.Enums;
using System.Security.Claims;

namespace Profitzen.Identity.Controllers;

[ApiController]
[Route("api/stores")]
[Authorize]
[RequireRole(UserRole.Admin)]
public class StoresController : ControllerBase
{
    private readonly IStoreService _storeService;

    public StoresController(IStoreService storeService)
    {
        _storeService = storeService;
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

    [HttpGet]
    public async Task<IActionResult> GetStores()
    {
        var tenantId = GetCurrentTenantId();
        var stores = await _storeService.GetStoresAsync(tenantId);
        return Ok(stores);
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetStore(Guid id)
    {
        var store = await _storeService.GetStoreByIdAsync(id);
        if (store == null)
            return NotFound();

        return Ok(store);
    }

    [HttpPost]
    public async Task<IActionResult> CreateStore([FromBody] CreateStoreRequest request)
    {
        try
        {
            var tenantId = GetCurrentTenantId();
            var userId = GetCurrentUserId();
            var store = await _storeService.CreateStoreAsync(request, tenantId, userId);
            return CreatedAtAction(nameof(GetStore), new { id = store.Id }, store);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> UpdateStore(Guid id, [FromBody] UpdateStoreRequest request)
    {
        try
        {
            var userId = GetCurrentUserId();
            var store = await _storeService.UpdateStoreAsync(id, request, userId);
            return Ok(store);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPatch("{id:guid}/activate")]
    public async Task<IActionResult> ActivateStore(Guid id)
    {
        var userId = GetCurrentUserId();
        var result = await _storeService.ActivateStoreAsync(id, userId);
        if (!result)
            return NotFound();

        return NoContent();
    }

    [HttpPatch("{id:guid}/deactivate")]
    public async Task<IActionResult> DeactivateStore(Guid id)
    {
        var userId = GetCurrentUserId();
        var result = await _storeService.DeactivateStoreAsync(id, userId);
        if (!result)
            return NotFound();

        return NoContent();
    }
}
