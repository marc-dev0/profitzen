using Profitzen.Sales.Domain.Enums;

namespace Profitzen.Sales.Application.DTOs;

public record ExpenseDto(
    Guid Id,
    Guid StoreId,
    string Description,
    string Category,
    decimal Amount,
    DateTime Date,
    PaymentMethod PaymentMethod,
    bool IsPaid,
    DateTime? DueDate,
    string? Reference,
    string? Notes,
    DateTime CreatedAt,
    bool IsActive = true,
    DateTime? DeletedAt = null
);

public record CreateExpenseRequest(
    Guid StoreId,
    string Description,
    string Category,
    decimal Amount,
    DateTime Date,
    PaymentMethod PaymentMethod,
    bool IsPaid = true,
    DateTime? DueDate = null,
    string? Reference = null,
    string? Notes = null,
    bool IsActive = true
);

public record UpdateExpenseRequest(
    string Description,
    string Category,
    decimal Amount,
    DateTime Date,
    PaymentMethod PaymentMethod,
    bool IsPaid,
    DateTime? DueDate = null,
    string? Reference = null,
    string? Notes = null,
    bool IsActive = true
);
