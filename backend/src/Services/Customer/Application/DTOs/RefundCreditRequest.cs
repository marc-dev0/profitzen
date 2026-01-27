namespace Profitzen.Customer.Application.DTOs;

public record RefundCreditRequest(
    Guid CustomerId,
    string Reference
);
