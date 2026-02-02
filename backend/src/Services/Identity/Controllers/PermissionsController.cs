using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Profitzen.Identity.Application.DTOs;
using Profitzen.Identity.Domain.Entities;
using Profitzen.Identity.Domain.Enums;
using Profitzen.Identity.Infrastructure;
using Profitzen.Identity.Authorization;

namespace Profitzen.Identity.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
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
    [RequireRole(UserRole.Admin)]
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
    [RequireRole(UserRole.Admin)]
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

    [HttpGet("modules")]
    [RequireRole(UserRole.Admin)]
    public async Task<ActionResult<List<AppModuleDto>>> GetModules()
    {
        try
        {
            var allModules = await _dbContext.AppModules
                .Where(m => m.IsActive)
                .ToListAsync();

            var result = new List<AppModuleDto>();
            
            // Get root modules ordered by custom group sequence
            var roots = allModules
                .Where(m => m.ParentId == null)
                .OrderBy(m => GetGroupOrder(m.GroupName))
                .ThenBy(m => m.SortOrder)
                .ToList();

            foreach (var root in roots)
            {
                var rootDto = MapToDto(root, allModules);
                // We add the root
                result.Add(new AppModuleDto 
                { 
                    Id = rootDto.Id, 
                    Code = rootDto.Code, 
                    Name = rootDto.Name, 
                    GroupName = rootDto.GroupName,
                    Icon = rootDto.Icon,
                    Route = rootDto.Route,
                    SortOrder = rootDto.SortOrder
                });

                // Then add children immediately after for the flat matrix view
                foreach (var child in rootDto.Children)
                {
                    result.Add(new AppModuleDto 
                    { 
                        Id = child.Id, 
                        Code = child.Code, 
                        Name = "   " + child.Name, // Visual indentation for child
                        GroupName = root.GroupName, // Inherit group for matrix label
                        Icon = child.Icon,
                        Route = child.Route,
                        SortOrder = child.SortOrder,
                        ParentId = root.Id
                    });
                }
            }

            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching app modules");
            return StatusCode(500, new { message = "Error al obtener módulos del sistema" });
        }
    }

    [HttpGet("menu")]
    public async Task<ActionResult<List<AppModuleDto>>> GetMenu()
    {
        try
        {
            var roleClaim = User.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value;
            if (string.IsNullOrEmpty(roleClaim)) return Unauthorized();

            UserRole userRole;
            if (!Enum.TryParse<UserRole>(roleClaim, out userRole))
            {
                _logger.LogWarning("Invalid role claim format: {RoleClaim}", roleClaim);
                return Unauthorized();
            }
            
            var allAssignedRoles = Enum.GetValues<UserRole>()
                .Where(r => r != UserRole.None && userRole.HasFlag(r))
                .ToList();

            var allowedModuleCodes = await _dbContext.RoleModulePermissions
                .Where(p => allAssignedRoles.Contains(p.Role))
                .Select(p => p.Module)
                .Distinct()
                .ToListAsync();

            var allModules = await _dbContext.AppModules
                .Where(m => m.IsActive && m.IsVisibleInMenu)
                .ToListAsync();

            var userModules = allModules
                .Where(m => allowedModuleCodes.Contains(m.Code))
                .ToList();

            var rootModules = userModules
                .Where(m => m.ParentId == null)
                .OrderBy(m => GetGroupOrder(m.GroupName))
                .ThenBy(m => m.SortOrder)
                .Select(m => MapToDto(m, userModules))
                .ToList();

            return Ok(rootModules);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating user menu");
            return StatusCode(500, new { message = "Error al generar menú de usuario" });
        }
    }

    private int GetGroupOrder(string? groupName)
    {
        return groupName?.ToUpper() switch
        {
            "PRINCIPAL" => 1,
            "VENTAS" => 2,
            "INTELIGENCIA" => 3,
            "OPERACIONES" => 4,
            "CONFIGURACION" => 5,
            _ => 99
        };
    }

    private AppModuleDto MapToDto(AppModule module, List<AppModule> allUserModules)
    {
        var dto = new AppModuleDto
        {
            Id = module.Id,
            Code = module.Code,
            Name = module.Name,
            Route = module.Route,
            Icon = module.Icon,
            ParentId = module.ParentId,
            SortOrder = module.SortOrder,
            GroupName = module.GroupName
        };

        dto.Children = allUserModules
            .Where(m => m.ParentId == module.Id)
            .OrderBy(m => m.SortOrder)
            .Select(m => MapToDto(m, allUserModules))
            .ToList();

        return dto;
    }
}
