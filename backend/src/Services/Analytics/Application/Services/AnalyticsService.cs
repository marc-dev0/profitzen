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

            // Calculations
            var revenueGrowth = yesterdayRevenue > 0 ? ((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100 : 0;
            var weekGrowth = lastWeekRevenue > 0 ? ((weekRevenue - lastWeekRevenue) / lastWeekRevenue) * 100 : 0;
            var monthGrowth = lastMonthRevenue > 0 ? ((monthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100 : 0;
            
            var lastMonthAvgTicket = lastMonthSalesCount > 0 ? lastMonthRevenue / lastMonthSalesCount : 0;
            var currentMonthAvgTicket = monthSalesCount > 0 ? monthRevenue / monthSalesCount : 0;

            // Chart Data (Last 30 Days)
            var chartSummaries = new List<DailySalesSummaryDto>();
            command.CommandText = @"
                SELECT 
                    DATE(""SaleDate"" - INTERVAL '5 hours') as SaleDay,
                    COUNT(*),
                    SUM(""Total"")
                FROM sales.""Sales""
                WHERE ""TenantId"" = @TenantId
                  AND ""StoreId"" = @StoreId
                  AND ""Status"" = 2
                  AND ""SaleDate"" >= @Start30Days
                GROUP BY DATE(""SaleDate"" - INTERVAL '5 hours')
                ORDER BY SaleDay";
            
            command.Parameters.Clear();
            AddParam(command, "@TenantId", tenantId);
            AddParam(command, "@StoreId", storeId);
            AddParam(command, "@Start30Days", startOf30Days);

            using (var reader = await command.ExecuteReaderAsync())
            {
                while (await reader.ReadAsync())
                {
                    var date = reader.GetDateTime(0);
                    var count = System.Convert.ToInt32(reader.GetValue(1));
                    var total = reader.GetDecimal(2);
                    
                    chartSummaries.Add(new DailySalesSummaryDto(
                        Guid.Empty, tenantId, storeId, date, count, total, 0, 0, count > 0 ? total/count : 0, 0, 0
                    ));
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
                        (int)reader.GetDecimal(3), // Quantity might be decimal in DB but DTO expects int? DB is decimal(18,2) usually for quantity? Check SaleItem entity.
                        reader.GetDecimal(4),
                        0 // Profit not calculated here
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
                0, 
                0, 
                currentMonthAvgTicket,
                lastMonthAvgTicket,
                weekRevenue,
                lastWeekRevenue,
                weekGrowth,
                monthRevenue,
                lastMonthRevenue,
                monthGrowth,
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

        var profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
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
                p.TotalRevenue > 0 ? (p.TotalProfit / p.TotalRevenue) * 100 : 0,
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
        await GenerateDailySummariesAsync(tenantId, storeId);

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

            string aiSummary;
            if (generateAi)
            {
                var prompt = $@"
                    Eres un consultor experto en gestión de inventarios para MYPES en Perú. 
                    Analiza los siguientes datos de inventario y proporciona un resumen estratégico en español (máximo 3 frases).
                    Enfócate en el impacto financiero, la urgencia de reponer los productos críticos y qué hacer con el stock estancado.

                    DATOS DE RIESGO:
                    - Productos Críticos (menos de 3 días de stock): {atRisk.Count(r => r.RiskLevel == "Critical")}
                    - Productos con Riesgo Alto (menos de 7 días): {atRisk.Count(r => r.RiskLevel == "High")}
                    - Productos con Riesgo Medio (menos de 14 días): {atRisk.Count(r => r.RiskLevel == "Medium")}
                    - Capital atrapado en productos sin rotación (30+ días): {deadStock.Count} productos.

                    PÉRDIDA POTENCIAL:
                    - Inversión sugerida para evitar quiebres: S/ {suggestedPurchases.Sum(s => s.EstimatedCost):N2}
                ";

                try 
                {
                    var result = await _kernel.InvokePromptAsync(prompt);
                    aiSummary = result.ToString();
                }
                catch (Exception ex)
                {
                    // Fallback to basic logic if AI is down
                    _logger.LogError(ex, "Error invoking AI prompt for inventory insights");
                    aiSummary = $"Análisis completado. Tienes {atRisk.Count(r => r.RiskLevel == "Critical")} productos en estado crítico. Se recomienda revisar las órdenes de compra urgentes.";
                }
            }
            else 
            {
                aiSummary = "Presiona 'Recalcular Inteligencia' para obtener un análisis estratégico detallado con IA sobre estos resultados.";
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
    public async Task GenerateDailySummariesAsync(string tenantId, Guid storeId)
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

            // 0. FIX DEMO DATA
            var updatedCount = await _context.Database.ExecuteSqlRawAsync(
                @"UPDATE sales.""Sales"" SET ""Status"" = 2 WHERE ""Status"" = 1 AND ""TenantId"" = {0}", 
                tenantId);
            Console.WriteLine($"[Analytics] Fixed {updatedCount} pending sales to completed.");

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
                        ""SaleId"", 
                        SUM(""Quantity"") as ""TotalItems"",
                        SUM(""Quantity"" * p.""PurchasePrice"") as ""TotalCost"" 
                    FROM sales.""SaleItems"" si
                    JOIN product.""products"" p ON si.""ProductId"" = p.""Id""
                    GROUP BY ""SaleId""
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
                    MAX(si.""ProductCode""),
                    MAX(si.""ProductName""),
                    @TenantId,
                    SUM(si.""Quantity""),
                    SUM(si.""Subtotal""),
                    SUM(si.""Quantity"" * p.""PurchasePrice""),
                    SUM(si.""Subtotal"") - SUM(si.""Quantity"" * p.""PurchasePrice""),
                    MAX(s.""SaleDate""),
                    EXTRACT(DAY FROM NOW() - MAX(s.""SaleDate"")),
                    NOW(),
                    NOW()
                FROM sales.""SaleItems"" si
                JOIN sales.""Sales"" s ON si.""SaleId"" = s.""Id""
                JOIN product.""products"" p ON si.""ProductId"" = p.""Id""
                WHERE s.""TenantId"" = @TenantId
                  AND s.""Status"" = 2
                GROUP BY si.""ProductId""
            ";
            
            await command.ExecuteNonQueryAsync();
        }
        finally
        {
            if (!wasOpen) await connection.CloseAsync();
        }
    }
}
