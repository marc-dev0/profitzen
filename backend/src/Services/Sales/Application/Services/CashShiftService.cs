using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Profitzen.Sales.Domain.Entities;
using Profitzen.Sales.Infrastructure;
using Profitzen.Sales.Domain.Enums;

namespace Profitzen.Sales.Application.Services;

public class CashShiftService : ICashShiftService
{
    private readonly SalesDbContext _context;
    private readonly ILogger<CashShiftService> _logger;

    public CashShiftService(SalesDbContext context, ILogger<CashShiftService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<CashShift> OpenShiftAsync(string tenantId, Guid storeId, string userId, string userName, decimal startAmount)
    {
        // 1. Verify no open shift exists
        var existingOpenShift = await _context.CashShifts
            .FirstOrDefaultAsync(s => s.StoreId == storeId && s.Status == "Open" && s.TenantId == tenantId);

        if (existingOpenShift != null)
        {
            throw new InvalidOperationException("Ya existe una caja abierta para esta tienda.");
        }

        // 2. Create new shift
        var shift = new CashShift
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            StoreId = storeId,
            UserId = userId,
            UserName = userName,
            StartTime = DateTime.UtcNow,
            StartAmount = startAmount,
            Status = "Open",
            
            // Initializing totals
            TotalSalesCash = 0,
            TotalSalesCard = 0,
            TotalSalesTransfer = 0,
            TotalSalesWallet = 0,
            TotalCreditCollections = 0,
            TotalCashIn = 0,
            TotalCashOut = 0,
            ExpectedCashEndAmount = startAmount,
            ActualCashEndAmount = 0,
            Difference = 0
        };

        _context.CashShifts.Add(shift);
        await _context.SaveChangesAsync();
        
        return shift;
    }

    public async Task<CashShift> CloseShiftAsync(Guid shiftId, decimal actualEndAmount, string notes)
    {
        var shift = await GetShiftDetailsAsync(shiftId);
        if (shift == null) throw new KeyNotFoundException("Turno no encontrado");

        if (shift.Status != "Open")
            throw new InvalidOperationException("El turno ya está cerrado.");

        // NOTE: GetShiftDetailsAsync already recalculated the expected totals from DB
        
        shift.EndTime = DateTime.UtcNow;
        shift.ActualCashEndAmount = actualEndAmount;
        shift.Difference = actualEndAmount - shift.ExpectedCashEndAmount;
        shift.Status = "Closed";
        shift.Notes = notes;

        await _context.SaveChangesAsync();
        return shift;
    }

    public async Task<CashShift?> GetOpenShiftAsync(string tenantId, Guid storeId)
    {
        var shift = await _context.CashShifts
            .Include(s => s.Movements)
            .FirstOrDefaultAsync(s => s.TenantId == tenantId && s.StoreId == storeId && s.Status == "Open");
            
        if (shift != null)
        {
            await PopulateShiftTotalsAsync(shift);
            // We don't necessarily need to SaveChanges here as the controller might just need the object,
            // but PopulateShiftTotalsAsync will handle it if we want persistence.
        }
        
        return shift;
    }

    public async Task<CashShift?> GetShiftByIdAsync(Guid id)
    {
        var shift = await _context.CashShifts
            .Include(s => s.Movements)
            .FirstOrDefaultAsync(s => s.Id == id);

        if (shift != null && shift.Status == "Open")
        {
            await PopulateShiftTotalsAsync(shift);
        }

        return shift;
    }

    public async Task<CashMovement> AddMovementAsync(Guid shiftId, string type, decimal amount, string description, string userId)
    {
        var shift = await _context.CashShifts.FindAsync(shiftId);
        if (shift == null) throw new KeyNotFoundException("Turno no encontrado");
        if (shift.Status != "Open") throw new InvalidOperationException("No se pueden registrar movimientos en una caja cerrada.");

        var movement = new CashMovement
        {
            Id = Guid.NewGuid(),
            CashShiftId = shiftId,
            Type = type, // IN, OUT
            Amount = amount,
            Description = description,
            Timestamp = DateTime.UtcNow,
            UserId = userId
        };

        _context.CashMovements.Add(movement);
        
        // Finalize totals after adding movement
        await _context.SaveChangesAsync();
        await PopulateShiftTotalsAsync(shift);
        
        return movement;
    }

    public async Task<CashShift> GetShiftDetailsAsync(Guid shiftId)
    {
        var shift = await GetShiftByIdAsync(shiftId);
        if (shift == null) throw new KeyNotFoundException("Turno no encontrado");

        await PopulateShiftTotalsAsync(shift);
        return shift;
    }

