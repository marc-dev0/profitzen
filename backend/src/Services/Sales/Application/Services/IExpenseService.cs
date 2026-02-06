using Profitzen.Sales.Application.DTOs;

namespace Profitzen.Sales.Application.Services;

public interface IExpenseService
{
    Task<IEnumerable<ExpenseDto>> GetExpensesAsync(string tenantId, Guid? storeId, DateTime? from = null, DateTime? to = null, bool includeDeleted = false);
    Task<ExpenseDto?> GetExpenseByIdAsync(string tenantId, Guid id);
    Task<ExpenseDto> CreateExpenseAsync(string tenantId, CreateExpenseRequest request);
    Task<ExpenseDto> UpdateExpenseAsync(string tenantId, Guid id, UpdateExpenseRequest request);
    Task DeleteExpenseAsync(string tenantId, Guid id);
    Task MarkAsPaidAsync(string tenantId, Guid id);
}
