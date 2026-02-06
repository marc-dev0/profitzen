namespace Profitzen.Analytics.Application.DTOs;

public record DailySalesSummaryDto(
    Guid Id,
    string TenantId,
    Guid StoreId,
    DateTime Date,
    int TotalSales,
    decimal TotalRevenue,
    decimal TotalCost,
    decimal TotalExpenses,
    decimal TotalProfit,
    decimal AverageTicket,
    int TotalItems,
    int TotalCustomers
);

public record ProductPerformanceDto(
    Guid Id,
    Guid ProductId,
    string ProductCode,
    string ProductName,
    int TotalSold,
    decimal TotalRevenue,
    decimal TotalCost,
    decimal TotalProfit,
    decimal ProfitMargin,
    DateTime LastSaleDate,
    int DaysSinceLastSale
);

public record SalesReportDto(
    DateTime FromDate,
    DateTime ToDate,
    int TotalSales,
    decimal TotalRevenue,
    decimal TotalCost,
    decimal TotalProfit,
    decimal ProfitMargin,
    decimal AverageTicket,
    int TotalItems,
    int TotalCustomers,
    List<DailySalesSummaryDto> DailySummaries
);

public record TopProductsDto(
    int Rank,
    Guid ProductId,
    string ProductCode,
    string ProductName,
    int TotalSold,
    decimal TotalRevenue,
    decimal TotalProfit
);

public record LowStockAlertDto(
    Guid ProductId,
    string ProductCode,
    string ProductName,
    Guid StoreId,
    int CurrentStock,
    int MinimumStock,
    int StockDifference,
    string Severity
);

public record SalesByPaymentMethodDto(
    string PaymentMethod,
    decimal TotalAmount,
    int TransactionCount
);

public record DashboardDto(
    decimal TodayRevenue,
    decimal YesterdayRevenue,
    decimal RevenueGrowthPercentage,
    int TodaySalesCount,
    int YesterdaySalesCount,
    decimal TodayCost,
    decimal TodayExpenses,
    decimal TodayProfit,
    int TotalCustomers,
    int NewCustomersThisMonth,
    decimal AverageTicket,
    decimal LastMonthAverageTicket,
    decimal WeekRevenue,
    decimal LastWeekRevenue,
    decimal WeekGrowthPercentage,
    decimal MonthRevenue,
    decimal LastMonthRevenue,
    decimal MonthGrowthPercentage,
    decimal MonthCost,
    decimal MonthExpenses,
    decimal MonthProfit,
    List<TopProductsDto> TopProducts,
    List<DailySalesSummaryDto> Last30Days,
    List<SalesByPaymentMethodDto> SalesByPaymentMethod,
    List<LowStockAlertDto> LowStockAlerts
);

public record PeriodComparisonDto(
    string Period,
    DateTime CurrentPeriodStart,
    DateTime CurrentPeriodEnd,
    DateTime PreviousPeriodStart,
    DateTime PreviousPeriodEnd,
    decimal CurrentRevenue,
    decimal PreviousRevenue,
    decimal RevenueChange,
    decimal PercentChange,
    int CurrentSales,
    int PreviousSales,
    int SalesChange
);

public record RiskAssessmentDto(
    Guid ProductId,
    string ProductCode,
    string ProductName,
    int CurrentStock,
    decimal DailyConsumptionRate,
    int EstimatedDaysRemaining,
    string RiskLevel, // "Critical", "High", "Medium", "Low"
    string UomName = "UND"
);

public record SuggestedPurchaseDto(
    Guid ProductId,
    string ProductCode,
    string ProductName,
    int QuantityToOrder,
    decimal UnitPrice,
    decimal EstimatedCost,
    string Reason
);

public record SmartSummaryDto(
    Guid Id,
    string Section,
    string Content,
    string Type,
    DateTime CreatedAt,
    bool IsRead
);

public record InventoryInsightReportDto(
    List<RiskAssessmentDto> AtRiskProducts,
    List<ProductPerformanceDto> DeadStock,
    List<SuggestedPurchaseDto> PurchaseRecommendations,
    string AiSummary,
    bool IsAiProcessing = false
);
