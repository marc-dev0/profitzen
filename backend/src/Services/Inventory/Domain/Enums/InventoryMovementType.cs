namespace Profitzen.Inventory.Domain.Enums;

public enum InventoryMovementType
{
    Entry = 1,      // Entrada de mercadería
    Exit = 2,       // Salida por venta
    Adjustment = 3, // Ajuste de inventario
    Transfer = 4,   // Transferencia (Genérico - Legacy?)
    Return = 5,     // Devolución
    Loss = 6,       // Pérdida/Merma
    TransferIn = 7, // Entrada por transferencia
    TransferOut = 8 // Salida por transferencia
}