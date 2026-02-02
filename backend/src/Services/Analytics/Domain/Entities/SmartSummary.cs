using System;

namespace Profitzen.Analytics.Domain.Entities;

public class SmartSummary
{
    public Guid Id { get; set; }
    public string TenantId { get; set; } = string.Empty;
    public Guid StoreId { get; set; }
    public DateTime Date { get; set; }
    public string Section { get; set; } = string.Empty; // e.g. "DailySales", "InventoryRisk"
    public string Content { get; set; } = string.Empty; // Markdown/Text from AI
    public string Type { get; set; } = "Insight"; // Insight, Warning, Opportunity
    public bool IsRead { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
