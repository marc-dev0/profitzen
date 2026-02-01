using Profitzen.Sales.Domain.Enums;

namespace Profitzen.Sales.Application.DTOs;

public record SaleDto(
    Guid Id,
    string SaleNumber,
    Guid StoreId,
    Guid CashierId,
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
    string? DocumentType = null,
    string? DocumentSeries = null,
    string? DocumentNumber = null
);

public record SaleItemDto(
    Guid Id,
    Guid ProductId,
    string ProductName,
    string ProductCode,
    int Quantity,
    decimal UnitPrice,
    decimal DiscountAmount,
    decimal Subtotal
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
    string? DocumentType = null,
    List<AddSaleItemRequest>? Items = null,
    List<AddPaymentRequest>? Payments = null
);

public record AddSaleItemRequest(
    Guid ProductId,
    string ProductName,
    string ProductCode,
    int Quantity,
    decimal UnitPrice,
    decimal DiscountAmount = 0,
    decimal ConversionToBase = 1,
    Guid? UOMId = null,
    string? UOMCode = null
);

public record UpdateSaleItemRequest(
    int Quantity,
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
    int CurrentStock,
    int MinimumStock,
    string Severity
);

public record TopProductDto(
    int Rank,
    Guid ProductId,
    string ProductCode,
    string ProductName,
    int TotalSold,
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