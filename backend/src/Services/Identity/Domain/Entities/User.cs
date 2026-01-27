using Microsoft.AspNetCore.Identity;
using Profitzen.Identity.Domain.Enums;

namespace Profitzen.Identity.Domain.Entities;

public class User : IdentityUser<Guid>
{
    public string TenantId { get; set; } = string.Empty;
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public UserRole Role { get; set; } = UserRole.Cashier;
    public bool IsActive { get; set; } = true;
    public virtual ICollection<Store> Stores { get; set; } = new List<Store>();
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? DeletedAt { get; set; }


    public virtual Tenant Tenant { get; set; } = null!;

    public string FullName => $"{FirstName} {LastName}";
    public bool IsDeleted => DeletedAt.HasValue;

    public void UpdateInfo(string firstName, string lastName, string? phone = null)
    {
        FirstName = firstName;
        LastName = lastName;
        Phone = phone;
        UpdatedAt = DateTime.UtcNow;
    }

    public void ChangeRole(UserRole role)
    {
        Role = role;
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

    public void MarkAsDeleted()
    {
        DeletedAt = DateTime.UtcNow;
        UpdatedAt = DateTime.UtcNow;
        IsActive = false;
    }
}