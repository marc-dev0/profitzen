using Profitzen.Identity.Domain.Enums;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Profitzen.Identity.Domain.Entities;

public class RoleModulePermission
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    public UserRole Role { get; set; }

    [Required]
    [MaxLength(50)]
    public string Module { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
