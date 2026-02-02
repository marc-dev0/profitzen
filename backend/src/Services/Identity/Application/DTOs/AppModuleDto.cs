namespace Profitzen.Identity.Application.DTOs;

public class AppModuleDto
{
    public Guid Id { get; set; }
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Route { get; set; }
    public string? Icon { get; set; }
    public Guid? ParentId { get; set; }
    public int SortOrder { get; set; }
    public string? GroupName { get; set; }
    public List<AppModuleDto> Children { get; set; } = new();
}

public class UserMenuDto
{
    public List<AppModuleDto> MenuItems { get; set; } = new();
}
