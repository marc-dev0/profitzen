using Microsoft.EntityFrameworkCore;
using Profitzen.Sales.Application.DTOs;
using Profitzen.Sales.Domain.Entities;
using Profitzen.Sales.Infrastructure;

namespace Profitzen.Sales.Application.Services;

public class ExpenseService : IExpenseService
{
    private readonly SalesDbContext _context;

    public ExpenseService(SalesDbContext context)
    {
        _context = context;
    }

    public async Task<IEnumerable<ExpenseDto>> GetExpensesAsync(string tenantId, Guid? storeId, DateTime? from = null, DateTime? to = null, bool includeDeleted = false)
    {
        var query = _context.Expenses
            .Where(e => e.TenantId == tenantId);

        if (!includeDeleted)
        {
            query = query.Where(e => e.DeletedAt == null);
        }

        if (storeId.HasValue)
        {
            query = query.Where(e => e.StoreId == storeId.Value);
        }

        if (from.HasValue)
        {
            query = query.Where(e => e.Date >= from.Value);
        }

        if (to.HasValue)
        {
            query = query.Where(e => e.Date <= to.Value);
        }

        var expenses = await query
            .OrderByDescending(e => e.Date)
            .ToListAsync();

        return expenses.Select(MapToDto);
    }

    public async Task<ExpenseDto?> GetExpenseByIdAsync(string tenantId, Guid id)
    {
        var expense = await _context.Expenses
            .FirstOrDefaultAsync(e => e.TenantId == tenantId && e.Id == id && e.DeletedAt == null);

        return expense != null ? MapToDto(expense) : null;
    }

    public async Task<ExpenseDto> CreateExpenseAsync(string tenantId, CreateExpenseRequest request)
    {
        var expense = new Expense(
            tenantId,
            request.StoreId,
            request.Description,
            request.Category,
            request.Amount,
            request.Date,
            request.PaymentMethod,
            request.IsPaid,
            request.DueDate,
            request.Reference,
            request.Notes
        );

        _context.Expenses.Add(expense);
        await _context.SaveChangesAsync();

        return MapToDto(expense);
    }

    public async Task<ExpenseDto> UpdateExpenseAsync(string tenantId, Guid id, UpdateExpenseRequest request)
    {
        var expense = await _context.Expenses
            .FirstOrDefaultAsync(e => e.TenantId == tenantId && e.Id == id && e.DeletedAt == null)
            ?? throw new KeyNotFoundException("Gasto no encontrado");

        expense.Update(
            request.Description,
            request.Category,
            request.Amount,
            request.Date,
            request.PaymentMethod,
            request.IsPaid,
            request.DueDate,
            request.Reference,
            request.Notes
        );

        await _context.SaveChangesAsync();

        return MapToDto(expense);
    }

    public async Task DeleteExpenseAsync(string tenantId, Guid id)
    {
        var expense = await _context.Expenses
            .FirstOrDefaultAsync(e => e.TenantId == tenantId && e.Id == id && e.DeletedAt == null)
            ?? throw new KeyNotFoundException("Gasto no encontrado");

        expense.Deactivate();
        expense.MarkAsDeleted();
        await _context.SaveChangesAsync();
    }

    public async Task MarkAsPaidAsync(string tenantId, Guid id)
    {
        var expense = await _context.Expenses
            .FirstOrDefaultAsync(e => e.TenantId == tenantId && e.Id == id && e.DeletedAt == null)
            ?? throw new KeyNotFoundException("Gasto no encontrado");

        expense.MarkAsPaid();
        await _context.SaveChangesAsync();
    }

    private static ExpenseDto MapToDto(Expense e)
    {
        return new ExpenseDto(
            e.Id,
            e.StoreId,
            e.Description,
            e.Category,
            e.Amount,
            e.Date,
            e.PaymentMethod,
            e.IsPaid,
            e.DueDate,
            e.Reference,
            e.Notes,
            e.CreatedAt,
            e.IsActive,
            e.DeletedAt
        );
    }
}
