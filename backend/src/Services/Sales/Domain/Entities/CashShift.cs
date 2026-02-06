using System;
using System.Collections.Generic;

namespace Profitzen.Sales.Domain.Entities;

public class CashShift
{
    public Guid Id { get; set; }
    public string TenantId { get; set; }
    public Guid StoreId { get; set; }
    
    // The user who opened the shift (Cashier)
    public string UserId { get; set; }
    public string UserName { get; set; }

    public DateTime StartTime { get; set; }
    public DateTime? EndTime { get; set; }

    // Money handling
    public decimal StartAmount { get; set; } // Base
    
    // Calculated at closing
    public decimal TotalSalesCash { get; set; } // Cash sales during shift
    public decimal TotalSalesCard { get; set; } // Card sales 
    public decimal TotalSalesTransfer { get; set; } // Transfer sales
    public decimal TotalSalesWallet { get; set; } // Yape/Plin
    public decimal TotalCreditCollections { get; set; } // Money received from credit payments
    
    public decimal TotalCashIn { get; set; } // Manual deposits
    public decimal TotalCashOut { get; set; } // Manual withdrawals
    public decimal TotalExpenses { get; set; } // Expenses paid in cash during shift

    // The system calculates this as the expected cash in drawer
    // Expected = StartAmount + TotalSalesCash + TotalCreditCollections(Cash) + TotalCashIn - TotalCashOut
    public decimal ExpectedCashEndAmount { get; set; } 

    // What the cashier actually counted
    public decimal ActualCashEndAmount { get; set; }

    // Difference = Actual - Expected
    public decimal Difference { get; set; }

    public string Status { get; set; } = "Open"; // Open, Closed
    public string? Notes { get; set; }

    // Navigation
    public virtual ICollection<CashMovement> Movements { get; set; } = new List<CashMovement>();
}
