using Microsoft.EntityFrameworkCore;
using Profitzen.Analytics.Application.DTOs;
using Profitzen.Analytics.Domain.Entities;
using Profitzen.Analytics.Infrastructure;
using System.Data;
using Microsoft.SemanticKernel;
using Microsoft.Extensions.Logging;

namespace Profitzen.Analytics.Application.Services;

public class AnalyticsService : IAnalyticsService
{
    private readonly AnalyticsDbContext _context;
    private readonly Kernel _kernel;
    private readonly ILogger<AnalyticsService> _logger;

    public AnalyticsService(AnalyticsDbContext context, Kernel kernel, ILogger<AnalyticsService> logger)
    {
        _context = context;
        _kernel = kernel;
        _logger = logger;
    }

    public async Task<DashboardDto> GetDashboardAsync(string tenantId, Guid storeId)
    {
        var connection = _context.Database.GetDbConnection();
        var wasOpen = connection.State == System.Data.ConnectionState.Open;
        if (!wasOpen)
            await connection.OpenAsync();

        try
        {
            var command = connection.CreateCommand();
            
            // Define time ranges (UTC)
            // Define time ranges (UTC adjusted for Peru Time -5)
            var peruOffset = -5;
            var nowPeru = DateTime.UtcNow.AddHours(peruOffset);
            var todayPeru = nowPeru.Date;

            // Map boundaries back to UTC for database comparison
            var today = todayPeru.AddHours(-peruOffset);
            var tomorrow = today.AddDays(1);
            var yesterday = today.AddDays(-1);
            
            var weekStart = today.AddDays(-6);
            var lastWeekStart = weekStart.AddDays(-7);
            
            var monthStartPeru = new DateTime(todayPeru.Year, todayPeru.Month, 1);
            var monthStart = monthStartPeru.AddHours(-peruOffset);
            var lastMonthStartPeru = monthStartPeru.AddMonths(-1);
            var lastMonthStart = lastMonthStartPeru.AddHours(-peruOffset);
            // var lastMonthEnd = monthStart; // Start of this month is end of last month

            var startOf30Days = today.AddDays(-29);

            command.CommandText = @"
                SELECT 
                    -- Today
                    COALESCE(SUM(CASE WHEN ""SaleDate"" >= @Today AND ""SaleDate"" < @Tomorrow THEN ""Total"" ELSE 0 END), 0),
                    COALESCE(COUNT(CASE WHEN ""SaleDate"" >= @Today AND ""SaleDate"" < @Tomorrow THEN 1 END), 0),
                    
                    -- Yesterday
                    COALESCE(SUM(CASE WHEN ""SaleDate"" >= @Yesterday AND ""SaleDate"" < @Today THEN ""Total"" ELSE 0 END), 0),
                    COALESCE(COUNT(CASE WHEN ""SaleDate"" >= @Yesterday AND ""SaleDate"" < @Today THEN 1 END), 0),

                    -- Week
                    COALESCE(SUM(CASE WHEN ""SaleDate"" >= @WeekStart AND ""SaleDate"" < @Tomorrow THEN ""Total"" ELSE 0 END), 0),
                    COALESCE(SUM(CASE WHEN ""SaleDate"" >= @LastWeekStart AND ""SaleDate"" < @WeekStart THEN ""Total"" ELSE 0 END), 0),
                    
                    -- Month
                    COALESCE(SUM(CASE WHEN ""SaleDate"" >= @MonthStart THEN ""Total"" ELSE 0 END), 0),
                    COALESCE(SUM(CASE WHEN ""SaleDate"" >= @LastMonthStart AND ""SaleDate"" < @MonthStart THEN ""Total"" ELSE 0 END), 0),
                    
                    -- Last Month Ticket
                    COALESCE(COUNT(CASE WHEN ""SaleDate"" >= @LastMonthStart AND ""SaleDate"" < @MonthStart THEN 1 END), 0),
                    
                    -- Average Ticket (Current Month)
                    COALESCE(COUNT(CASE WHEN ""SaleDate"" >= @MonthStart THEN 1 END), 0)

                FROM sales.""Sales""
                WHERE ""TenantId"" = @TenantId
                  AND ""StoreId"" = @StoreId
                  AND ""Status"" = 2 -- Completed
                  AND ""SaleDate"" >= @OneYearAgo"; // Limit scan

            // Add parameters
            AddParam(command, "@TenantId", tenantId);
            AddParam(command, "@StoreId", storeId);
            AddParam(command, "@Today", today);
            AddParam(command, "@Tomorrow", tomorrow);
            AddParam(command, "@Yesterday", yesterday);
            AddParam(command, "@WeekStart", weekStart);
            AddParam(command, "@LastWeekStart", lastWeekStart);
            AddParam(command, "@MonthStart", monthStart);
            AddParam(command, "@LastMonthStart", lastMonthStart);
            AddParam(command, "@OneYearAgo", today.AddYears(-1));

            decimal todayRevenue = 0, yesterdayRevenue = 0, weekRevenue = 0, lastWeekRevenue = 0, monthRevenue = 0, lastMonthRevenue = 0;
            decimal todayCost = 0;
            int todaySales = 0, yesterdaySales = 0, lastMonthSalesCount = 0, monthSalesCount = 0;

            using (var reader = await command.ExecuteReaderAsync())
            {
                if (await reader.ReadAsync())
                {
                    todayRevenue = reader.GetDecimal(0);
                    todaySales = System.Convert.ToInt32(reader.GetValue(1));
                    yesterdayRevenue = reader.GetDecimal(2);
                    yesterdaySales = System.Convert.ToInt32(reader.GetValue(3));
                    weekRevenue = reader.GetDecimal(4);
                    lastWeekRevenue = reader.GetDecimal(5);
                    monthRevenue = reader.GetDecimal(6);
                    lastMonthRevenue = reader.GetDecimal(7);
                    lastMonthSalesCount = System.Convert.ToInt32(reader.GetValue(8));
                    monthSalesCount = System.Convert.ToInt32(reader.GetValue(9));
                }
            }

            // Get Today's Cost separately to be accurate
            command.CommandText = @"
                SELECT COALESCE(SUM(si.""Quantity"" * COALESCE(si.""ConversionToBase"", 1) * (p.""PurchasePrice"" / COALESCE(pu.""ConversionToBase"", 1))), 0)
                FROM sales.""Sales"" s
                JOIN sales.""SaleItems"" si ON s.""Id"" = si.""SaleId""
                JOIN product.""products"" p ON si.""ProductId"" = p.""Id""
                LEFT JOIN product.""product_purchase_uoms"" pu ON p.""Id"" = pu.""ProductId"" AND pu.""IsDefault"" = true
                WHERE s.""TenantId"" = @TenantId
                  AND s.""StoreId"" = @StoreId
                  AND s.""Status"" = 2
                  AND s.""SaleDate"" >= @Today AND s.""SaleDate"" < @Tomorrow";
            
            todayCost = (decimal)(await command.ExecuteScalarAsync() ?? 0m);

            // Calculations
            var revenueGrowth = yesterdayRevenue > 0 ? ((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100 : 0;
            var weekGrowth = lastWeekRevenue > 0 ? ((weekRevenue - lastWeekRevenue) / lastWeekRevenue) * 100 : 0;
            var monthGrowth = lastMonthRevenue > 0 ? ((monthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100 : 0;
            
            var lastMonthAvgTicket = lastMonthSalesCount > 0 ? lastMonthRevenue / lastMonthSalesCount : 0;
            var currentMonthAvgTicket = monthSalesCount > 0 ? monthRevenue / monthSalesCount : 0;

            // Get Customers stats
            int totalCustomers = 0;
            int newCustomersThisMonth = 0;
            command.CommandText = @"
                SELECT 
                    (SELECT COUNT(*) FROM customer.""Customers"" WHERE ""TenantId"" = @TenantId),
                    (SELECT COUNT(*) FROM customer.""Customers"" WHERE ""TenantId"" = @TenantId AND ""CreatedAt"" >= @MonthStart)";
            
            using (var reader = await command.ExecuteReaderAsync())
            {
                if (await reader.ReadAsync())
                {
                    totalCustomers = System.Convert.ToInt32(reader.GetValue(0));
                    newCustomersThisMonth = System.Convert.ToInt32(reader.GetValue(1));
                }
            }

            // Chart Data (Last 30 Days)
            var chartSummaries = new List<DailySalesSummaryDto>();
            command.CommandText = @"
                SELECT 
                    DATE(""SaleDate"" - INTERVAL '5 hours') as SaleDay,
                    COUNT(*),
                    SUM(""Total""),
                    SUM(COALESCE(i_sum.""DayCost"", 0))
                FROM sales.""Sales"" s
                LEFT JOIN (
                    SELECT 
                        si.""SaleId"", 
                        SUM(si.""Quantity"" * COALESCE(si.""ConversionToBase"", 1) * (p.""PurchasePrice"" / COALESCE(pu.""ConversionToBase"", 1))) as ""DayCost""
                    FROM sales.""SaleItems"" si
                    JOIN product.""products"" p ON si.""ProductId"" = p.""Id""
                    LEFT JOIN product.""product_purchase_uoms"" pu ON p.""Id"" = pu.""ProductId"" AND pu.""IsDefault"" = true
                    GROUP BY si.""SaleId""
                ) i_sum ON s.""Id"" = i_sum.""SaleId""
                WHERE s.""TenantId"" = @TenantId
                  AND s.""StoreId"" = @StoreId
                  AND s.""Status"" = 2
                  AND s.""SaleDate"" >= @Start30Days
                GROUP BY DATE(""SaleDate"" - INTERVAL '5 hours')
                ORDER BY SaleDay";
            
            command.Parameters.Clear();
            AddParam(command, "@TenantId", tenantId);
            AddParam(command, "@StoreId", storeId);
            AddParam(command, "@Start30Days", startOf30Days);
            AddParam(command, "@MonthStart", monthStart);
            AddParam(command, "@Today", today);
            AddParam(command, "@Tomorrow", tomorrow);

            using (var reader = await command.ExecuteReaderAsync())
            {
                while (await reader.ReadAsync())
                {
                    var date = reader.GetDateTime(0);
                    var count = System.Convert.ToInt32(reader.GetValue(1));
                    var total = reader.GetDecimal(2);
                    var cost = reader.GetDecimal(3);
                    
                    chartSummaries.Add(new DailySalesSummaryDto(
                        Guid.Empty, tenantId, storeId, date, count, total, cost, total - cost, count > 0 ? total/count : 0, 0, 0
                    ));
                }
            }
            
            // Get Month Cost and Profit for dashboard
            command.CommandText = @"
                SELECT 
                    COALESCE(SUM(""TotalCost""), 0),
                    COALESCE(SUM(""TotalProfit""), 0)
                FROM analytics.""DailySalesSummaries""
                WHERE ""TenantId"" = @TenantId AND ""StoreId"" = @StoreId AND ""Date"" >= @MonthStart";
            
            decimal monthCost = 0, monthProfit = 0;
            using (var reader = await command.ExecuteReaderAsync())
            {
                if (await reader.ReadAsync())
                {
                    monthCost = reader.GetDecimal(0);
                    monthProfit = reader.GetDecimal(1);
                }
            }

            // Ensure last 30 days are filled (even if 0) - optional but good for chart
            // For now return what we have.

            
            // Top Products
            var topProducts = new List<TopProductsDto>();
            command.CommandText = @"
                SELECT 
                    i.""ProductId"", 
                    i.""ProductCode"", 
                    i.""ProductName"", 
                    SUM(i.""Quantity""), 
                    SUM(i.""Subtotal"")
                FROM sales.""Sales"" s
                JOIN sales.""SaleItems"" i ON s.""Id"" = i.""SaleId""
                WHERE s.""TenantId"" = @TenantId
                  AND s.""StoreId"" = @StoreId
                  AND s.""Status"" = 2
                  AND s.""SaleDate"" >= @Start30Days
                GROUP BY i.""ProductId"", i.""ProductCode"", i.""ProductName""
                ORDER BY SUM(i.""Subtotal"") DESC
                LIMIT 5";
                
            // Reuse params
            using (var reader = await command.ExecuteReaderAsync())
            {
                int rank = 1;
                while (await reader.ReadAsync())
                {
                    topProducts.Add(new TopProductsDto(
                        rank++,
                        reader.GetGuid(0),
                        reader.GetString(1),
                        reader.GetString(2),
                        System.Convert.ToInt32(reader.GetValue(3)),
                        reader.GetDecimal(4),
                        0m
                    ));
                }
            }

            // Sales by Payment Method
            var salesByPaymentMethod = new List<SalesByPaymentMethodDto>();
            command.CommandText = @"
                SELECT 
                    p.""Method"",
                    COUNT(DISTINCT s.""Id""),
                    SUM(p.""Amount"")
                FROM sales.""Sales"" s
                JOIN sales.""Payments"" p ON s.""Id"" = p.""SaleId""
                WHERE s.""TenantId"" = @TenantId
                  AND s.""StoreId"" = @StoreId
                  AND s.""Status"" = 2
                  AND s.""SaleDate"" >= @MonthStart
                GROUP BY p.""Method""";
            
            command.Parameters.Clear();
            AddParam(command, "@TenantId", tenantId);
            AddParam(command, "@StoreId", storeId);
            AddParam(command, "@MonthStart", monthStart);

            using (var reader = await command.ExecuteReaderAsync())
            {
                while (await reader.ReadAsync())
                {
                    var methodInt = System.Convert.ToInt32(reader.GetValue(0));
                    var count = System.Convert.ToInt32(reader.GetValue(1));
                    var amount = reader.GetDecimal(2);
                    
                    string methodName = methodInt switch
                    {
                        0 => "Cash",
                        1 => "Card", 
                        2 => "Transfer",
                        3 => "Yape",
                        4 => "Plin",
                        5 => "Credit",
                        _ => "Other"
                    };

                    salesByPaymentMethod.Add(new SalesByPaymentMethodDto(methodName, amount, count));
                }
            }

            var lowStockAlerts = await GetLowStockAlertsAsync(tenantId, storeId);

            return new DashboardDto(
                todayRevenue,
                yesterdayRevenue,
                revenueGrowth,
                todaySales,
                yesterdaySales,
                todayCost,
                todayRevenue - todayCost,
                totalCustomers,
                newCustomersThisMonth,
                currentMonthAvgTicket,
                lastMonthAvgTicket,
                weekRevenue,
                lastWeekRevenue,
                weekGrowth,
                monthRevenue,
                lastMonthRevenue,
                monthGrowth,
                monthCost,
                monthProfit,
                topProducts,
                chartSummaries,
                salesByPaymentMethod,
                lowStockAlerts.ToList()
            );
        }
        finally
        {
            if (!wasOpen)
                await connection.CloseAsync();
        }
    }

    private void AddParam(System.Data.Common.DbCommand command, string name, object value)
    {
        var p = command.CreateParameter();
        p.ParameterName = name;
        p.Value = value;
        command.Parameters.Add(p);
    }

    public async Task<SalesReportDto> GetSalesReportAsync(string tenantId, Guid storeId, DateTime fromDate, DateTime toDate)
    {
        // Extend toDate by one day to ensure we include the full end day (inclusive)
        // This handles cases where boundaries might be fuzzy due to timezone or exact midnight timestamps
        var effectiveToDate = toDate.Date.AddDays(1);
        
        var summaries = await _context.DailySalesSummaries
            .Where(s => s.TenantId == tenantId && s.StoreId == storeId && s.Date >= fromDate.Date && s.Date < effectiveToDate)
            .OrderBy(s => s.Date)
            .ToListAsync();

        var totalSales = summaries.Sum(s => s.TotalSales);
        var totalRevenue = summaries.Sum(s => s.TotalRevenue);
        var totalCost = summaries.Sum(s => s.TotalCost);
        var totalProfit = summaries.Sum(s => s.TotalProfit);
        var totalItems = summaries.Sum(s => s.TotalItems);
        var totalCustomers = summaries.Sum(s => s.TotalCustomers);

        var profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) : 0;
        var averageTicket = totalSales > 0 ? totalRevenue / totalSales : 0;

        return new SalesReportDto(
            fromDate,
            toDate,
            totalSales,
            totalRevenue,
            totalCost,
            totalProfit,
            profitMargin,
            averageTicket,
            totalItems,
            totalCustomers,
            summaries.Select(s => new DailySalesSummaryDto(
                s.Id,
                s.TenantId,
                s.StoreId,
                s.Date,
                s.TotalSales,
                s.TotalRevenue,
                s.TotalCost,
                s.TotalProfit,
                s.AverageTicket,
                s.TotalItems,
                s.TotalCustomers
            )).ToList()
        );
    }

    public async Task<IEnumerable<TopProductsDto>> GetTopProductsAsync(string tenantId, int count = 10)
    {
        var topProducts = await _context.ProductPerformances
            .Where(p => p.TenantId == tenantId)
            .OrderByDescending(p => p.TotalRevenue)
            .Take(count)
            .ToListAsync();

        return topProducts.Select((p, index) => new TopProductsDto(
            index + 1,
            p.ProductId,
            p.ProductCode,
            p.ProductName,
            p.TotalSold,
            p.TotalRevenue,
            p.TotalProfit
        ));
    }

    public async Task<IEnumerable<ProductPerformanceDto>> GetProductPerformanceAsync(string tenantId)
    {
        return await _context.ProductPerformances
            .Where(p => p.TenantId == tenantId)
            .OrderByDescending(p => p.TotalRevenue)
            .Select(p => new ProductPerformanceDto(
                p.Id,
                p.ProductId,
                p.ProductCode,
                p.ProductName,
                p.TotalSold,
                p.TotalRevenue,
                p.TotalCost,
                p.TotalProfit,
                p.TotalRevenue > 0 ? (p.TotalProfit / p.TotalRevenue) : 0,
                p.LastSaleDate,
                p.DaysSinceLastSale
            ))
            .ToListAsync();
    }

    public async Task<IEnumerable<DailySalesSummaryDto>> GetDailySalesAsync(string tenantId, Guid storeId, DateTime fromDate, DateTime toDate)
    {
        return await _context.DailySalesSummaries
            .Where(s => s.TenantId == tenantId && s.StoreId == storeId && s.Date >= fromDate.Date && s.Date <= toDate.Date)
            .OrderBy(s => s.Date)
            .Select(s => new DailySalesSummaryDto(
                s.Id,
                s.TenantId,
                s.StoreId,
                s.Date,
                s.TotalSales,
                s.TotalRevenue,
                s.TotalCost,
                s.TotalProfit,
                s.AverageTicket,
                s.TotalItems,
                s.TotalCustomers
            ))
            .ToListAsync();
    }

    public async Task<PeriodComparisonDto> ComparePeriodAsync(string tenantId, Guid storeId, DateTime periodStart, DateTime periodEnd)
    {
        var periodDays = (periodEnd - periodStart).Days + 1;
        var previousPeriodEnd = periodStart.AddDays(-1);
        var previousPeriodStart = previousPeriodEnd.AddDays(-(periodDays - 1));

        var currentPeriodSummaries = await _context.DailySalesSummaries
            .Where(s => s.TenantId == tenantId && s.StoreId == storeId && s.Date >= periodStart && s.Date <= periodEnd)
            .ToListAsync();

        var previousPeriodSummaries = await _context.DailySalesSummaries
            .Where(s => s.TenantId == tenantId && s.StoreId == storeId && s.Date >= previousPeriodStart && s.Date <= previousPeriodEnd)
            .ToListAsync();

        var currentRevenue = currentPeriodSummaries.Sum(s => s.TotalRevenue);
        var previousRevenue = previousPeriodSummaries.Sum(s => s.TotalRevenue);
        var revenueChange = currentRevenue - previousRevenue;
        var percentChange = previousRevenue > 0 ? (revenueChange / previousRevenue) * 100 : 0;

        var currentSales = currentPeriodSummaries.Sum(s => s.TotalSales);
        var previousSales = previousPeriodSummaries.Sum(s => s.TotalSales);

        return new PeriodComparisonDto(
            $"{periodStart:yyyy-MM-dd} to {periodEnd:yyyy-MM-dd}",
            periodStart,
            periodEnd,
            previousPeriodStart,
            previousPeriodEnd,
            currentRevenue,
            previousRevenue,
            revenueChange,
            percentChange,
            currentSales,
            previousSales,
            currentSales - previousSales
        );
    }

    public async Task<InventoryInsightReportDto> GetInventoryInsightsAsync(string tenantId, Guid storeId, bool generateAi = false)
    {
        // Optimization: Only regenerate metrics if they are missing or if we are forcing an AI refresh
        var hasRecentData = await _context.ProductPerformances.AnyAsync(p => p.TenantId == tenantId && p.UpdatedAt >= DateTime.UtcNow.AddHours(-1));
        
        if (!hasRecentData || generateAi)
        {
            await GenerateDailySummariesAsync(tenantId, storeId, skipAi: true);
        }

        var connection = _context.Database.GetDbConnection();
        var wasOpen = connection.State == System.Data.ConnectionState.Open;
        if (!wasOpen) await connection.OpenAsync();

        try 
        {
            var performance = await GetProductPerformanceAsync(tenantId);
            
            var atRisk = new List<RiskAssessmentDto>();
            var suggestedPurchases = new List<SuggestedPurchaseDto>();

            using var command = connection.CreateCommand();
            command.CommandText = @"
                SELECT 
                    si.""ProductId"",
                    si.""CurrentStock"",
                    p.""PurchasePrice"",
                    si.""MinimumStock"",
                    NULL as ""BaseUOMName""
                FROM inventory.""StoreInventories"" si
                JOIN product.""products"" p ON si.""ProductId"" = p.""Id""
                WHERE si.""TenantId"" = @TenantId
                  AND si.""StoreId"" = @StoreId";
            
            AddParam(command, "@TenantId", tenantId);
            AddParam(command, "@StoreId", storeId);

            var stockLevels = new Dictionary<Guid, (int stock, decimal price, int min, string uom)>();
            using (var reader = await command.ExecuteReaderAsync())
            {
                while (await reader.ReadAsync())
                {
                    stockLevels[reader.GetGuid(0)] = (
                        reader.GetInt32(1), 
                        reader.GetDecimal(2), 
                        reader.GetInt32(3),
                        reader.IsDBNull(4) ? "UND" : reader.GetString(4)
                    );
                }
            }

            foreach (var p in performance)
            {
                if (!stockLevels.TryGetValue(p.ProductId, out var stockInfo)) continue;

                var dailyRate = p.TotalSold / 30m; 
                if (dailyRate == 0 && stockInfo.stock > 0) continue; 

                int daysRemaining = dailyRate > 0 ? (int)(stockInfo.stock / dailyRate) : 999;
                
                string riskLevel = "Low";
                
                if (daysRemaining <= 3) riskLevel = "Critical";
                else if (daysRemaining <= 7) riskLevel = "High";
                else if (daysRemaining <= 14) riskLevel = "Medium";

                // Priority overrides based on Minimum Stock
                if (stockInfo.stock <= 0) 
                {
                    riskLevel = "Critical";
                    daysRemaining = 0;
                }
                else if (stockInfo.stock <= stockInfo.min)
                {
                    if (riskLevel == "Medium" || riskLevel == "Low") riskLevel = "High";
                }

                if (riskLevel != "Low")
                {
                    atRisk.Add(new RiskAssessmentDto(
                        p.ProductId,
                        p.ProductCode,
                        p.ProductName,
                        stockInfo.stock,
                        Math.Round(dailyRate, 2),
                        daysRemaining,
                        riskLevel,
                        stockInfo.uom
                    ));

                    if (riskLevel == "Critical" || riskLevel == "High")
                    {
                        var targetDays = 21;
                        var quantityToOrder = (int)(dailyRate * targetDays) - stockInfo.stock;
                        if (stockInfo.stock <= 0 && quantityToOrder <= 0) quantityToOrder = stockInfo.min > 0 ? stockInfo.min : 10;
                        
                        if (quantityToOrder > 0)
                        {
                            suggestedPurchases.Add(new SuggestedPurchaseDto(
                                p.ProductId,
                                p.ProductCode,
                                p.ProductName,
                                quantityToOrder,
                                quantityToOrder * stockInfo.price,
                                $"Consumo diario de {Math.Round(dailyRate, 2)} unidades. Se sugiere comprar para cubrir {targetDays} días."
                            ));
                        }
                    }
                }
            }

            var deadStock = performance.Where(p => p.DaysSinceLastSale > 30 && p.TotalSold > 0).ToList();

            string aiSummary = "";
            bool shouldGenerate = generateAi;

            // Try to fetch latest stored summary if we don't need to generate a new one
            if (!shouldGenerate)
            {
                var latestStored = await _context.SmartSummaries
                    .Where(s => s.TenantId == tenantId && s.StoreId == storeId && s.Type == "InventoryInsight")
                    .OrderByDescending(s => s.CreatedAt)
                    .FirstOrDefaultAsync();

                if (latestStored != null)
                {
                    aiSummary = latestStored.Content;
                }
                else 
                {
                    // If none exists, we MUST generate it the first time even if generateAi is false
                    shouldGenerate = true;
                }
            }

            if (shouldGenerate)
            {
                var prompt = $@"
                    ### [INST] Eres un consultor experto en gestión de inventarios para MYPES en Perú. 
                    Analiza los siguientes datos de inventario y proporciona un resumen estratégico en español (máximo 3 párrafos).
                    Enfócate en el impacto financiero, la urgencia de reponer los productos críticos y qué hacer con el stock estancado.

                    DATOS DE RIESGO:
                    - Productos Críticos (menos de 3 días de stock): {atRisk.Count(r => r.RiskLevel == "Critical")}
                    - Productos con Riesgo Alto (menos de 7 días): {atRisk.Count(r => r.RiskLevel == "High")}
                    - Productos con Riesgo Medio (menos de 14 días): {atRisk.Count(r => r.RiskLevel == "Medium")}
                    - Capital atrapado en productos sin rotación (30+ días): {deadStock.Count} productos.

                    PÉRDIDA POTENCIAL:
                    - Inversión sugerida para evitar quiebres: S/ {suggestedPurchases.Sum(s => s.EstimatedCost):N2}
                    [/INST]
                ";

                try 
                {
                    // Use extended timeout for slow AI on VPS
                    using var cts = new CancellationTokenSource(TimeSpan.FromMinutes(5));
                    var result = await _kernel.InvokePromptAsync(prompt, cancellationToken: cts.Token);
                    aiSummary = result.ToString();

                    // Save the new summary for future use
                    var newSummary = new Profitzen.Analytics.Domain.Entities.SmartSummary
                    {
                        Id = Guid.NewGuid(),
                        TenantId = tenantId,
                        StoreId = storeId,
                        Date = DateTime.SpecifyKind(DateTime.Today, DateTimeKind.Utc),
                        Section = "Analizador de Inventario",
                        Content = aiSummary,
                        Type = "InventoryInsight",
                        CreatedAt = DateTime.UtcNow
                    };

                    _context.SmartSummaries.Add(newSummary);
                    await _context.SaveChangesAsync();
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error invoking AI prompt for inventory insights");
                    aiSummary = $"Análisis completado. Tienes {atRisk.Count(r => r.RiskLevel == "Critical")} productos en estado crítico. Se recomienda revisar las órdenes de compra urgentes.";
                }
            }
            else if (string.IsNullOrEmpty(aiSummary))
            {
                aiSummary = "Presiona 'Recalcular Inteligencia' para obtener un análisis estratégico detallado.";
            }

            return new InventoryInsightReportDto(
                atRisk.OrderBy(a => a.EstimatedDaysRemaining).ToList(),
                deadStock,
                suggestedPurchases.OrderByDescending(s => s.EstimatedCost).ToList(),
                aiSummary
            );
        }
        finally
        {
            if (!wasOpen) await connection.CloseAsync();
        }
    }

    public async Task<IEnumerable<LowStockAlertDto>> GetLowStockAlertsAsync(string tenantId, Guid storeId)
    {
        var alerts = new List<LowStockAlertDto>();
        
        var connection = _context.Database.GetDbConnection();
        var wasOpen = connection.State == System.Data.ConnectionState.Open;
        if (!wasOpen)
            await connection.OpenAsync();

        try 
        {
            using var command = connection.CreateCommand();
            command.CommandText = @"
                SELECT 
                    si.""ProductId"",
                    p.""Code"",
                    p.""Name"",
                    si.""StoreId"",
                    si.""CurrentStock"",
                    si.""MinimumStock""
                FROM inventory.""StoreInventories"" si
                JOIN product.""products"" p ON si.""ProductId"" = p.""Id""
                WHERE si.""TenantId"" = @TenantId
                  AND si.""StoreId"" = @StoreId
                  AND si.""CurrentStock"" <= si.""MinimumStock""";

            var tenantParam = command.CreateParameter();
            tenantParam.ParameterName = "@TenantId";
            tenantParam.Value = tenantId;
            command.Parameters.Add(tenantParam);

            var storeParam = command.CreateParameter();
            storeParam.ParameterName = "@StoreId";
            storeParam.Value = storeId;
            command.Parameters.Add(storeParam);

            using var reader = await command.ExecuteReaderAsync();
            while (await reader.ReadAsync())
            {
                var productId = reader.GetGuid(0);
                var code = reader.GetString(1);
                var name = reader.GetString(2);
                var sId = reader.GetGuid(3);
                var current = reader.GetInt32(4);
                var min = reader.GetInt32(5);
                
                var diff = min - current;
                string severity;
                
                // Logic matches frontend expectations: critical (red) <= 0, high (orange) <= 50% min, else medium (yellow)
                if (current <= 0) severity = "critical";
                else if (current <= min / 2.0) severity = "high";
                else severity = "medium";

                alerts.Add(new LowStockAlertDto(productId, code, name, sId, current, min, diff, severity));
            }
        }
        catch (Exception ex)
        {
            // Log error but don't crash dashboard
            _logger.LogError(ex, "Error fetching low stock alerts for store {StoreId}", storeId);
        }
        finally
        {
            if (!wasOpen)
                await connection.CloseAsync();
        }

        return alerts;
    }
    public async Task GenerateDailySummariesAsync(string tenantId, Guid storeId, bool skipAi = false)
    {
        Console.WriteLine($"[Analytics] Starting generation for Tenant: {tenantId}, Store: {storeId}");
        
        var connection = _context.Database.GetDbConnection();
        var wasOpen = connection.State == System.Data.ConnectionState.Open;
        if (!wasOpen) await connection.OpenAsync();

        try
        {
            // Debug counts
            using (var debugCmd = connection.CreateCommand())
            {
                debugCmd.CommandText = @"SELECT COUNT(*) FROM sales.""Sales"" WHERE ""TenantId"" = @T AND ""StoreId"" = @S";
                AddParam(debugCmd, "@T", tenantId);
                AddParam(debugCmd, "@S", storeId);
                var totalSales = await debugCmd.ExecuteScalarAsync();
                Console.WriteLine($"[Analytics] Total Sales found: {totalSales}");

                debugCmd.CommandText = @"SELECT COUNT(*) FROM sales.""Sales"" WHERE ""TenantId"" = @T AND ""StoreId"" = @S AND ""Status"" = 1";
                var pendingSales = await debugCmd.ExecuteScalarAsync();
                Console.WriteLine($"[Analytics] Pending Sales (Status=1): {pendingSales}");

                debugCmd.CommandText = @"SELECT COUNT(*) FROM sales.""Sales"" WHERE ""TenantId"" = @T AND ""StoreId"" = @S AND ""Status"" = 2";
                var completedSales = await debugCmd.ExecuteScalarAsync();
                Console.WriteLine($"[Analytics] Completed Sales (Status=2) before fix: {completedSales}");
            }

            // 1. Clear existing
            await _context.Database.ExecuteSqlRawAsync(
                @"DELETE FROM analytics.""DailySalesSummaries"" WHERE ""TenantId"" = {0} AND ""StoreId"" = {1}", 
                tenantId, storeId);
            
            await _context.Database.ExecuteSqlRawAsync(
                @"DELETE FROM analytics.""ProductPerformances"" WHERE ""TenantId"" = {0}", 
                tenantId);

            // 2. Generate Summaries
            var command = connection.CreateCommand();
            command.CommandText = @"
                INSERT INTO analytics.""DailySalesSummaries"" 
                (""Id"", ""TenantId"", ""StoreId"", ""Date"", ""TotalSales"", ""TotalRevenue"", ""TotalCost"", ""TotalProfit"", ""AverageTicket"", ""TotalItems"", ""TotalCustomers"", ""CreatedAt"", ""UpdatedAt"")
                SELECT
                    gen_random_uuid(),
                    @TenantId,
                    @StoreId,
                    DATE(s.""SaleDate""),
                    COUNT(*),
                    SUM(s.""Total""),
                    COALESCE(SUM(i_sum.""TotalCost""), 0), 
                    SUM(s.""Total"") - COALESCE(SUM(i_sum.""TotalCost""), 0),
                    AVG(s.""Total""),
                    COALESCE(SUM(i_sum.""TotalItems""), 0),
                    COUNT(DISTINCT s.""Id""),
                    NOW(),
                    NOW()
                FROM sales.""Sales"" s
                LEFT JOIN (
                    SELECT 
                        si.""SaleId"", 
                        SUM(si.""Quantity"") as ""TotalItems"",
                        SUM(si.""Quantity"" * COALESCE(si.""ConversionToBase"", 1) * (p.""PurchasePrice"" / COALESCE(pu.""ConversionToBase"", 1))) as ""TotalCost"" 
                    FROM sales.""SaleItems"" si
                    JOIN product.""products"" p ON si.""ProductId"" = p.""Id""
                    LEFT JOIN product.""product_purchase_uoms"" pu ON p.""Id"" = pu.""ProductId"" AND pu.""IsDefault"" = true
                    GROUP BY si.""SaleId""
                ) i_sum ON s.""Id"" = i_sum.""SaleId""
                WHERE s.""TenantId"" = @TenantId
                  AND s.""StoreId"" = @StoreId
                  AND s.""Status"" = 2
                GROUP BY DATE(s.""SaleDate"")";

            AddParam(command, "@TenantId", tenantId);
            AddParam(command, "@StoreId", storeId);
            
            var insertedSummaries = await command.ExecuteNonQueryAsync();
            _logger.LogInformation("Generated {Count} daily summary rows for store {StoreId}", insertedSummaries, storeId);

            // 3. Generate Product Performance
            command.CommandText = @"
                INSERT INTO analytics.""ProductPerformances""
                (""Id"", ""ProductId"", ""ProductCode"", ""ProductName"", ""TenantId"", ""TotalSold"", ""TotalRevenue"", ""TotalCost"", ""TotalProfit"", ""LastSaleDate"", ""DaysSinceLastSale"", ""CreatedAt"", ""UpdatedAt"")
                SELECT
                    gen_random_uuid(),
                    si.""ProductId"",
                    si.""ProductCode"",
                    si.""ProductName"",
                    @TenantId,
                    COALESCE(SUM(si.""Quantity""), 0),
                    COALESCE(SUM(si.""Subtotal""), 0),
                    COALESCE(SUM(si.""Quantity"" * COALESCE(si.""ConversionToBase"", 1) * (COALESCE(p.""PurchasePrice"", 0) / NULLIF(COALESCE(pu.""ConversionToBase"", 1), 0))), 0),
                    COALESCE(SUM(si.""Subtotal"") - SUM(si.""Quantity"" * COALESCE(si.""ConversionToBase"", 1) * (COALESCE(p.""PurchasePrice"", 0) / NULLIF(COALESCE(pu.""ConversionToBase"", 1), 0))), 0),
                    MAX(s.""SaleDate""),
                    CAST(COALESCE(EXTRACT(DAY FROM NOW() - MAX(s.""SaleDate"")), 0) AS INTEGER),
                    NOW(),
                    NOW()
                FROM sales.""SaleItems"" si
                JOIN sales.""Sales"" s ON si.""SaleId"" = s.""Id""
                LEFT JOIN product.""products"" p ON si.""ProductId"" = p.""Id""
                LEFT JOIN product.""product_purchase_uoms"" pu ON p.""Id"" = pu.""ProductId"" AND pu.""IsDefault"" = true
                WHERE s.""TenantId"" = @TenantId
                  AND s.""Status"" = 2
                GROUP BY si.""ProductId"", si.""ProductCode"", si.""ProductName""
            ";
            
            var performanceRows = await command.ExecuteNonQueryAsync();
            _logger.LogInformation("Generated {Count} product performance rows for Tenant {TenantId}", performanceRows, tenantId);

            // 4. Generate AI "Vigilante Nocturno" Insight - ONLY IF REQUESTED
            if (!skipAi)
            {
                await GenerateVigilanteInsightAsync(tenantId, storeId);
            }
        }
        finally
        {
            if (!wasOpen) await connection.CloseAsync();
        }
    }

    public async Task<IEnumerable<SmartSummaryDto>> GetLatestSummariesAsync(string tenantId, Guid storeId, int count = 5, string? type = null)
    {
        try
        {
            var query = _context.SmartSummaries
                .Where(s => s.TenantId == tenantId && s.StoreId == storeId);

            if (!string.IsNullOrEmpty(type))
            {
                query = query.Where(s => s.Type == type);
            }

            var summaries = await query
                .OrderByDescending(s => s.CreatedAt)
                .Take(count)
                .ToListAsync();

            return summaries.Select(s => new SmartSummaryDto(
                s.Id,
                s.Section,
                s.Content,
                s.Type,
                s.CreatedAt,
                s.IsRead
            ));
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Could not fetch latest summaries. Might be due to missing table.");
            return Enumerable.Empty<SmartSummaryDto>();
        }
    }

    private async Task GenerateVigilanteInsightAsync(string tenantId, Guid storeId)
    {
        try
        {
            // Gather context data for the AI
            var yesterday = DateTime.Today.AddDays(-1);
            var summary = await _context.DailySalesSummaries
                .OrderByDescending(s => s.Date)
                .FirstOrDefaultAsync(s => s.TenantId == tenantId && s.StoreId == storeId);

            var lowStock = await GetLowStockAlertsAsync(tenantId, storeId);
            var topProducts = await GetTopProductsAsync(tenantId, 3);

            var context = $@"
                DATOS RECIENTES:
                - Ventas Totales: {summary?.TotalRevenue ?? 0}
                - Número de Ventas: {summary?.TotalSales ?? 0}
                - Ganancia Neta: {summary?.TotalProfit ?? 0}
                
                TOP PRODUCTOS (Nombre exacto y Código): 
                {string.Join("\n", topProducts.Select(p => $"- {p.ProductName} (Ref: {p.ProductCode})"))}
                
                ALERTAS DE STOCK BAJO: {lowStock.Count()} productos con poco inventario.
            ";

            var prompt = $@"
                ### [INST] Eres el 'Vigilante Nocturno' de Profitzen, un experto en administración de negocios retail.
                Tu tarea es resumir lo que pasó recientemente en la tienda y dar 1 consejo estratégico CLAVE en español.
                
                REGLAS CRÍTICAS DE FIDELIDAD:
                1. Usa los NOMBRES EXACTOS Y LITERALES de los productos tal como aparecen en los DATOS. 
                2. NO abrevies, NO limpies y NO cambies 'producto de pruebita' por 'producto de prueba'. Debe ser IDÉNTICO.
                3. Menciona el código de referencia si ayuda a la claridad.
                
                OTRAS REGLAS:
                1. Sé breve (máximo 3 párrafos cortos).
                2. Usa un tono experto, directo pero amable.
                3. Da UN consejo accionable para hoy basado en los datos.
                
                DATOS:
                {context}
                [/INST]
            ";

            // Use extended timeout for slow AI on VPS
            using var cts = new CancellationTokenSource(TimeSpan.FromMinutes(5));
            var result = await _kernel.InvokePromptAsync(prompt, cancellationToken: cts.Token);
            var content = result.ToString();

            var newSummary = new SmartSummary
            {
                Id = Guid.NewGuid(),
                TenantId = tenantId,
                StoreId = storeId,
                Date = DateTime.SpecifyKind(DateTime.Today, DateTimeKind.Utc),
                Section = "Vigilante Nocturno",
                Content = content,
                Type = "DailyInsight",
                CreatedAt = DateTime.UtcNow
            };

            _context.SmartSummaries.Add(newSummary);
            await _context.SaveChangesAsync();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating Vigilante insight for tenant {TenantId}", tenantId);
        }
    }
}
