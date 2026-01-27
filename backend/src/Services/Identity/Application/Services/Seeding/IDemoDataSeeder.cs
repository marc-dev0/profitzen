namespace Profitzen.Identity.Application.Services.Seeding;

public interface IDemoDataSeeder
{
    Task SeedDemoDataAsync(string tenantId, string storeId, Guid userId);
    Task SeedPermissionsAsync();
}
