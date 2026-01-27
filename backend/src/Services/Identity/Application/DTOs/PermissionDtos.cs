using Profitzen.Identity.Domain.Enums;

namespace Profitzen.Identity.Application.DTOs;

public class PermissionDto
{
    public UserRole Role { get; set; }
    public string RoleName { get; set; } = string.Empty;
    public List<string> Modules { get; set; } = new();
}

public class UpdatePermissionRequest
{
    public UserRole Role { get; set; }
    public List<string> Modules { get; set; } = new();
}
