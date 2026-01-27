using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Profitzen.Identity.Application.DTOs;
using Profitzen.Identity.Application.Services;
using System.Security.Claims;

namespace Profitzen.Identity.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _authService;
    private readonly ILogger<AuthController> _logger;

    public AuthController(IAuthService authService, ILogger<AuthController> logger)
    {
        _authService = authService;
        _logger = logger;
    }

    [HttpPost("register")]
    public async Task<ActionResult<LoginResponse>> Register([FromBody] RegisterRequest request)
    {
        try
        {
            var response = await _authService.RegisterAsync(request);
            return Ok(response);
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning("Registration failed: {Message}", ex.Message);
            return BadRequest(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during registration for email: {Email}", request.Email);
            return StatusCode(500, new { message = "Error interno del servidor" });
        }
    }

    [HttpPost("login")]
    public async Task<ActionResult<LoginResponse>> Login([FromBody] LoginRequest request)
    {
        try
        {
            var response = await _authService.LoginAsync(request);
            return Ok(response);
        }
        catch (UnauthorizedAccessException ex)
        {
            _logger.LogWarning("Login failed: {Message}", ex.Message);
            return Unauthorized(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during login for email: {Email}", request.Email);
            return StatusCode(500, new { message = "Error interno del servidor" });
        }
    }

    [HttpGet("me")]
    [Authorize]
    public async Task<ActionResult<UserInfo>> GetCurrentUser()
    {
        try
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (!Guid.TryParse(userIdClaim, out var userId))
            {
                return Unauthorized(new { message = "Token inválido" });
            }

            var userInfo = await _authService.GetUserInfoAsync(userId);
            if (userInfo == null)
            {
                return NotFound(new { message = "Usuario no encontrado" });
            }

            return Ok(userInfo);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting current user info");
            return StatusCode(500, new { message = "Error interno del servidor" });
        }
    }

    [HttpGet("health")]
    public ActionResult<object> Health()
    {
        return Ok(new
        {
            service = "Identity Service",
            status = "healthy",
            timestamp = DateTime.UtcNow,
            version = "1.0.0"
        });
    }

    [HttpPost("forgot-password")]
    public async Task<ActionResult<ForgotPasswordResponse>> ForgotPassword([FromBody] ForgotPasswordRequest request)
    {
        try
        {
            var response = await _authService.ForgotPasswordAsync(request);
            return Ok(response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error processing forgot password request for email: {Email}", request.Email);
            return StatusCode(500, new { message = "Error interno del servidor" });
        }
    }

    [HttpPost("reset-password")]
    public async Task<ActionResult<ResetPasswordResponse>> ResetPassword([FromBody] ResetPasswordRequest request)
    {
        try
        {
            var response = await _authService.ResetPasswordAsync(request);
            return Ok(response);
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning("Password reset failed: {Message}", ex.Message);
            return BadRequest(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during password reset");
            return StatusCode(500, new { message = "Error interno del servidor" });
        }
    }
}