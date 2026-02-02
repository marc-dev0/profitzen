using System.ComponentModel.DataAnnotations;

namespace Profitzen.Identity.Domain.Entities;

public class AppModule
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    [MaxLength(50)]
    public string Code { get; set; } = string.Empty; // e.g. "inventory_stock"

    [Required]
    [MaxLength(100)]
    public string Name { get; set; } = string.Empty; // e.g. "Stock de Inventario"

    [MaxLength(200)]
    public string? Route { get; set; } // e.g. "/inventory/stock"

    [MaxLength(50)]
    public string? Icon { get; set; } // e.g. "Package"

    public Guid? ParentId { get; set; }
    
    public AppModule? Parent { get; set; }
    
    public List<AppModule> Children { get; set; } = new();

    public int SortOrder { get; set; }

    public bool IsVisibleInMenu { get; set; } = true;

    public bool IsActive { get; set; } = true;

    [MaxLength(50)]
    public string? GroupName { get; set; } // e.g. "Operaciones", "Inteligencia"

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
