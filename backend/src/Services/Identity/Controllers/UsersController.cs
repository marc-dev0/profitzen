using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Profitzen.Identity.Application.DTOs;
using Profitzen.Identity.Application.Services;
using Profitzen.Identity.Authorization;
using Profitzen.Identity.Domain.Enums;
using System.Security.Claims;

namespace Profitzen.Identity.Controllers;

[ApiController]
[Route("api/users")]
[Authorize]
[RequireRole(UserRole.Admin)]
public class UsersController : ControllerBase
{
    private readonly IUserManagementService _userManagementService;

    public UsersController(IUserManagementService userManagementService)
    {
        _userManagementService = userManagementService;
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
    public async Task<IActionResult> GetUsers()
    {
        var tenantId = GetCurrentTenantId();
        var users = await _userManagementService.GetUsersAsync(tenantId);
        return Ok(users);
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetUser(Guid id)
    {
        var user = await _userManagementService.GetUserByIdAsync(id);
        if (user == null)
            return NotFound();

        return Ok(user);
    }

    [HttpPost]
    public async Task<IActionResult> CreateUser([FromBody] CreateUserRequest request)
    {
        try
        {
            var tenantId = GetCurrentTenantId();
            var userId = GetCurrentUserId();
            var user = await _userManagementService.CreateUserAsync(request, tenantId, userId);
            return CreatedAtAction(nameof(GetUser), new { id = user.Id }, user);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> UpdateUser(Guid id, [FromBody] UpdateUserRequest request)
    {
        try
        {
            var userId = GetCurrentUserId();
            var user = await _userManagementService.UpdateUserAsync(id, request, userId);
            return Ok(user);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPatch("{id:guid}/activate")]
    public async Task<IActionResult> ActivateUser(Guid id)
    {
        var userId = GetCurrentUserId();
        var result = await _userManagementService.ActivateUserAsync(id, userId);
        if (!result)
            return NotFound();

        return NoContent();
    }

    [HttpPatch("{id:guid}/deactivate")]
    public async Task<IActionResult> DeactivateUser(Guid id)
    {
        var userId = GetCurrentUserId();
        var result = await _userManagementService.DeactivateUserAsync(id, userId);
        if (!result)
            return NotFound();

        return NoContent();
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> DeleteUser(Guid id)
    {
        var userId = GetCurrentUserId();
        var result = await _userManagementService.DeleteUserAsync(id, userId);
        if (!result)
            return NotFound();

        return NoContent();
    }

    [HttpPost("{id:guid}/change-password")]
    public async Task<IActionResult> ChangePassword(Guid id, [FromBody] ChangePasswordRequest request)
    {
        var currentUserId = GetCurrentUserId();
        if (currentUserId != id)
            return Forbid();

        var result = await _userManagementService.ChangePasswordAsync(id, request);
        if (!result)
            return BadRequest(new { message = "Failed to change password. Please verify your current password." });

        return NoContent();
    }
}
