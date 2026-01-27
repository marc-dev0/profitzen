namespace Profitzen.Sales.Application.DTOs;

public record CustomerDto(
    Guid Id,
    string DocumentNumber,
    string FullName, // Added to map from Customer Service
    string Name,
    string? Email,
    string? Phone,
    string? Address,
    bool IsActive,
    decimal CreditLimit,
    decimal CurrentDebt,
    decimal AvailableCredit,
    DateTime CreatedAt
);

public record CreateCustomerRequest(
    string DocumentNumber,
    string Name,
    string? Email,
    string? Phone,
    string? Address,
    decimal CreditLimit = 0
);

public record UpdateCustomerRequest(
    string Name,
    string? Email,
    string? Phone,
    string? Address,
    decimal CreditLimit
);