using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Profitzen.Configuration.Application.DTOs;
using Profitzen.Configuration.Application.Services;
using System.Security.Claims;

namespace Profitzen.Configuration.Controllers;

[ApiController]
[Route("api/company")]
[Authorize]
public class CompanyController : ControllerBase
{
    private readonly IConfigurationService _configurationService;
    private readonly ILogger<CompanyController> _logger;
    private readonly IWebHostEnvironment _environment;
    private readonly IConfiguration _configuration;

    public CompanyController(
        IConfigurationService configurationService,
        ILogger<CompanyController> logger,
        IWebHostEnvironment environment,
        IConfiguration configuration)
    {
        _configurationService = configurationService;
        _logger = logger;
        _environment = environment;
        _configuration = configuration;
    }

    private string GetCurrentTenantId()
    {
        return User.FindFirst("tenantId")?.Value 
            ?? throw new UnauthorizedAccessException("Tenant ID not found in token");
    }

    [HttpGet("settings")]
    public async Task<IActionResult> GetSettings()
    {
        var tenantId = GetCurrentTenantId();
        var settings = await _configurationService.GetCompanySettingsAsync(tenantId);
        
        if (settings == null)
        {
            // Return empty/default settings if not found, or 404?
            // Frontend expects 200 likely, or handles 404.
            // Let's return a default object or 404.
            // Based on frontend hook, it just returns response.data.
            // If API returns 404, axios throws error.
            // The frontend form seems to handle loading state.
            // Let's return 200 with empty default if not found to avoid error on first load.
            return Ok(new CompanySettingsDto(
                Guid.Empty,
                tenantId,
                "", "", "", "", "", "", "", "", "", 
                true, 80, 5, null, "IGV", 0.18m, true, "PEN", "S/"
            ));
        }

        return Ok(settings);
    }

    [HttpPut("settings")]
    public async Task<IActionResult> UpdateSettings([FromBody] UpdateCompanySettingsRequest request)
    {
        var tenantId = GetCurrentTenantId();
        var settings = await _configurationService.UpdateCompanySettingsAsync(tenantId, request);
        return Ok(settings);
    }

    [HttpPost("logo")]
    public async Task<IActionResult> UploadLogo([FromForm] IFormFile logo)
    {
        if (logo == null || logo.Length == 0)
            return BadRequest("No file uploaded");

        if (logo.Length > 5 * 1024 * 1024)
            return BadRequest("File size exceeds 5MB");

        var allowedExtensions = new[] { ".jpg", ".jpeg", ".png", ".svg" };
        var extension = Path.GetExtension(logo.FileName).ToLowerInvariant();
        if (!allowedExtensions.Contains(extension))
            return BadRequest("Invalid file type");

        var tenantId = GetCurrentTenantId();
        
        // Get upload path from configuration or use default
        var uploadBasePath = _configuration["FileStorage:UploadPath"] 
            ?? Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.CommonApplicationData), "Profitzen", "uploads");
        
        var uploadsPath = Path.Combine(uploadBasePath, "logos");
        Directory.CreateDirectory(uploadsPath);

        // CLEANUP: Delete previous logos for this tenant
        // Pattern: {tenantId}_*.{extension}
        var searchPattern = $"{tenantId}_*.*";
        var existingFiles = Directory.GetFiles(uploadsPath, searchPattern);
        foreach (var file in existingFiles)
        {
            try 
            {
                System.IO.File.Delete(file);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Could not delete old logo file: {FileName}", file);
            }
        }

        var fileName = $"{tenantId}_{Guid.NewGuid()}{extension}";
        var filePath = Path.Combine(uploadsPath, fileName);

        using (var stream = new FileStream(filePath, FileMode.Create))
        {
            await logo.CopyToAsync(stream);
        }

        // Save URL pointing to the API endpoint instead of static file
        var logoUrl = $"/api/public/logo/{fileName}";
        
        await _configurationService.UpdateCompanyLogoAsync(tenantId, logoUrl);
        
        return Ok(new { url = logoUrl });
    }

    [HttpGet("/api/public/logo/{fileName}")]
    [AllowAnonymous]
    public IActionResult GetLogo(string fileName)
    {
        _logger.LogInformation("Solicitando logo: {FileName}", fileName);
        try
        {
            var uploadBasePath = _configuration["FileStorage:UploadPath"] 
                ?? Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.CommonApplicationData), "Profitzen", "uploads");
            
            var filePath = Path.Combine(uploadBasePath, "logos", fileName);

            if (!System.IO.File.Exists(filePath))
                return NotFound();

            var fileBytes = System.IO.File.ReadAllBytes(filePath);
            var extension = Path.GetExtension(fileName).ToLowerInvariant();
            var contentType = extension switch
            {
                ".png" => "image/png",
                ".jpg" => "image/jpeg",
                ".jpeg" => "image/jpeg",
                ".svg" => "image/svg+xml",
                _ => "application/octet-stream"
            };

            return File(fileBytes, contentType);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error serving logo");
            return StatusCode(500);
        }
    }
}
