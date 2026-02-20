using Profitzen.Sales.Domain.Enums;

namespace Profitzen.Sales.Application.DTOs;

public record SaleDto(
    Guid Id,
    string SaleNumber,
    Guid StoreId,
    Guid CashierId,
    string? CashierName,
    Guid? CustomerId,
    string? CustomerName,
    DateTime SaleDate,
    decimal Subtotal,
    decimal DiscountAmount,
    decimal TaxAmount,
    decimal Total,
    SaleStatus Status,
    string? Notes,
    decimal PaidAmount,
    decimal RemainingAmount,
    bool IsFullyPaid,
    List<SaleItemDto> Items,
    List<PaymentDto> Payments,
    decimal AmountReceived = 0,
    decimal ChangeAmount = 0,
    decimal RoundingAdjustment = 0,
    string? DocumentType = null,
    string? DocumentSeries = null,
    string? DocumentNumber = null
);

public record SaleItemDto(
    Guid Id,
    Guid ProductId,
    string ProductName,
    string ProductCode,
    decimal Quantity,
    decimal UnitPrice,
    decimal DiscountAmount,
    decimal Subtotal,
    string? UOMCode = null,
    decimal ConversionToBase = 1
);

public record PaymentDto(
    Guid Id,
    PaymentMethod Method,
    decimal Amount,
    string? Reference,
    DateTime PaymentDate
);

public record CreateSaleRequest(
    Guid? CustomerId,
    string? Notes,
    string? CashierName = null,
    string? DocumentType = null,
    List<AddSaleItemRequest>? Items = null,
    List<AddPaymentRequest>? Payments = null
);

public record AddSaleItemRequest(
    Guid ProductId,
    string ProductName,
    string ProductCode,
    decimal Quantity,
    decimal UnitPrice,
    decimal DiscountAmount = 0,
    decimal ConversionToBase = 1,
    Guid? UOMId = null,
    string? UOMCode = null
);

public record UpdateSaleItemRequest(
    decimal Quantity,
    decimal DiscountAmount = 0
);

public record AddPaymentRequest(
    PaymentMethod Method,
    decimal Amount,
    string? Reference
);

public record ApplyDiscountRequest(
    decimal DiscountAmount
);

public record CompleteSaleRequest(
    string? CacheKey = null,
    decimal? AmountReceived = null,
    string? DocumentSeries = null,
    string? DocumentNumber = null,
    decimal RoundingAdjustment = 0
);

public record TicketSettingsDto(
    string StoreName,
    string StoreAddress,
    string StorePhone,
    string StoreRuc,
    string? HeaderText,
    string? FooterText,
    string? LogoUrl,
    bool ShowLogo,
    int TicketWidth, // 58 or 80
    string? CashierName
);

// Dashboard DTOs
public record SalesDashboardDto(
    decimal TodayRevenue,
    decimal YesterdayRevenue,
    decimal RevenueGrowthPercentage,
    int TodaySalesCount,
    int YesterdaySalesCount,
    decimal TodayCost,
    decimal TodayProfit,
    decimal WeekRevenue,
    decimal LastWeekRevenue,
    decimal WeekGrowthPercentage,
    decimal MonthRevenue,
    decimal LastMonthRevenue,
    decimal MonthGrowthPercentage,
    decimal MonthCost,
    decimal MonthProfit,
    decimal AverageTicket,
    decimal LastMonthAverageTicket,
    List<TopProductDto> TopProducts,
    List<DailySalesDto> Last30Days,
    List<SalesByPaymentMethodDto> SalesByPaymentMethod,
    List<LowStockAlertDto> LowStockAlerts
);

public record LowStockAlertDto(
    Guid ProductId,
    string ProductCode,
    string ProductName,
    decimal CurrentStock,
    decimal MinimumStock,
    string Severity
);

public record TopProductDto(
    int Rank,
    Guid ProductId,
    string ProductCode,
    string ProductName,
    decimal TotalSold,
    decimal TotalRevenue,
    string? UnitOfMeasure = null
);

public record DailySalesDto(
    DateTime Date,
    decimal TotalRevenue,
    int TotalSales
);

public record SalesByPaymentMethodDto(
    string PaymentMethod,
    decimal TotalAmount,
    int TransactionCount
);