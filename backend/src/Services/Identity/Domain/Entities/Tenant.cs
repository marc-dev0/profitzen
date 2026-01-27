namespace Profitzen.Identity.Domain.Entities;

public class Tenant
{
    public string Id { get; private set; } = string.Empty;
    public string CompanyName { get; private set; } = string.Empty;
    public string Plan { get; private set; } = "Trial";
    public DateTime? TrialEndsAt { get; private set; }
    public bool IsActive { get; private set; } = true;
    public DateTime CreatedAt { get; private set; }
    public DateTime UpdatedAt { get; private set; }

    private Tenant() { }

    public static Tenant Create(string companyName)
    {
        var tenant = new Tenant
        {
            Id = Guid.NewGuid().ToString(),
            CompanyName = companyName,
            Plan = "Trial",
            TrialEndsAt = DateTime.UtcNow.AddDays(14),
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        return tenant;
    }

    public void UpgradeToPaid(string plan)
    {
        Plan = plan;
        TrialEndsAt = null;
        UpdatedAt = DateTime.UtcNow;
    }

    public void Deactivate()
    {
        IsActive = false;
        UpdatedAt = DateTime.UtcNow;
    }

    public bool IsTrialExpired()
    {
        return TrialEndsAt.HasValue && TrialEndsAt.Value < DateTime.UtcNow;
    }
}
