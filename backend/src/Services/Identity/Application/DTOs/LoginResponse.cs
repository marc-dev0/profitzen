namespace Profitzen.Identity.Application.DTOs;

public class LoginResponse
{
    public string Token { get; set; } = string.Empty;
    public DateTime ExpiresAt { get; set; }
    public UserInfo User { get; set; } = null!;
}

public class UserInfo
{
    public Guid Id { get; set; }
    public string Email { get; set; } = string.Empty;
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public List<string> Permissions { get; set; } = new();
    public List<StoreInfo> Stores { get; set; } = new();
}

public class StoreInfo
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string TenantId { get; set; } = string.Empty;
}