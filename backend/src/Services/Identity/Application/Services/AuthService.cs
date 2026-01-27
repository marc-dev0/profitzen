using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Profitzen.Identity.Application.DTOs;
using Profitzen.Identity.Application.Services.Seeding;
using Profitzen.Identity.Domain.Entities;
using Profitzen.Identity.Domain.Enums;
using Profitzen.Identity.Infrastructure;
using Profitzen.Common.Http;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace Profitzen.Identity.Application.Services;

public interface IAuthService
{
    Task<LoginResponse> RegisterAsync(RegisterRequest request);
    Task<LoginResponse> LoginAsync(LoginRequest request);
    Task<UserInfo?> GetUserInfoAsync(Guid userId);
    Task<ForgotPasswordResponse> ForgotPasswordAsync(ForgotPasswordRequest request);
    Task<ResetPasswordResponse> ResetPasswordAsync(ResetPasswordRequest request);
}

public class AuthService : IAuthService
{
    private readonly UserManager<User> _userManager;
    private readonly IdentityDbContext _dbContext;
    private readonly IConfiguration _configuration;
    private readonly ILogger<AuthService> _logger;
    private readonly IDemoDataSeeder _demoDataSeeder;
    private readonly ServiceHttpClient _serviceHttpClient;
    private readonly IWebHostEnvironment _environment;

    public AuthService(
        UserManager<User> userManager,
        IdentityDbContext dbContext,
        IConfiguration configuration,
        ILogger<AuthService> logger,
        IDemoDataSeeder demoDataSeeder,
        ServiceHttpClient serviceHttpClient,
        IWebHostEnvironment environment)
    {
        _userManager = userManager;
        _dbContext = dbContext;
        _configuration = configuration;
        _logger = logger;
        _demoDataSeeder = demoDataSeeder;
        _serviceHttpClient = serviceHttpClient;
        _environment = environment;
    }

    public async Task<LoginResponse> RegisterAsync(RegisterRequest request)
    {
        using var transaction = await _dbContext.Database.BeginTransactionAsync();

        try
        {
            var existingUser = await _userManager.FindByEmailAsync(request.Email);
            if (existingUser != null)
            {
                throw new InvalidOperationException("El email ya está registrado");
            }

            var tenant = Tenant.Create(request.CompanyName);
            await _dbContext.Tenants.AddAsync(tenant);
            await _dbContext.SaveChangesAsync();

            var store = new Store(request.StoreName, "Dirección principal");
            store.GetType().GetProperty("TenantId")!.SetValue(store, tenant.Id);
            await _dbContext.Stores.AddAsync(store);
            await _dbContext.SaveChangesAsync();

            var names = request.FullName.Split(' ', 2);
            var user = new User
            {
                UserName = request.Email,
                Email = request.Email,
                TenantId = tenant.Id,
                FirstName = names.Length > 0 ? names[0] : request.FullName,
                LastName = names.Length > 1 ? names[1] : "",
                Role = UserRole.Admin,
                IsActive = true,
                EmailConfirmed = true
            };
            
            user.Stores.Add(store);

            var createResult = await _userManager.CreateAsync(user, request.Password);
            if (!createResult.Succeeded)
            {
                var errors = string.Join(", ", createResult.Errors.Select(e => e.Description));
                _logger.LogWarning("User creation failed: {Errors}", errors);
                throw new InvalidOperationException($"Error al crear usuario: {errors}");
            }

            await transaction.CommitAsync();

            // Reload user with Store to ensure navigation properties are loaded
            user = await _userManager.Users
                .Include(u => u.Stores)
                .FirstOrDefaultAsync(u => u.Id == user.Id);

            if (user == null || !user.Stores.Any())
            {
                throw new InvalidOperationException("Error al cargar información del usuario");
            }

            await InitializeServicesForTenantAsync(tenant.Id);

            var isDemoEnvironment = _configuration.GetValue<bool>("EnvironmentSettings:IsDemo");
            var autoSeedDemoData = _configuration.GetValue<bool>("EnvironmentSettings:AutoSeedDemoData");

            if (isDemoEnvironment && autoSeedDemoData)
            {
                _logger.LogInformation("Demo environment detected. Seeding demo data for tenant {TenantId}, store {StoreId}", tenant.Id, store.Id);

                try
                {
                    await _demoDataSeeder.SeedDemoDataAsync(tenant.Id, store.Id.ToString(), user.Id);
                    _logger.LogInformation("Demo data seeded successfully for tenant {TenantId}", tenant.Id);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error seeding demo data for tenant {TenantId}. User registered but without demo data.", tenant.Id);
                }
            }

            var permissions = await _dbContext.RoleModulePermissions
                .Where(p => p.Role == user.Role)
                .Select(p => p.Module)
                .ToListAsync();

            var token = GenerateJwtToken(user, permissions);
            var expiresAt = DateTime.UtcNow.AddHours(8);

            _logger.LogInformation("User {UserId} registered successfully for tenant {TenantId}", user.Id, tenant.Id);

            return new LoginResponse
            {
                Token = token,
                ExpiresAt = expiresAt,
                User = new UserInfo
                {
                    Id = user.Id,
                    Email = user.Email!,
                    FirstName = user.FirstName,
                    LastName = user.LastName,
                    FullName = user.FullName,
                    Role = ((int)user.Role).ToString(),
                    Permissions = await _dbContext.RoleModulePermissions
                        .Where(p => p.Role == user.Role)
                        .Select(p => p.Module)
                        .ToListAsync(),
                    Stores = user.Stores.Select(s => new StoreInfo
                    {
                        Id = s.Id,
                        Name = s.Name,
                        TenantId = s.TenantId
                    }).ToList()
                }
            };
        }
        catch
        {
            await transaction.RollbackAsync();
            throw;
        }
    }

