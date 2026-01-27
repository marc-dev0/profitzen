using Profitzen.Customer.Domain.Enums;

namespace Profitzen.Customer.Application.DTOs;

public record CustomerDto(
    Guid Id,
    DocumentType DocumentType,
    string DocumentNumber,
    string FirstName,
    string LastName,
    string FullName,
    string? Email,
    string? Phone,
    string? Address,
    decimal CreditLimit,
    decimal CurrentDebt,
    decimal AvailableCredit,
    int TotalPurchases,
    decimal TotalSpent,
    bool IsActive,
    DateTime CreatedAt
);

public record CreateCustomerRequest(
    DocumentType DocumentType,
    string DocumentNumber,
    string FirstName,
    string LastName,
    string? Email,
    string? Phone,
    string? Address,
    decimal CreditLimit
);

public record UpdateCustomerRequest(
    DocumentType? DocumentType,
    string? DocumentNumber,
    string FirstName,
    string LastName,
    string? Email,
    string? Phone,
    string? Address
);

public record UpdateCreditLimitRequest(
    decimal CreditLimit
);

public record CreditDto(
    Guid Id,
    Guid CustomerId,
    string CustomerName,
    decimal Amount,
    decimal RemainingAmount,
    DateTime CreditDate,
    DateTime? DueDate,
    bool IsPaid,
    bool IsOverdue,
    DateTime? PaidDate,
    string? Notes,
    List<CreditPaymentDto> Payments,
    DateTime CreatedAt
);

public record CreateCreditRequest(
    Guid CustomerId,
    decimal Amount,
    DateTime? DueDate,
    string? Notes
);

public record CreditPaymentDto(
    Guid Id,
    decimal Amount,
    DateTime PaymentDate,
    string? Notes
);

public record AddCreditPaymentRequest(
    decimal Amount,
    string? Notes
);

public record PurchaseDto(
    Guid Id,
    Guid CustomerId,
    Guid SaleId,
    decimal TotalAmount,
    DateTime PurchaseDate
);

public record CustomerStatsDto(
    Guid CustomerId,
    string CustomerName,
    int TotalPurchases,
    decimal TotalSpent,
    decimal AverageTicket,
    DateTime FirstPurchase,
    DateTime? LastPurchase,
    int DaysSinceLastPurchase
);
