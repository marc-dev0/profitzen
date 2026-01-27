namespace Profitzen.Configuration.Application.DTOs;

public record MasterDataTypeDto
{
    public Guid Id { get; init; }
    public string Code { get; init; } = string.Empty;
    public string Name { get; init; } = string.Empty;
    public string Description { get; init; } = string.Empty;
    public bool AllowHierarchy { get; init; }
    public bool IsActive { get; init; }
}

public record MasterDataValueDto
{
    public Guid Id { get; init; }
    public string TypeCode { get; init; } = string.Empty;
    public string Code { get; init; } = string.Empty;
    public string Name { get; init; } = string.Empty;
    public string Description { get; init; } = string.Empty;
    public Guid? ParentId { get; init; }
    public string? ParentName { get; init; }
    public string? Metadata { get; init; }
    public int DisplayOrder { get; init; }
    public bool IsActive { get; init; }
    public List<MasterDataValueDto> Children { get; init; } = new();
}

public record CreateMasterDataValueRequest
{
    public string TypeCode { get; init; } = string.Empty;
    public string Code { get; init; } = string.Empty;
    public string Name { get; init; } = string.Empty;
    public string Description { get; init; } = string.Empty;
    public Guid? ParentId { get; init; }
    public string? Metadata { get; init; }
    public int DisplayOrder { get; init; }
}

public record UpdateMasterDataValueRequest
{
    public string Name { get; init; } = string.Empty;
    public string Description { get; init; } = string.Empty;
    public string? Metadata { get; init; }
    public int DisplayOrder { get; init; }
    public bool IsActive { get; init; }
}
