namespace Profitzen.Product.Application.DTOs;

public record CategoryDto
{
    public Guid Id { get; init; }
    public string Name { get; init; } = string.Empty;
    public string Description { get; init; } = string.Empty;
    public bool IsActive { get; init; }
    public int ProductCount { get; init; }
    public DateTime CreatedAt { get; init; }
    public DateTime UpdatedAt { get; init; }
}

public record CreateCategoryRequest
{
    public string Name { get; init; } = string.Empty;
    public string Description { get; init; } = string.Empty;
}

public record UpdateCategoryRequest
{
    public string Name { get; init; } = string.Empty;
    public string Description { get; init; } = string.Empty;
    public bool IsActive { get; init; }
}
