using Microsoft.EntityFrameworkCore;
using Profitzen.Common.Domain;
using Sagr.Domain;

namespace Profitzen.PaymentMethods.Infrastructure;

public class PaymentMethodsDbContext : DbContext
{
    public PaymentMethodsDbContext(DbContextOptions<PaymentMethodsDbContext> options)
        : base(options)
    {
    }

    public DbSet<PaymentMethodConfig> PaymentMethodConfigs { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.HasDefaultSchema("payment");

        modelBuilder.Entity<PaymentMethodConfig>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.TenantId).HasMaxLength(450).IsRequired();
            entity.Property(e => e.Code).HasMaxLength(20).IsRequired();
            entity.Property(e => e.Name).HasMaxLength(50).IsRequired();
            entity.Property(e => e.Description).HasMaxLength(200);
            entity.Property(e => e.Icon).HasMaxLength(50);
            entity.HasIndex(e => new { e.TenantId, e.Code }).IsUnique();
            entity.HasIndex(e => e.TenantId);
        });

        base.OnModelCreating(modelBuilder);
    }
}
