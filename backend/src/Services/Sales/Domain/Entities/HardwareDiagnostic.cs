using System;

namespace Profitzen.Sales.Domain.Entities;

public class HardwareDiagnostic
{
    public Guid Id { get; private set; }
    public string TenantId { get; private set; }
    public Guid StoreId { get; private set; }
    public string DeviceName { get; private set; } // Ej: Balanza, Impresora
    public bool IsConnected { get; private set; }
    public string? ErrorMessage { get; private set; }
    public DateTime CreatedAt { get; private set; }

    public HardwareDiagnostic(string tenantId, Guid storeId, string deviceName, bool isConnected, string? errorMessage = null)
    {
        Id = Guid.NewGuid();
        TenantId = tenantId;
        StoreId = storeId;
        DeviceName = deviceName;
        IsConnected = isConnected;
        ErrorMessage = errorMessage;
        CreatedAt = DateTime.UtcNow;
    }
}
