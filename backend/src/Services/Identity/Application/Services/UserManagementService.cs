using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Profitzen.Identity.Application.DTOs;
using Profitzen.Identity.Domain.Entities;
using Profitzen.Identity.Domain.Enums;
using Profitzen.Identity.Infrastructure;

namespace Profitzen.Identity.Application.Services;

public class UserManagementService : IUserManagementService
{
    private readonly IdentityDbContext _context;
    private readonly UserManager<User> _userManager;

    public UserManagementService(
        IdentityDbContext context,
        UserManager<User> userManager)
    {
        _context = context;
        _userManager = userManager;
    }

    public async Task<IEnumerable<UserDto>> GetUsersAsync(string tenantId)
    {
        var users = await _context.Users
            .Include(u => u.Stores)
            .Where(u => u.TenantId == tenantId && u.DeletedAt == null)
            .OrderBy(u => u.FirstName)
            .ThenBy(u => u.LastName)
            .ToListAsync();

        return users.Select(u => new UserDto(
                u.Id,
                u.Email ?? string.Empty,
                u.FirstName,
                u.LastName,
                u.Phone,
                u.Role,
                GetRoleName(u.Role),
                u.Stores.Select(s => s.Id).ToList(),
                u.Stores.Select(s => s.Name).ToList(),
                u.TenantId,
                u.IsActive,
                u.CreatedAt
            )).ToList();
    }

    public async Task<UserDto?> GetUserByIdAsync(Guid id)
    {
        var user = await _context.Users
            .Include(u => u.Stores)
            .Where(u => u.Id == id && u.DeletedAt == null)
            .FirstOrDefaultAsync();

        if (user == null) return null;

        return new UserDto(
            user.Id,
            user.Email ?? string.Empty,
            user.FirstName,
            user.LastName,
            user.Phone,
            user.Role,
            GetRoleName(user.Role),
            user.Stores.Select(s => s.Id).ToList(),
            user.Stores.Select(s => s.Name).ToList(),
            user.TenantId,
            user.IsActive,
            user.CreatedAt
        );
    }

    public async Task<UserDto> CreateUserAsync(CreateUserRequest request, string tenantId, Guid createdBy)
    {
        var stores = await _context.Stores
            .Where(s => request.StoreIds.Contains(s.Id) && s.TenantId == tenantId)
            .ToListAsync();

        if (stores.Count != request.StoreIds.Count)
        {
            throw new InvalidOperationException("Una o más sucursales no fueron encontradas o no pertenecen a este inquilino");
        }

        var existingUser = await _userManager.FindByEmailAsync(request.Email);
        if (existingUser != null)
        {
            throw new InvalidOperationException("El correo electrónico ya está registrado");
        }

        var user = new User
        {
            UserName = request.Email,
            Email = request.Email,
            FirstName = request.FirstName,
            LastName = request.LastName,
            Phone = request.Phone,
            Role = request.Role,
            TenantId = tenantId,
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        
        foreach (var store in stores)
        {
            user.Stores.Add(store);
        }

        var result = await _userManager.CreateAsync(user, request.Password);
        if (!result.Succeeded)
        {
            throw new InvalidOperationException($"Error al crear usuario: {string.Join(", ", result.Errors.Select(e => e.Description))}");
        }

        return new UserDto(
            user.Id,
            user.Email ?? string.Empty,
            user.FirstName,
            user.LastName,
            user.Phone,
            user.Role,
            GetRoleName(user.Role),
            user.Stores.Select(s => s.Id).ToList(),
            user.Stores.Select(s => s.Name).ToList(),
            user.TenantId,
            user.IsActive,
            user.CreatedAt
        );
    }

    public async Task<UserDto> UpdateUserAsync(Guid id, UpdateUserRequest request, Guid updatedBy)
    {
        var user = await _context.Users
            .Include(u => u.Stores)
            .FirstOrDefaultAsync(u => u.Id == id && u.DeletedAt == null);

        if (user == null)
        {
            throw new InvalidOperationException("Usuario no encontrado");
        }

        var stores = await _context.Stores
            .Where(s => request.StoreIds.Contains(s.Id) && s.TenantId == user.TenantId)
            .ToListAsync();

        if (stores.Count != request.StoreIds.Count)
        {
            throw new InvalidOperationException("Una o más sucursales no fueron encontradas o no pertenecen a este inquilino");
        }

        user.UpdateInfo(request.FirstName, request.LastName, request.Phone);
        user.ChangeRole(request.Role);
        
        // Update stores
        user.Stores.Clear();
        foreach (var store in stores)
        {
            user.Stores.Add(store);
        }

        await _context.SaveChangesAsync();

        return new UserDto(
            user.Id,
            user.Email ?? string.Empty,
            user.FirstName,
            user.LastName,
            user.Phone,
            user.Role,
            GetRoleName(user.Role),
            user.Stores.Select(s => s.Id).ToList(),
            user.Stores.Select(s => s.Name).ToList(),
            user.TenantId,
            user.IsActive,
            user.CreatedAt
        );
    }

    public async Task<bool> ActivateUserAsync(Guid id, Guid updatedBy)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == id && u.DeletedAt == null);
        if (user == null)
            return false;

        user.Activate();
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> DeactivateUserAsync(Guid id, Guid updatedBy)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == id && u.DeletedAt == null);
        if (user == null)
            return false;

        user.Deactivate();
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> DeleteUserAsync(Guid id, Guid deletedBy)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == id && u.DeletedAt == null);
        if (user == null)
            return false;

        user.MarkAsDeleted();
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> ChangePasswordAsync(Guid userId, ChangePasswordRequest request)
    {
        var user = await _userManager.FindByIdAsync(userId.ToString());
        if (user == null)
            return false;

        var result = await _userManager.ChangePasswordAsync(user, request.CurrentPassword, request.NewPassword);
        return result.Succeeded;
    }

    private static string GetRoleName(UserRole role)
    {
        var roles = new List<string>();
        if (role.HasFlag(UserRole.Admin)) roles.Add("Administrador");
        if (role.HasFlag(UserRole.Manager)) roles.Add("Gerente");
        if (role.HasFlag(UserRole.Cashier)) roles.Add("Cajero");
        if (role.HasFlag(UserRole.Logistics)) roles.Add("Logística");
        
        return roles.Count > 0 ? string.Join(", ", roles) : "Sin Rol";
    }
}

