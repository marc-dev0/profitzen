using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Profitzen.Sales.Application.DTOs;
using Profitzen.Sales.Application.Services;
using System.Security.Claims;

namespace Profitzen.Sales.Controllers;

[Authorize]
[ApiController]
[Route("api/sales/[controller]")]
public class ExpenseController : ControllerBase
{
    private readonly IExpenseService _expenseService;

    public ExpenseController(IExpenseService expenseService)
    {
        _expenseService = expenseService;
    }

    [HttpGet]
    public async Task<IActionResult> GetExpenses([FromQuery] Guid? storeId, [FromQuery] DateTime? from, [FromQuery] DateTime? to, [FromQuery] bool includeDeleted = false)
    {
        var tenantId = GetCurrentTenantId();
        var expenses = await _expenseService.GetExpensesAsync(tenantId, storeId, from, to, includeDeleted);
        return Ok(expenses);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetExpenseById(Guid id)
    {
        var tenantId = GetCurrentTenantId();
        var expense = await _expenseService.GetExpenseByIdAsync(tenantId, id);
        if (expense == null) return NotFound();
        return Ok(expense);
    }

    [HttpPost]
    public async Task<IActionResult> CreateExpense(CreateExpenseRequest request)
    {
        var tenantId = GetCurrentTenantId();
        var expense = await _expenseService.CreateExpenseAsync(tenantId, request);
        return CreatedAtAction(nameof(GetExpenseById), new { id = expense.Id }, expense);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateExpense(Guid id, UpdateExpenseRequest request)
    {
        var tenantId = GetCurrentTenantId();
        try
        {
            var expense = await _expenseService.UpdateExpenseAsync(tenantId, id, request);
            return Ok(expense);
        }
        catch (KeyNotFoundException)
        {
            return NotFound();
        }
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteExpense(Guid id)
    {
        var tenantId = GetCurrentTenantId();
        try
        {
            await _expenseService.DeleteExpenseAsync(tenantId, id);
            return NoContent();
        }
        catch (KeyNotFoundException)
        {
            return NotFound();
        }
    }

    [HttpPost("{id}/pay")]
    public async Task<IActionResult> MarkAsPaid(Guid id)
    {
        var tenantId = GetCurrentTenantId();
        try
        {
            await _expenseService.MarkAsPaidAsync(tenantId, id);
            return NoContent();
        }
        catch (KeyNotFoundException)
        {
            return NotFound();
        }
    }

    private string GetCurrentTenantId()
    {
        var tenantId = User.FindFirst("TenantId")?.Value;
        if (string.IsNullOrEmpty(tenantId))
        {
             // Fallback for older tokens or mismatches
             tenantId = User.FindFirst("tenant_id")?.Value;
        }

        if (string.IsNullOrEmpty(tenantId))
        {
            // Try everything possible
            tenantId = User.FindFirst("TenantId")?.Value 
                      ?? User.FindFirst("tenant_id")?.Value
                      ?? User.FindFirst("tenantid")?.Value
                      ?? User.FindFirst("tid")?.Value;
        }

        if (string.IsNullOrEmpty(tenantId))
        {
             // If we are in DEMO mode and no tenant info, maybe fallback to "DEMO"?
             // But it's better to log and return empty.
             Console.WriteLine($"[ExpenseController] CRITICAL: No TenantId found for user {User.Identity?.Name}. Claims: {string.Join(", ", User.Claims.Select(c => $"{c.Type}={c.Value}"))}");
             return string.Empty;
        }
        
        return tenantId;
    }
}
