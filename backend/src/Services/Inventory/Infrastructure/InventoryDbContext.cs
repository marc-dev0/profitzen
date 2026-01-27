using Microsoft.EntityFrameworkCore;
using Profitzen.Inventory.Domain.Entities;

namespace Profitzen.Inventory.Infrastructure;

public class InventoryDbContext : DbContext
{
    public InventoryDbContext(DbContextOptions<InventoryDbContext> options) : base(options)
    {
    }

    public DbSet<StoreInventory> StoreInventories { get; set; }
    public DbSet<InventoryMovement> InventoryMovements { get; set; }
    public DbSet<InventoryAdjustment> InventoryAdjustments { get; set; }
    public DbSet<Supplier> Suppliers { get; set; }
    public DbSet<Purchase> Purchases { get; set; }
    public DbSet<PurchaseDetail> PurchaseDetails { get; set; }
    public DbSet<DocumentSeries> DocumentSeries { get; set; }

    public DbSet<Transfer> Transfers { get; set; }
    public DbSet<TransferDetail> TransferDetails { get; set; }

    // We need Store entity in this context to query names IF it is shared or replicated.
    // In this monolithic demo, Store is in Inventory or Configuration?
    // Store is defined in Inventory.Domain.Entities? No, it's usually in Configuration.
    // BUT StoreInventory has a StoreId.
    // If Store entity is NOT in Inventory.Domain, we cannot add DbSet here using that type.
    // Let's check Domain Entities.
    
    // public DbSet<Store> Stores { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.HasDefaultSchema("inventory");

        // StoreInventory Configuration
        modelBuilder.Entity<StoreInventory>(entity =>
        {
            entity.HasKey(e => e.Id);

            entity.HasIndex(e => new { e.ProductId, e.StoreId }).IsUnique();
            entity.HasIndex(e => e.StoreId);

            entity.HasMany(e => e.Movements)
                  .WithOne(m => m.StoreInventory)
                  .HasForeignKey(m => m.StoreInventoryId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        // InventoryMovement Configuration
        modelBuilder.Entity<InventoryMovement>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Reason).HasMaxLength(500).IsRequired();

            entity.HasIndex(e => e.StoreInventoryId);
            entity.HasIndex(e => e.MovementDate);
            entity.HasIndex(e => e.Type);
        });

        // InventoryAdjustment Configuration
        modelBuilder.Entity<InventoryAdjustment>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.AdjustmentType).HasMaxLength(50).IsRequired();
            entity.Property(e => e.Reason).HasMaxLength(1000).IsRequired();

            entity.HasIndex(e => e.StoreInventoryId);
            entity.HasIndex(e => e.AdjustmentDate);
            entity.HasIndex(e => e.AdjustmentType);
            entity.HasIndex(e => e.UserId);

            entity.HasOne(e => e.StoreInventory)
                  .WithMany()
                  .HasForeignKey(e => e.StoreInventoryId)
                  .OnDelete(DeleteBehavior.Restrict);
        });

        // Supplier Configuration
        modelBuilder.Entity<Supplier>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Code).HasMaxLength(50).IsRequired();
            entity.Property(e => e.Name).HasMaxLength(200).IsRequired();
            entity.Property(e => e.ContactName).HasMaxLength(200);
            entity.Property(e => e.Phone).HasMaxLength(50);
            entity.Property(e => e.Email).HasMaxLength(100);
            entity.Property(e => e.Address).HasMaxLength(500);
            entity.Property(e => e.TaxId).HasMaxLength(50);
            entity.Property(e => e.TenantId).HasMaxLength(450).IsRequired();

            entity.HasIndex(e => new { e.Code, e.TenantId }).IsUnique();
            entity.HasIndex(e => e.TenantId);
            entity.HasIndex(e => e.IsActive);
        });

        // Purchase Configuration
        modelBuilder.Entity<Purchase>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.PurchaseNumber).HasMaxLength(50).IsRequired();
            entity.Property(e => e.InvoiceNumber).HasMaxLength(100);
            entity.Property(e => e.Notes).HasMaxLength(1000);
            entity.Property(e => e.TotalAmount).HasPrecision(18, 2);

            entity.HasIndex(e => e.PurchaseNumber).IsUnique();
            entity.HasIndex(e => e.SupplierId);
            entity.HasIndex(e => e.StoreId);
            entity.HasIndex(e => e.PurchaseDate);

            entity.HasOne(e => e.Supplier)
                  .WithMany(s => s.Purchases)
                  .HasForeignKey(e => e.SupplierId)
                  .OnDelete(DeleteBehavior.Restrict);

            entity.HasMany(e => e.Details)
                  .WithOne(d => d.Purchase)
                  .HasForeignKey(d => d.PurchaseId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        // PurchaseDetail Configuration
        modelBuilder.Entity<PurchaseDetail>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Quantity).HasPrecision(18, 6);
            entity.Property(e => e.UnitPrice).HasPrecision(18, 2);
            entity.Property(e => e.Subtotal).HasPrecision(18, 2);
            entity.Property(e => e.BonusQuantity).HasPrecision(18, 6);

            entity.HasIndex(e => e.PurchaseId);
            entity.HasIndex(e => e.ProductId);
            entity.HasIndex(e => e.UOMId);
        });
        
        // Transfer Configuration
        modelBuilder.Entity<Transfer>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.TransferNumber).HasMaxLength(50).IsRequired();
            entity.Property(e => e.Notes).HasMaxLength(1000);
            
            entity.HasIndex(e => e.TransferNumber).IsUnique();
            entity.HasIndex(e => e.OriginStoreId);
            entity.HasIndex(e => e.DestinationStoreId);
            entity.HasIndex(e => e.Status);
            entity.HasIndex(e => e.TenantId);
            
            entity.HasMany(e => e.Details)
                  .WithOne(d => d.Transfer)
                  .HasForeignKey(d => d.TransferId)
                  .OnDelete(DeleteBehavior.Cascade);
        });
        
        // TransferDetail Configuration
        modelBuilder.Entity<TransferDetail>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Quantity).HasPrecision(18, 6);
            
            entity.HasIndex(e => e.TransferId);
            entity.HasIndex(e => e.ProductId);
        });

        // DocumentSeries Configuration
        modelBuilder.Entity<DocumentSeries>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.SeriesCode).HasMaxLength(4).IsRequired();
            entity.Property(e => e.DocumentType).HasMaxLength(2).IsRequired();
            entity.Property(e => e.DocumentTypeName).HasMaxLength(50).IsRequired();
            entity.Property(e => e.TenantId).HasMaxLength(450).IsRequired();

            entity.HasIndex(e => new { e.SeriesCode, e.TenantId }).IsUnique();
            entity.HasIndex(e => e.StoreId);
            entity.HasIndex(e => new { e.TenantId, e.DocumentType });
            entity.HasIndex(e => e.IsDefault);
            entity.HasIndex(e => e.IsActive);
        });

        base.OnModelCreating(modelBuilder);
    }
}