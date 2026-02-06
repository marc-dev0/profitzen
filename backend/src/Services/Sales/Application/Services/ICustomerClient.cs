using Profitzen.Sales.Application.DTOs;

namespace Profitzen.Sales.Application.Services;

public interface ICustomerClient
{
    Task<CustomerDto?> GetCustomerByIdAsync(Guid customerId, string? tenantId = null);
    Task<bool> CreateCreditAsync(Guid customerId, Guid storeId, decimal amount, DateTime? dueDate, string notes, string tenantId);
    Task<bool> RefundCreditAsync(Guid customerId, string reference, string tenantId);
}
