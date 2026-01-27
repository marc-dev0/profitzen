namespace Profitzen.Identity.Application.Services.Seeding;

public interface ITenantInitializer
{
    Task InitializeNewTenantAsync(string tenantId);
}
