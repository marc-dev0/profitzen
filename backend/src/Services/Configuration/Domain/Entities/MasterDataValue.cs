using Profitzen.Common.Domain;

namespace Profitzen.Configuration.Domain.Entities;

public class MasterDataValue : BaseEntity
{
    public string TypeCode { get; private set; } = string.Empty;
    public string Code { get; private set; } = string.Empty;
    public string Name { get; private set; } = string.Empty;
    public string Description { get; private set; } = string.Empty;
    public Guid? ParentId { get; private set; }
    public string? Metadata { get; private set; }
    public string TenantId { get; private set; } = string.Empty;
    public int DisplayOrder { get; private set; }
    public bool IsActive { get; private set; }

    public MasterDataType Type { get; private set; } = null!;
    public MasterDataValue? Parent { get; private set; }
    public ICollection<MasterDataValue> Children { get; private set; } = new List<MasterDataValue>();

    private MasterDataValue() { }

    public MasterDataValue(
        string typeCode,
        string code,
        string name,
        string description,
        string tenantId,
        Guid? parentId = null,
        string? metadata = null,
        int displayOrder = 0)
    {
        TypeCode = typeCode;
        Code = code;
        Name = name;
        Description = description;
        TenantId = tenantId;
        ParentId = parentId;
        Metadata = metadata;
        DisplayOrder = displayOrder;
        IsActive = true;
    }

    public void Update(string name, string description, string? metadata = null)
    {
        Name = name;
        Description = description;
        if (metadata != null)
            Metadata = metadata;
        UpdatedAt = DateTime.UtcNow;
    }

    public void UpdateDetails(string name, string description, string? metadata, int displayOrder)
    {
        Name = name;
        Description = description;
        Metadata = metadata;
        DisplayOrder = displayOrder;
        UpdatedAt = DateTime.UtcNow;
    }

    public void SetParent(Guid? parentId)
    {
        ParentId = parentId;
        UpdatedAt = DateTime.UtcNow;
    }

    public void SetDisplayOrder(int order)
    {
        DisplayOrder = order;
        UpdatedAt = DateTime.UtcNow;
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
}
