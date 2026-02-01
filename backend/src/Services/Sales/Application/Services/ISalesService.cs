using Profitzen.Sales.Application.DTOs;

namespace Profitzen.Sales.Application.Services;

public interface ISalesService
{
    Task<IEnumerable<SaleDto>> GetSalesAsync(string tenantId, Guid? storeId = null, DateTime? fromDate = null, DateTime? toDate = null);
    Task<SaleDto?> GetSaleByIdAsync(Guid id);
    Task<SaleDto?> GetSaleByNumberAsync(string saleNumber);
    Task<SaleDto> CreateSaleAsync(CreateSaleRequest request, Guid storeId, Guid cashierId, string tenantId);
    Task<SaleDto> AddItemToSaleAsync(Guid saleId, AddSaleItemRequest request);
    Task<SaleDto> AddItemsToSaleAsync(Guid saleId, IEnumerable<AddSaleItemRequest> requests);
    Task<SaleDto> RemoveItemFromSaleAsync(Guid saleId, Guid productId);
    Task<SaleDto> UpdateSaleItemAsync(Guid saleId, Guid productId, UpdateSaleItemRequest request);
    Task<SaleDto> ApplyDiscountAsync(Guid saleId, ApplyDiscountRequest request);
    Task<SaleDto> AddPaymentAsync(Guid saleId, AddPaymentRequest request);
    Task<SaleDto> CompleteSaleAsync(Guid saleId);
    // Task<SaleDto> CancelSaleAsync(Guid saleId); // Removed - Cancelled status no longer used
    Task<SaleDto> ReturnSaleAsync(Guid saleId);
    Task<byte[]> GetTicketPdfAsync(Guid saleId, TicketSettingsDto settings);
    Task<bool> DeleteSaleAsync(Guid saleId);

    Task<IEnumerable<CustomerDto>> GetCustomersAsync(Guid storeId);
    Task<CustomerDto?> GetCustomerByIdAsync(Guid id);
    Task<CustomerDto?> GetCustomerByDocumentAsync(string documentNumber, Guid storeId);
    Task<CustomerDto> CreateCustomerAsync(CreateCustomerRequest request, Guid storeId, string tenantId);
    Task<CustomerDto> UpdateCustomerAsync(Guid id, UpdateCustomerRequest request);
    Task<bool> DeleteCustomerAsync(Guid id);

    Task<decimal> GetDailySalesAsync(string tenantId, DateTime date, Guid? storeId = null);
    Task<decimal> GetMonthlySalesAsync(string tenantId, int year, int month, Guid? storeId = null);
    Task<IEnumerable<SaleDto>> GetTopSalesAsync(string tenantId, int count = 10, Guid? storeId = null);

    // Dashboard
    Task<SalesDashboardDto> GetDashboardAsync(string tenantId, Guid? storeId = null);
}