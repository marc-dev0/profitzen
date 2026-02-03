using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Profitzen.Analytics.Application.Services;
using Profitzen.Analytics.Infrastructure;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace Profitzen.Analytics.Controllers;

[ApiController]
[Route("api/analytics")]
[Authorize]
public class AnalyticsController : ControllerBase
{
    private readonly IAnalyticsService _analyticsService;
    private readonly AnalyticsDbContext _context;
    private readonly ILogger<AnalyticsController> _logger;

    public AnalyticsController(IAnalyticsService analyticsService, AnalyticsDbContext context, ILogger<AnalyticsController> logger)
    {
        _analyticsService = analyticsService;
        _context = context;
        _logger = logger;
    }

    private string GetCurrentTenantId()
    {
        return User.FindFirst("TenantId")?.Value ?? string.Empty;
    }

    private Guid GetCurrentStoreId()
    {
        var storeIdClaim = User.FindFirst("StoreId")?.Value;
        return Guid.TryParse(storeIdClaim, out var storeId) ? storeId : Guid.Empty;
    }

    [HttpGet("health")]
    [AllowAnonymous]
    public IActionResult Health()
    {
        return Ok(new
        {
            service = "Analytics Service",
            status = "healthy",
            timestamp = DateTime.UtcNow,
            version = "1.0.0"
        });
    }

    [HttpGet("auth-debug")]
    [AllowAnonymous]
    public IActionResult AuthDebug()
    {
        return Ok(new
        {
            User.Identity?.Name,
            IsAuthenticated = User.Identity?.IsAuthenticated,
            Claims = User.Claims.Select(c => new { c.Type, c.Value }).ToList()
        });
    }

    [HttpGet("dashboard")]
    public async Task<IActionResult> GetDashboard()
    {
        var tenantId = GetCurrentTenantId();
        var storeId = GetCurrentStoreId();
        var dashboard = await _analyticsService.GetDashboardAsync(tenantId, storeId);
        return Ok(dashboard);
    }

    [HttpGet("sales/report")]
    public async Task<IActionResult> GetSalesReport([FromQuery] DateTime fromDate, [FromQuery] DateTime toDate)
    {
        var tenantId = GetCurrentTenantId();
        var storeId = GetCurrentStoreId();
        var report = await _analyticsService.GetSalesReportAsync(tenantId, storeId, fromDate, toDate);
        return Ok(report);
    }

    [HttpGet("sales/daily")]
    public async Task<IActionResult> GetDailySales([FromQuery] DateTime fromDate, [FromQuery] DateTime toDate)
    {
        var tenantId = GetCurrentTenantId();
        var storeId = GetCurrentStoreId();
        var dailySales = await _analyticsService.GetDailySalesAsync(tenantId, storeId, fromDate, toDate);
        return Ok(dailySales);
    }

    [HttpGet("sales/comparison")]
    public async Task<IActionResult> ComparePeriod([FromQuery] DateTime periodStart, [FromQuery] DateTime periodEnd)
    {
        var tenantId = GetCurrentTenantId();
        var storeId = GetCurrentStoreId();
        var comparison = await _analyticsService.ComparePeriodAsync(tenantId, storeId, periodStart, periodEnd);
        return Ok(comparison);
    }

    [HttpGet("products/top")]
    public async Task<IActionResult> GetTopProducts([FromQuery] int count = 10)
    {
        var tenantId = GetCurrentTenantId();
        var topProducts = await _analyticsService.GetTopProductsAsync(tenantId, count);
        return Ok(topProducts);
    }

    [HttpGet("products/performance")]
    public async Task<IActionResult> GetProductPerformance()
    {
        var tenantId = GetCurrentTenantId();
        var performance = await _analyticsService.GetProductPerformanceAsync(tenantId);
        return Ok(performance);
    }

    [HttpGet("inventory/low-stock")]
    public async Task<IActionResult> GetLowStockAlerts()
    {
        var tenantId = GetCurrentTenantId();
        var storeId = GetCurrentStoreId();
        var alerts = await _analyticsService.GetLowStockAlertsAsync(tenantId, storeId);
        return Ok(alerts);
    }

    [HttpGet("inventory/insights")]
    public async Task<IActionResult> GetInventoryInsights([FromQuery] bool refreshAi = false)
    {
        var tenantId = GetCurrentTenantId();
        var storeId = GetCurrentStoreId();
        var insights = await _analyticsService.GetInventoryInsightsAsync(tenantId, storeId, refreshAi);
        return Ok(insights);
    }

    [HttpPost("inventory/insights/trigger")]
    public async Task<IActionResult> TriggerInventoryInsights()
    {
        var tenantId = GetCurrentTenantId();
        var storeId = GetCurrentStoreId();
        await _analyticsService.TriggerInventoryAnalysisAsync(tenantId, storeId);
        return Accepted();
    }

    [HttpPost("generate-summaries")]
    public async Task<IActionResult> GenerateSummaries()
    {
        try 
        {
            var tenantId = GetCurrentTenantId();
            var storeId = GetCurrentStoreId();
            await _analyticsService.TriggerDailySummariesAsync(tenantId, storeId);
            return Accepted();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error triggering summaries");
            return BadRequest(new { error = "An error occurred while triggering summaries." });
        }
    }

    [HttpGet("summaries/latest")]
    public async Task<IActionResult> GetLatestSummaries([FromQuery] int count = 5, [FromQuery] string? type = null)
    {
        var tenantId = GetCurrentTenantId();
        var storeId = GetCurrentStoreId();
        var summaries = await _analyticsService.GetLatestSummariesAsync(tenantId, storeId, count, type);
        return Ok(summaries);
    }
}
