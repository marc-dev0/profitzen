using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Profitzen.Identity.Application.DTOs;
using Profitzen.Identity.Domain.Entities;
using Profitzen.Identity.Domain.Enums;
using Profitzen.Identity.Infrastructure;

namespace Profitzen.Identity.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize] // Only authenticated users (likely Admins) can manage permissions
public class PermissionsController : ControllerBase
{
    private readonly IdentityDbContext _dbContext;
    private readonly ILogger<PermissionsController> _logger;

    public PermissionsController(IdentityDbContext dbContext, ILogger<PermissionsController> logger)
    {
        _dbContext = dbContext;
        _logger = logger;
    }

    [HttpGet]
    public async Task<ActionResult<List<PermissionDto>>> GetPermissions()
    {
        try
        {
            var permissions = await _dbContext.RoleModulePermissions.ToListAsync();

            // Group by Role
            var result = new List<PermissionDto>();
            foreach (var role in Enum.GetValues<UserRole>())
            {
                if (role == UserRole.None) continue;

                var roleModules = permissions
                    .Where(p => p.Role == role)
                    .Select(p => p.Module)
                    .ToList();

                result.Add(new PermissionDto
                {
                    Role = role,
                    RoleName = role.ToString(),
                    Modules = roleModules
                });
            }

            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching permissions");
            return StatusCode(500, new { message = "Error interno del servidor" });
        }
    }

    [HttpPut]
    public async Task<ActionResult> UpdatePermissions([FromBody] List<UpdatePermissionRequest> request)
    {
        try
        {
            // Transaction? Not strictly necessary for this context but good practice if highly concurrent
            
            // 1. Remove all existing permissions for the roles in the request (or all permissions if replacing full set)
            // Simplified: We assume the request contains the FULL desired state for the provided roles.
            
            foreach (var update in request)
            {
                if (update.Role == UserRole.None) continue;

                // Remove existing
                var existing = await _dbContext.RoleModulePermissions
                    .Where(p => p.Role == update.Role)
                    .ToListAsync();
                
                _dbContext.RoleModulePermissions.RemoveRange(existing);

                // Add new
                foreach (var module in update.Modules)
                {
                    _dbContext.RoleModulePermissions.Add(new RoleModulePermission
                    {
                        Role = update.Role,
                        Module = module
                    });
                }
            }

            await _dbContext.SaveChangesAsync();
            return Ok(new { message = "Permisos actualizados correctamente" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating permissions");
            return StatusCode(500, new { message = "Error interno del servidor" });
        }
    }
}
