using Microsoft.EntityFrameworkCore;
using Profitzen.Sales.Domain.Entities;

namespace Profitzen.Sales.Infrastructure;

public class SalesDbContext : DbContext
{
    public SalesDbContext(DbContextOptions<SalesDbContext> options) : base(options)
    {
    }

    public DbSet<Sale> Sales { get; set; }
    public DbSet<SaleItem> SaleItems { get; set; }
    public DbSet<Payment> Payments { get; set; }
    public DbSet<Customer> Customers { get; set; }
    public DbSet<Expense> Expenses { get; set; }
    public DbSet<CashShift> CashShifts { get; set; }
    public DbSet<CashMovement> CashMovements { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.HasDefaultSchema("sales");

        // Sale Configuration
        modelBuilder.Entity<Sale>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.SaleNumber).HasMaxLength(50).IsRequired();
            entity.Property(e => e.Subtotal).HasPrecision(18, 2);
            entity.Property(e => e.DiscountAmount).HasPrecision(18, 2);
            entity.Property(e => e.TaxAmount).HasPrecision(18, 2);
            entity.Property(e => e.Total).HasPrecision(18, 2);
            entity.Property(e => e.Notes).HasMaxLength(500);

            entity.HasIndex(e => e.SaleNumber).IsUnique();
            entity.HasIndex(e => e.StoreId);
            entity.HasIndex(e => e.SaleDate);
            entity.HasIndex(e => e.Status);

            entity.HasOne(e => e.Customer)
                  .WithMany(c => c.Sales)
                  .HasForeignKey(e => e.CustomerId)
                  .OnDelete(DeleteBehavior.SetNull);

            entity.HasMany(e => e.Items)
                  .WithOne(i => i.Sale)
                  .HasForeignKey(i => i.SaleId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.HasMany(e => e.Payments)
                  .WithOne(p => p.Sale)
                  .HasForeignKey(p => p.SaleId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        // SaleItem Configuration
        modelBuilder.Entity<SaleItem>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.ProductName).HasMaxLength(200).IsRequired();
            entity.Property(e => e.ProductCode).HasMaxLength(50).IsRequired();
            entity.Property(e => e.UnitPrice).HasPrecision(18, 2);
            entity.Property(e => e.DiscountAmount).HasPrecision(18, 2);
            entity.Property(e => e.Subtotal).HasPrecision(18, 2);
            entity.Property(e => e.ConversionToBase).HasPrecision(18, 6).HasDefaultValue(1m);

            entity.HasIndex(e => e.SaleId);
            entity.HasIndex(e => e.ProductId);
        });

        // Payment Configuration
        modelBuilder.Entity<Payment>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Amount).HasPrecision(18, 2);
            entity.Property(e => e.Reference).HasMaxLength(100);

            entity.HasIndex(e => e.SaleId);
            entity.HasIndex(e => e.PaymentDate);
            entity.HasIndex(e => e.Method);
        });

        // Customer Configuration
        modelBuilder.Entity<Customer>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.DocumentNumber).HasMaxLength(20).IsRequired();
            entity.Property(e => e.Name).HasMaxLength(200).IsRequired();
            entity.Property(e => e.Email).HasMaxLength(100);
            entity.Property(e => e.Phone).HasMaxLength(20);
            entity.Property(e => e.Address).HasMaxLength(300);
            entity.Property(e => e.CreditLimit).HasPrecision(18, 2);
            entity.Property(e => e.CurrentDebt).HasPrecision(18, 2);

            entity.HasIndex(e => new { e.DocumentNumber, e.StoreId }).IsUnique();
            entity.HasIndex(e => e.StoreId);
            entity.HasIndex(e => e.Name);
        });

    // Expense Configuration
        modelBuilder.Entity<Expense>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Description).HasMaxLength(200).IsRequired();
            entity.Property(e => e.Category).HasMaxLength(50).IsRequired();
            entity.Property(e => e.Amount).HasPrecision(18, 2);
            entity.Property(e => e.Reference).HasMaxLength(100);
            entity.Property(e => e.Notes).HasMaxLength(500);

            entity.HasIndex(e => e.StoreId);
            entity.HasIndex(e => e.Date);
            entity.HasIndex(e => e.Category);
        });

        // CashShift Configuration
        modelBuilder.Entity<CashShift>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.StartAmount).HasPrecision(18, 2);
            entity.Property(e => e.TotalSalesCash).HasPrecision(18, 2);
            entity.Property(e => e.TotalSalesCard).HasPrecision(18, 2);
            entity.Property(e => e.TotalSalesTransfer).HasPrecision(18, 2);
            entity.Property(e => e.TotalSalesWallet).HasPrecision(18, 2);
            entity.Property(e => e.TotalCreditCollections).HasPrecision(18, 2);
            entity.Property(e => e.TotalCashIn).HasPrecision(18, 2);
            entity.Property(e => e.TotalCashOut).HasPrecision(18, 2);
            entity.Property(e => e.TotalExpenses).HasPrecision(18, 2);
            entity.Property(e => e.ExpectedCashEndAmount).HasPrecision(18, 2);
            entity.Property(e => e.ActualCashEndAmount).HasPrecision(18, 2);
            entity.Property(e => e.Difference).HasPrecision(18, 2);

            entity.HasIndex(e => new { e.StoreId, e.Status }); // Quick lookup for open shift
            entity.HasIndex(e => e.StartTime);
            
            entity.HasMany(e => e.Movements)
                  .WithOne(m => m.CashShift)
                  .HasForeignKey(m => m.CashShiftId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        // CashMovement Configuration
        modelBuilder.Entity<CashMovement>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Amount).HasPrecision(18, 2);
            entity.Property(e => e.Description).HasMaxLength(200).IsRequired();
            entity.Property(e => e.Type).HasMaxLength(10).IsRequired(); // IN, OUT
        });

        base.OnModelCreating(modelBuilder);
    }
}