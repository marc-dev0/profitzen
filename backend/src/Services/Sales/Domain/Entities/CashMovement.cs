using System;

namespace Profitzen.Sales.Domain.Entities;

public class CashMovement
{
    public Guid Id { get; set; }
    public Guid CashShiftId { get; set; }
    
    public string Type { get; set; } // "IN" (Ingreso), "OUT" (Salida)
    public decimal Amount { get; set; }
    public string Description { get; set; } // Reason (e.g., "Pago Proveedor X", "Sencillo para caja")
    
    public DateTime Timestamp { get; set; }
    public string UserId { get; set; } // Who made the movement

    // Navigation
    public virtual CashShift CashShift { get; set; }
}
