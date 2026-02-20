using System;

namespace Profitzen.Inventory.Domain.Entities;

public class InventoryBatch
{
    public Guid Id { get; private set; }
    public Guid ProductId { get; private set; }
    public Guid StoreId { get; private set; }
    public string? BatchNumber { get; private set; } // Opcional: Número de lote del proveedor
    public DateTime? ExpirationDate { get; private set; } // La fecha clave
    public decimal Quantity { get; private set; }
    public decimal RemainingQuantity { get; private set; } // Cuánto queda de este lote
    public DateTime ReceivedDate { get; private set; }
    public Guid? SupplierId { get; private set; }
    public decimal UnitCost { get; private set; } // Para valorar el inventario FIFO/Promedio
    public bool IsActive { get; private set; }

    // Constructor vacío para EF Core
    protected InventoryBatch() { }

    public InventoryBatch(
        Guid productId,
        Guid storeId,
        decimal quantity,
        decimal unitCost,
        DateTime receivedDate,
        DateTime? expirationDate = null,
        string? batchNumber = null,
        Guid? supplierId = null)
    {
        Id = Guid.NewGuid();
        ProductId = productId;
        StoreId = storeId;
        Quantity = quantity;
        RemainingQuantity = quantity;
        UnitCost = unitCost;
        ReceivedDate = receivedDate.ToUniversalTime();
        ExpirationDate = expirationDate?.ToUniversalTime();
        BatchNumber = batchNumber;
        SupplierId = supplierId;
        IsActive = true;
    }

    public void ReduceStack(decimal amount)
    {
        if (amount > RemainingQuantity)
            throw new InvalidOperationException($"No hay suficiente stock en este lote. Solicitado: {amount}, Disponible: {RemainingQuantity}");

        RemainingQuantity -= amount;
        
        // Si llega a 0, teóricamente el lote se agotó, pero lo mantenemos para historial
        // Podríamos marcar IsActive = false si queremos archivar lotes vacíos
    }

    public void AdjustQuantity(decimal newQuantity)
    {
        // Útil para correcciones de inventario manuales
        RemainingQuantity = newQuantity;
    }
}
