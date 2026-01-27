using Profitzen.Analytics.Application.DTOs;

namespace Profitzen.Analytics.Application.Services;

public interface IAnalyticsService
{
    Task<DashboardDto> GetDashboardAsync(string tenantId, Guid storeId);
    Task<SalesReportDto> GetSalesReportAsync(string tenantId, Guid storeId, DateTime fromDate, DateTime toDate);
    Task<IEnumerable<TopProductsDto>> GetTopProductsAsync(string tenantId, int count = 10);
    Task<IEnumerable<ProductPerformanceDto>> GetProductPerformanceAsync(string tenantId);
    Task<IEnumerable<DailySalesSummaryDto>> GetDailySalesAsync(string tenantId, Guid storeId, DateTime fromDate, DateTime toDate);
    Task<PeriodComparisonDto> ComparePeriodAsync(string tenantId, Guid storeId, DateTime periodStart, DateTime periodEnd);
    Task<IEnumerable<LowStockAlertDto>> GetLowStockAlertsAsync(string tenantId, Guid storeId);
    Task GenerateDailySummariesAsync(string tenantId, Guid storeId);
}
