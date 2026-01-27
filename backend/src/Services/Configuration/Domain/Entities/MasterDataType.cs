using Profitzen.Common.Domain;

namespace Profitzen.Configuration.Domain.Entities;

public class MasterDataType : BaseEntity
{
    public string Code { get; private set; } = string.Empty;
    public string Name { get; private set; } = string.Empty;
    public string Description { get; private set; } = string.Empty;
    public bool AllowHierarchy { get; private set; }
    public bool IsActive { get; private set; }

    private MasterDataType() { }

    public MasterDataType(
        string code,
        string name,
        string description,
        bool allowHierarchy = false)
    {
        Code = code;
        Name = name;
        Description = description;
        AllowHierarchy = allowHierarchy;
        IsActive = true;
    }

    public void Update(string name, string description)
    {
        Name = name;
        Description = description;
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
