using Profitzen.Common.Domain;

namespace Profitzen.Inventory.Domain.Entities;

public class DocumentSeries : BaseEntity
{
    public string SeriesCode { get; private set; }
    public string DocumentType { get; private set; }
    public string DocumentTypeName { get; private set; }
    public int CurrentNumber { get; private set; }
    public Guid StoreId { get; private set; }
    public string TenantId { get; private set; }
    public bool IsActive { get; private set; }
    public bool IsDefault { get; private set; }

    private DocumentSeries() { }

    public DocumentSeries(
        string seriesCode,
        string documentType,
        string documentTypeName,
        Guid storeId,
        string tenantId,
        bool isDefault = false)
    {
        SeriesCode = seriesCode;
        DocumentType = documentType;
        DocumentTypeName = documentTypeName;
        CurrentNumber = 0;
        StoreId = storeId;
        TenantId = tenantId;
        IsActive = true;
        IsDefault = isDefault;
    }

    public string GetNextDocumentNumber()
    {
        CurrentNumber++;
        return $"{SeriesCode}-{CurrentNumber:D8}";
    }

    public void Deactivate()
    {
        IsActive = false;
        UpdatedAt = DateTime.UtcNow;
    }

    public void Activate()
    {
        IsActive = true;
        UpdatedAt = DateTime.UtcNow;
    }

    public void SetAsDefault()
    {
        IsDefault = true;
        UpdatedAt = DateTime.UtcNow;
    }

    public void RemoveDefault()
    {
        IsDefault = false;
        UpdatedAt = DateTime.UtcNow;
    }
}
