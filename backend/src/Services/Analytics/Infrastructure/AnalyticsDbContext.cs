using Microsoft.EntityFrameworkCore;
using Profitzen.Analytics.Domain.Entities;

namespace Profitzen.Analytics.Infrastructure;

public class AnalyticsDbContext : DbContext
{
    public AnalyticsDbContext(DbContextOptions<AnalyticsDbContext> options) : base(options)
    {
    }

    public DbSet<DailySalesSummary> DailySalesSummaries { get; set; }
    public DbSet<ProductPerformance> ProductPerformances { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.HasDefaultSchema("analytics");

        modelBuilder.Entity<DailySalesSummary>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.TenantId).HasMaxLength(450).IsRequired();
            entity.Property(e => e.TotalRevenue).HasPrecision(18, 2);
            entity.Property(e => e.TotalCost).HasPrecision(18, 2);
            entity.Property(e => e.TotalProfit).HasPrecision(18, 2);
            entity.Property(e => e.AverageTicket).HasPrecision(18, 2);

            entity.HasIndex(e => new { e.TenantId, e.StoreId, e.Date }).IsUnique();
            entity.HasIndex(e => e.TenantId);
            entity.HasIndex(e => e.StoreId);
            entity.HasIndex(e => e.Date);
        });

        modelBuilder.Entity<ProductPerformance>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.TenantId).HasMaxLength(450).IsRequired();
            entity.Property(e => e.ProductCode).HasMaxLength(50).IsRequired();
            entity.Property(e => e.ProductName).HasMaxLength(200).IsRequired();
            entity.Property(e => e.TotalRevenue).HasPrecision(18, 2);
            entity.Property(e => e.TotalCost).HasPrecision(18, 2);
            entity.Property(e => e.TotalProfit).HasPrecision(18, 2);

            entity.HasIndex(e => new { e.TenantId, e.ProductId }).IsUnique();
            entity.HasIndex(e => e.TenantId);
            entity.HasIndex(e => e.TotalRevenue);
            entity.HasIndex(e => e.LastSaleDate);
        });

        base.OnModelCreating(modelBuilder);
    }
}