    private async Task PopulateShiftTotalsAsync(CashShift shift)
    {
        // 1. Determine time range
        var endTime = shift.EndTime ?? DateTime.UtcNow;

        // 2. Fetch Sales
        var sales = await _context.Sales
            .Where(s => s.StoreId == shift.StoreId 
                     && s.SaleDate >= shift.StartTime 
                     && s.SaleDate <= endTime
                     && s.Status == SaleStatus.Completed)
            .Include(s => s.Payments)
            .AsNoTracking()
            .ToListAsync();

        // 3. Update Sales Totals
        shift.TotalSalesCash = sales.Sum(s => s.Payments.Where(p => p.Method == PaymentMethod.Cash).Sum(p => p.Amount));
        shift.TotalSalesCard = sales.Sum(s => s.Payments.Where(p => p.Method == PaymentMethod.Card).Sum(p => p.Amount));
        shift.TotalSalesTransfer = sales.Sum(s => s.Payments.Where(p => p.Method == PaymentMethod.Transfer).Sum(p => p.Amount));
        shift.TotalSalesWallet = sales.Sum(s => s.Payments.Where(p => p.Method == PaymentMethod.DigitalWallet).Sum(p => p.Amount));

        // 4. Fetch Credit Collections from customer schema
        // Since we are in the same DB for demo purposes, we can join/query across schemas
        var totalCreditCollections = await _context.Database
            .SqlQueryRaw<decimal>(
                @"SELECT COALESCE(SUM(""Amount""), 0) as ""Value"" 
                  FROM customer.""CreditPayments"" 
                  WHERE ""StoreId"" = {0} 
                  AND ""PaymentDate"" >= {1} 
                  AND ""PaymentDate"" <= {2}",
                shift.StoreId, shift.StartTime, endTime)
            .FirstOrDefaultAsync();

        shift.TotalCreditCollections = totalCreditCollections;

        // 5. Fetch Expenses
        // Note: For expenses, we use Date.Date comparison if time is missing, 
        // but generally we want to ensure we capture expenses paid DURING the shift.
        // If the expense date is just a date, we include it if it's the same day as shift start.
        var shiftStartDate = shift.StartTime.Date;
        var shiftEndDate = endTime.Date;

        var expenseList = await _context.Expenses
            .Where(e => e.StoreId == shift.StoreId 
                     && e.IsPaid
                     && e.PaymentMethod == PaymentMethod.Cash
                     && e.Date >= shiftStartDate
                     && e.Date <= shiftEndDate)
            .AsNoTracking()
            .ToListAsync();

        shift.TotalExpenses = expenseList.Sum(e => e.Amount);
            
        // 5. Update Manual Movements Totals
        shift.TotalCashIn = shift.Movements.Where(m => m.Type == "IN").Sum(m => m.Amount);
        shift.TotalCashOut = shift.Movements.Where(m => m.Type == "OUT").Sum(m => m.Amount);

        // 6. Final Calculation
        shift.ExpectedCashEndAmount = shift.StartAmount 
                                    + shift.TotalSalesCash 
                                    + shift.TotalCreditCollections
                                    + shift.TotalCashIn 
                                    - shift.TotalCashOut 
                                    - shift.TotalExpenses; 

        // 7. Save to DB if it's open (to keep history updated without explicit details call)
        if (shift.Status == "Open")
        {
            await _context.SaveChangesAsync();
        }
    }

    public async Task<IEnumerable<CashShift>> GetHistoryAsync(string tenantId, Guid storeId, DateTime? fromDate, DateTime? toDate)
    {
        var query = _context.CashShifts
            .Include(s => s.Movements)
            .Where(s => s.TenantId == tenantId && s.StoreId == storeId);

        if (fromDate.HasValue) query = query.Where(s => s.StartTime >= fromDate.Value);
        if (toDate.HasValue) query = query.Where(s => s.StartTime <= toDate.Value);

        var history = await query
            .OrderByDescending(s => s.StartTime)
            .Take(50) // Limit results
            .ToListAsync();

        // Ensure open shifts in history have up-to-date totals
        foreach (var shift in history.Where(s => s.Status == "Open"))
        {
            await PopulateShiftTotalsAsync(shift);
        }

        return history;
    }

    private decimal CalculateExpectedAmount(CashShift shift)
    {
        // Simple helper - note this doesnt query DB for sales, just internal state
        // For accurate calc call GetShiftDetailsAsync
        return shift.StartAmount + shift.TotalCashIn - shift.TotalCashOut; 
    }
}