    public async Task<LoginResponse> LoginAsync(LoginRequest request)
    {
        var user = await _userManager.Users
            .Include(u => u.Stores)
            .FirstOrDefaultAsync(u => u.Email == request.Email && u.IsActive && u.DeletedAt == null);

        if (user == null)
        {
            _logger.LogWarning("Login attempt failed for email: {Email}", request.Email);
            throw new UnauthorizedAccessException("Credenciales inválidas");
        }

        var isPasswordValid = await _userManager.CheckPasswordAsync(user, request.Password);
        if (!isPasswordValid)
        {
            _logger.LogWarning("Invalid password attempt for user: {UserId}", user.Id);
            throw new UnauthorizedAccessException("Credenciales inválidas");
        }

        if (!user.Stores.Any())
        {
            // Fallback: Try to find stores for the user's tenant and assign them (Self-Healing for Migration)
            var tenantStores = await _dbContext.Stores
                .Where(s => s.TenantId == user.TenantId)
                .ToListAsync();

            if (tenantStores.Any())
            {
                _logger.LogInformation("Found {Count} stores for tenant {TenantId}. Assigning to user {UserId}.", 
                    tenantStores.Count, user.TenantId, user.Id);

                foreach (var store in tenantStores)
                {
                    user.Stores.Add(store);
                }
                
                await _dbContext.SaveChangesAsync();
            }
            else
            {
                _logger.LogError("No stores loaded for user: {UserId} and no stores found for tenant: {TenantId}", user.Id, user.TenantId);
                throw new InvalidOperationException("Error al cargar información de la tienda. No hay tiendas asociadas a su cuenta.");
            }
        }

        if (!user.Stores.Any(s => s.IsActive))
        {
            _logger.LogWarning("Login attempt for user with no active stores: {UserId}", user.Id);
            throw new UnauthorizedAccessException("Tiendas inactivas");
        }

        var permissions = await _dbContext.RoleModulePermissions
            .Where(p => p.Role == user.Role)
            .Select(p => p.Module)
            .ToListAsync();

        var token = GenerateJwtToken(user, permissions);
        var expiresAt = DateTime.UtcNow.AddHours(8);

        _logger.LogInformation("User {UserId} logged in successfully", user.Id);

        return new LoginResponse
        {
            Token = token,
            ExpiresAt = expiresAt,
            User = new UserInfo
            {
                Id = user.Id,
                Email = user.Email!,
                FirstName = user.FirstName,
                LastName = user.LastName,
                FullName = user.FullName,
                Role = ((int)user.Role).ToString(),
                Permissions = permissions,
                Stores = user.Stores.Select(s => new StoreInfo
                {
                    Id = s.Id,
                    Name = s.Name,
                    TenantId = s.TenantId
                }).ToList()
            }
        };
    }

    public async Task<UserInfo?> GetUserInfoAsync(Guid userId)
    {
        var user = await _userManager.Users
            .Include(u => u.Stores)
            .FirstOrDefaultAsync(u => u.Id == userId && u.IsActive && u.DeletedAt == null);

        if (user == null) return null;

        return new UserInfo
        {
            Id = user.Id,
            Email = user.Email!,
            FirstName = user.FirstName,
            LastName = user.LastName,
            FullName = user.FullName,
            Role = ((int)user.Role).ToString(),
            Permissions = await _dbContext.RoleModulePermissions
                .Where(p => p.Role == user.Role)
                .Select(p => p.Module)
                .ToListAsync(),
            Stores = user.Stores.Select(s => new StoreInfo
            {
                Id = s.Id,
                Name = s.Name,
                TenantId = s.TenantId
            }).ToList()
        };
    }

    private string GenerateJwtToken(User user, List<string> permissions)
    {
        var secretKey = _configuration["JWT_SECRET"] ?? "default-super-secret-key-for-development-only-not-for-production";
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claim(ClaimTypes.Email, user.Email!),
            new Claim(ClaimTypes.Name, user.FullName),
            new Claim(ClaimTypes.Role, user.Role.ToString()),
            new Claim("StoreId", user.Stores.FirstOrDefault()?.Id.ToString() ?? string.Empty),
            new Claim("TenantId", user.TenantId),
            new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
            new Claim(JwtRegisteredClaimNames.Iat, DateTimeOffset.UtcNow.ToUnixTimeSeconds().ToString(), ClaimValueTypes.Integer64)
        }.ToList();

