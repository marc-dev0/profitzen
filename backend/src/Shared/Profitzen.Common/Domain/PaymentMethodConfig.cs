using Profitzen.Common.Domain;

namespace Profitzen.Common.Domain;

/// <summary>
/// Configuración maestra de métodos de pago — compartida por todos los módulos.
/// Define las reglas de negocio para cada medio de pago:
/// - Si requiere monto recibido (para calcular vuelto)
/// - Si aplica redondeo BCRP (solo efectivo)
/// - Si requiere referencia (nro. operación para transferencias)
/// </summary>
public class PaymentMethodConfig : BaseEntity
{
    public string TenantId { get; set; } = string.Empty;
    
    /// <summary>Código único del método (CASH, CARD, TRANSFER, WALLET, CREDIT)</summary>
    public string Code { get; set; } = string.Empty;
    
    /// <summary>Nombre visible para el usuario (Efectivo, Tarjeta, etc.)</summary>
    public string Name { get; set; } = string.Empty;
    
    /// <summary>Descripción corta para tooltips</summary>
    public string? Description { get; set; }
    
    /// <summary>Ícono para el frontend (nombre de lucide-react)</summary>
    public string Icon { get; set; } = "CreditCard";
    
    /// <summary>¿Requiere que el cajero ingrese el monto recibido? (true solo para Efectivo)</summary>
    public bool RequiresAmountReceived { get; set; }
    
    /// <summary>¿Aplica redondeo BCRP al múltiplo de 5 céntimos? (true solo para Efectivo)</summary>
    public bool AppliesRounding { get; set; }
    
    /// <summary>¿Requiere número de referencia/operación? (true para Transferencia, Yape, etc.)</summary>
    public bool RequiresReference { get; set; }
    
    /// <summary>¿Este método genera deuda al cliente? (true solo para Crédito)</summary>
    public bool GeneratesDebt { get; set; }
    
    /// <summary>¿Requiere cliente identificado? (true para Crédito y Factura)</summary>
    public bool RequiresCustomer { get; set; }
    
    /// <summary>¿Está activo y disponible para uso?</summary>
    public bool IsActive { get; set; } = true;
    
    /// <summary>Orden de aparición en la UI</summary>
    public int SortOrder { get; set; }
    
    /// <summary>Fecha de creación</summary>
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
