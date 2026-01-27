using Microsoft.EntityFrameworkCore;
using Profitzen.Customer.Domain.Entities;

namespace Profitzen.Customer.Infrastructure;

public class CustomerDbContext : DbContext
{
    public CustomerDbContext(DbContextOptions<CustomerDbContext> options) : base(options)
    {
    }

    public DbSet<Domain.Entities.Customer> Customers { get; set; }
    public DbSet<Purchase> Purchases { get; set; }
    public DbSet<Credit> Credits { get; set; }
    public DbSet<CreditPayment> CreditPayments { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.HasDefaultSchema("customer");

        modelBuilder.Entity<Domain.Entities.Customer>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.TenantId).HasMaxLength(450).IsRequired();
            entity.Property(e => e.DocumentNumber).HasMaxLength(20).IsRequired();
            entity.Property(e => e.FirstName).HasMaxLength(100).IsRequired();
            entity.Property(e => e.LastName).HasMaxLength(100).IsRequired();
            entity.Property(e => e.Email).HasMaxLength(100);
            entity.Property(e => e.Phone).HasMaxLength(20);
            entity.Property(e => e.Address).HasMaxLength(300);
            entity.Property(e => e.CreditLimit).HasPrecision(18, 2);
            entity.Property(e => e.CurrentDebt).HasPrecision(18, 2);

            entity.HasIndex(e => new { e.DocumentNumber, e.TenantId }).IsUnique();
            entity.HasIndex(e => e.TenantId);
            entity.HasIndex(e => e.Email);

            entity.HasMany(e => e.Purchases)
                  .WithOne(p => p.Customer)
                  .HasForeignKey(p => p.CustomerId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.HasMany(e => e.Credits)
                  .WithOne(c => c.Customer)
                  .HasForeignKey(c => c.CustomerId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Purchase>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.TotalAmount).HasPrecision(18, 2);

            entity.HasIndex(e => e.CustomerId);
            entity.HasIndex(e => e.SaleId);
            entity.HasIndex(e => e.PurchaseDate);
        });

        modelBuilder.Entity<Credit>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Amount).HasPrecision(18, 2);
            entity.Property(e => e.RemainingAmount).HasPrecision(18, 2);
            entity.Property(e => e.Notes).HasMaxLength(500);

            entity.HasIndex(e => e.CustomerId);
            entity.HasIndex(e => e.IsPaid);
            entity.HasIndex(e => e.DueDate);

            entity.HasMany(e => e.Payments)
                  .WithOne(p => p.Credit)
                  .HasForeignKey(p => p.CreditId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<CreditPayment>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Amount).HasPrecision(18, 2);
            entity.Property(e => e.Notes).HasMaxLength(500);

            entity.HasIndex(e => e.CreditId);
            entity.HasIndex(e => e.PaymentDate);
        });

        base.OnModelCreating(modelBuilder);
    }
}
