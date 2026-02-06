using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Profitzen.Sales.Domain.Entities;

namespace Profitzen.Sales.Application.Services;

public interface ICashShiftService
{
    // Basic operations
    Task<CashShift> OpenShiftAsync(string tenantId, Guid storeId, string userId, string userName, decimal startAmount);
    Task<CashShift> CloseShiftAsync(Guid shiftId, decimal actualEndAmount, string notes);
    Task<CashShift?> GetOpenShiftAsync(string tenantId, Guid storeId);
    Task<CashShift?> GetShiftByIdAsync(Guid id);
    
    // Movements
    Task<CashMovement> AddMovementAsync(Guid shiftId, string type, decimal amount, string description, string userId);
    
    // Reporting/Details
    Task<CashShift> GetShiftDetailsAsync(Guid shiftId); // Recalculate totals dynamically
    Task<IEnumerable<CashShift>> GetHistoryAsync(string tenantId, Guid storeId, DateTime? fromDate, DateTime? toDate);
}
