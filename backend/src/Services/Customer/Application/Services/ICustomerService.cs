using Profitzen.Customer.Application.DTOs;

namespace Profitzen.Customer.Application.Services;

public interface ICustomerService
{
    Task<IEnumerable<CustomerDto>> GetCustomersAsync(string tenantId);
    Task<CustomerDto?> GetCustomerByIdAsync(Guid id);
    Task<CustomerDto?> GetCustomerByDocumentAsync(string documentNumber, string tenantId);
    Task<CustomerDto> CreateCustomerAsync(CreateCustomerRequest request, string tenantId, Guid userId);
    Task<CustomerDto> UpdateCustomerAsync(Guid id, UpdateCustomerRequest request, Guid userId);
    Task<CustomerDto> UpdateCreditLimitAsync(Guid id, UpdateCreditLimitRequest request, Guid userId);
    Task<bool> DeleteCustomerAsync(Guid id, Guid userId);

    Task<IEnumerable<PurchaseDto>> GetCustomerPurchasesAsync(Guid customerId);
    Task<CustomerStatsDto?> GetCustomerStatsAsync(Guid customerId);
    Task<PurchaseDto> RecordPurchaseAsync(Guid customerId, Guid saleId, decimal totalAmount, string tenantId);

    Task<IEnumerable<CreditDto>> GetCustomerCreditsAsync(Guid customerId);
    Task<CreditDto?> GetCreditByIdAsync(Guid id);
    Task<CreditDto> CreateCreditAsync(CreateCreditRequest request, Guid userId);
    Task<CreditDto> AddCreditPaymentAsync(Guid creditId, AddCreditPaymentRequest request, Guid userId);
    Task RefundCreditAsync(Guid customerId, string reference, Guid userId);
    Task<IEnumerable<CreditDto>> GetOverdueCreditsAsync(string tenantId);
    Task<IEnumerable<CreditDto>> GetPendingCreditsAsync(string tenantId);

    Task<IEnumerable<CustomerDto>> GetTopCustomersAsync(string tenantId, int count = 10);
}