        foreach (var permission in permissions)
        {
            claims.Add(new Claim("permissions", permission));
        }

        var token = new JwtSecurityToken(
            issuer: _configuration["JWT_ISSUER"] ?? "Profitzen.Identity",
            audience: _configuration["JWT_AUDIENCE"] ?? "Profitzen.Api",
            claims: claims,
            expires: DateTime.UtcNow.AddHours(8),
            signingCredentials: credentials
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    private async Task InitializeServicesForTenantAsync(string tenantId)
    {
        _logger.LogInformation("Initializing services for new tenant: {TenantId}", tenantId);

        var services = new[]
        {
            new { Name = "Product", BaseUrl = _configuration["Services:Product:Url"] }
        };

        foreach (var service in services)
        {
            if (string.IsNullOrEmpty(service.BaseUrl))
            {
                _logger.LogWarning("Service {ServiceName} URL not configured, skipping initialization", service.Name);
                continue;
            }

            try
            {
                var client = _serviceHttpClient.CreateClient(tenantId: tenantId);
                var response = await client.PostAsJsonAsync(
                    $"{service.BaseUrl}/api/tenants/initialize",
                    new { TenantId = tenantId }
                );

                if (response.IsSuccessStatusCode)
                {
                    _logger.LogInformation("Successfully initialized {ServiceName} service for tenant {TenantId}", service.Name, tenantId);
                }
                else
                {
                    _logger.LogWarning("Failed to initialize {ServiceName} service for tenant {TenantId}. Status: {StatusCode}",
                        service.Name, tenantId, response.StatusCode);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error initializing {ServiceName} service for tenant {TenantId}", service.Name, tenantId);
            }
        }
    }

    public async Task<ForgotPasswordResponse> ForgotPasswordAsync(ForgotPasswordRequest request)
    {
        var user = await _userManager.FindByEmailAsync(request.Email);
        
        // Always return success to prevent email enumeration
        if (user == null)
        {
            _logger.LogWarning("Password reset requested for non-existent email: {Email}", request.Email);
            return new ForgotPasswordResponse("Si el correo existe, recibirás un enlace para restablecer tu contraseña.");
        }

        // Invalidate any existing tokens for this user
        var existingTokens = await _dbContext.PasswordResetTokens
            .Where(t => t.UserId == user.Id && !t.IsUsed && t.ExpiresAt > DateTime.UtcNow)
            .ToListAsync();
        
        foreach (var token in existingTokens)
        {
            token.IsUsed = true;
        }

        // Generate new token (URL-safe)
        var tokenBytes = new byte[32]; // 256 bits
        using (var rng = System.Security.Cryptography.RandomNumberGenerator.Create())
        {
            rng.GetBytes(tokenBytes);
        }
        var base64Token = Convert.ToBase64String(tokenBytes);
        var urlSafeToken = base64Token.Replace('+', '-').Replace('/', '_').Replace("=", "");
        
        var resetToken = new PasswordResetToken
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            Token = urlSafeToken,
            ExpiresAt = DateTime.UtcNow.AddHours(24),
            IsUsed = false,
            CreatedAt = DateTime.UtcNow
        };

        await _dbContext.PasswordResetTokens.AddAsync(resetToken);
        await _dbContext.SaveChangesAsync();

        // TODO: Send email with reset link
        // For now, just log it (in production, you'd send an email)
        var resetLink = $"{_configuration["AppSettings:FrontendUrl"]}/reset-password/{resetToken.Token}";
        _logger.LogInformation("Password reset link for {Email}: {ResetLink}", user.Email, resetLink);

        return new ForgotPasswordResponse("Si el correo existe, recibirás un enlace para restablecer tu contraseña.");
    }

    public async Task<ResetPasswordResponse> ResetPasswordAsync(ResetPasswordRequest request)
    {
        var resetToken = await _dbContext.PasswordResetTokens
            .Include(t => t.User)
            .FirstOrDefaultAsync(t => t.Token == request.Token && !t.IsUsed);

        if (resetToken == null)
        {
            throw new InvalidOperationException("Token inválido o ya utilizado");
        }

        if (resetToken.ExpiresAt < DateTime.UtcNow)
        {
            throw new InvalidOperationException("El token ha expirado");
        }

        var user = resetToken.User;
        if (user == null)
        {
            throw new InvalidOperationException("Usuario no encontrado");
        }

        // Reset password
        var token = await _userManager.GeneratePasswordResetTokenAsync(user);
        var result = await _userManager.ResetPasswordAsync(user, token, request.NewPassword);

        if (!result.Succeeded)
        {
            var errors = string.Join(", ", result.Errors.Select(e => e.Description));
            throw new InvalidOperationException($"Error al restablecer contraseña: {errors}");
        }

        // Mark token as used
        resetToken.IsUsed = true;
        await _dbContext.SaveChangesAsync();

        _logger.LogInformation("Password reset successful for user {UserId}", user.Id);

        return new ResetPasswordResponse("Contraseña restablecida exitosamente");
    }
}