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

    public AnalyticsController(IAnalyticsService analyticsService, AnalyticsDbContext context)
    {
        _analyticsService = analyticsService;
        _context = context;
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

    [HttpPost("generate-summaries")]
    public async Task<IActionResult> GenerateSummaries()
    {
        var tenantId = GetCurrentTenantId();
        var storeId = GetCurrentStoreId();
        await _analyticsService.GenerateDailySummariesAsync(tenantId, storeId);
        return Ok(new { message = "Summaries generated successfully" });
    }

    [HttpGet("debug-counts")]
    [AllowAnonymous]
    public async Task<IActionResult> GetDebugCounts([FromQuery] string? storeIdParam)
    {
        // Allow passing storeId via query or get from token
        // Use raw SQL to bypass any filters
         var tenantId = GetCurrentTenantId();
         var storeId = !string.IsNullOrEmpty(storeIdParam) ? Guid.Parse(storeIdParam) : GetCurrentStoreId();

         var connection = _context.Database.GetDbConnection();
         await connection.OpenAsync();
         var result = new Dictionary<string, object>();

         try 
         {
             var cmd = connection.CreateCommand();
             
             // Check Sales
             cmd.CommandText = $"SELECT COUNT(*) FROM sales.\"Sales\" WHERE \"TenantId\" = '{tenantId}'";
             result["TotalSalesInDB"] = await cmd.ExecuteScalarAsync();

             cmd.CommandText = $"SELECT COUNT(*) FROM sales.\"Sales\" WHERE \"TenantId\" = '{tenantId}' AND \"StoreId\" = '{storeId}'";
             result["SalesForStore"] = await cmd.ExecuteScalarAsync();

             cmd.CommandText = $"SELECT COUNT(*) FROM sales.\"Sales\" WHERE \"TenantId\" = '{tenantId}' AND \"StoreId\" = '{storeId}' AND \"Status\" = 2";
             result["CompletedSalesForStore"] = await cmd.ExecuteScalarAsync();

             // Check Summaries
             cmd.CommandText = $"SELECT COUNT(*) FROM analytics.\"DailySalesSummaries\" WHERE \"TenantId\" = '{tenantId}'";
             result["TotalSummariesInDB"] = await cmd.ExecuteScalarAsync();

             cmd.CommandText = $"SELECT COUNT(*) FROM analytics.\"DailySalesSummaries\" WHERE \"TenantId\" = '{tenantId}' AND \"StoreId\" = '{storeId}'";
             result["SummariesForStore"] = await cmd.ExecuteScalarAsync();

             // Check Dates
             cmd.CommandText = $"SELECT \"Date\" FROM analytics.\"DailySalesSummaries\" WHERE \"TenantId\" = '{tenantId}' AND \"StoreId\" = '{storeId}' ORDER BY \"Date\" DESC LIMIT 5";
             var dates = new List<string>();
             using (var reader = await cmd.ExecuteReaderAsync())
             {
                 while (await reader.ReadAsync())
                 {
                     dates.Add(reader.GetDateTime(0).ToString("yyyy-MM-dd")); // Driver reads date as DateTime
                 }
             }
             result["RecentSummaryDates"] = dates;
             
             result["TenantId"] = tenantId;
             result["StoreId"] = storeId;
         }
         finally
         {
             await connection.CloseAsync();
         }

         return Ok(result);
    }
}
