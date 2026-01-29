using Microsoft.EntityFrameworkCore;
using Profitzen.Product.Domain.Entities;

namespace Profitzen.Product.Infrastructure;

public class ProductDbContext : DbContext
{
    public ProductDbContext(DbContextOptions<ProductDbContext> options) : base(options)
    {
    }

    public DbSet<Product.Domain.Entities.Product> Products => Set<Product.Domain.Entities.Product>();
    public DbSet<Category> Categories => Set<Category>();
    public DbSet<ProductUOMConversion> ProductUOMConversions => Set<ProductUOMConversion>();
    public DbSet<ProductPurchaseUOM> ProductPurchaseUOMs => Set<ProductPurchaseUOM>();
    public DbSet<ProductSaleUOM> ProductSaleUOMs => Set<ProductSaleUOM>();
    public DbSet<PriceList> PriceLists => Set<PriceList>();
    public DbSet<ProductSaleUOMPrice> ProductSaleUOMPrices => Set<ProductSaleUOMPrice>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.HasDefaultSchema("product");

        modelBuilder.Entity<Product.Domain.Entities.Product>(entity =>
        {
            entity.ToTable("products");
            entity.HasKey(e => e.Id);

            entity.Property(e => e.Code).IsRequired().HasMaxLength(50);
            entity.Property(e => e.Barcode).HasMaxLength(50);
            entity.Property(e => e.Name).IsRequired().HasMaxLength(200);
            entity.Property(e => e.Description).HasMaxLength(1000);
            entity.Property(e => e.PurchasePrice).HasPrecision(18, 2);
            entity.Property(e => e.SalePrice).HasPrecision(18, 2);
            entity.Property(e => e.WholesalePrice).HasPrecision(18, 2);
            entity.Property(e => e.TenantId).IsRequired().HasMaxLength(100);
            entity.Property(e => e.PurchaseConversionMethod).HasMaxLength(20).IsRequired().HasDefaultValue("base");

            entity.HasMany(e => e.UOMConversions)
                  .WithOne(c => c.Product)
                  .HasForeignKey(c => c.ProductId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.HasMany(e => e.PurchaseUOMs)
                  .WithOne(p => p.Product)
                  .HasForeignKey(p => p.ProductId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.HasMany(e => e.SaleUOMs)
                  .WithOne(s => s.Product)
                  .HasForeignKey(s => s.ProductId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.HasIndex(e => new { e.Code, e.TenantId }).IsUnique();
            entity.HasIndex(e => e.Barcode);
            entity.HasIndex(e => e.TenantId);
            entity.HasIndex(e => e.CategoryId);
        });

        modelBuilder.Entity<Category>(entity =>
        {
            entity.ToTable("categories");
            entity.HasKey(e => e.Id);

            entity.Property(e => e.Name).IsRequired().HasMaxLength(100);
            entity.Property(e => e.Description).HasMaxLength(500);
            entity.Property(e => e.TenantId).IsRequired().HasMaxLength(100);

            entity.HasIndex(e => new { e.Name, e.TenantId }).IsUnique();
            entity.HasIndex(e => e.TenantId);
        });

        modelBuilder.Entity<ProductUOMConversion>(entity =>
        {
            entity.ToTable("product_uom_conversions");
            entity.HasKey(e => e.Id);

            entity.Property(e => e.ConversionFactor).HasPrecision(18, 6);

            entity.HasOne(e => e.Product)
                  .WithMany(p => p.UOMConversions)
                  .HasForeignKey(e => e.ProductId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.HasIndex(e => new { e.ProductId, e.FromUOMId, e.ToUOMId }).IsUnique();
            entity.HasIndex(e => e.ProductId);
        });

        modelBuilder.Entity<ProductPurchaseUOM>(entity =>
        {
            entity.ToTable("product_purchase_uoms");
            entity.HasKey(e => e.Id);

            entity.Property(e => e.ConversionToBase).HasPrecision(18, 6).IsRequired();

            entity.HasOne(e => e.Product)
                  .WithMany(p => p.PurchaseUOMs)
                  .HasForeignKey(e => e.ProductId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.HasIndex(e => new { e.ProductId, e.UOMId }).IsUnique();
            entity.HasIndex(e => e.ProductId);
            entity.HasIndex(e => e.IsDefault);
            entity.HasIndex(e => e.IsActive);
        });

        modelBuilder.Entity<ProductSaleUOM>(entity =>
        {
            entity.ToTable("product_sale_uoms");
            entity.HasKey(e => e.Id);

            entity.Property(e => e.ConversionToBase).HasPrecision(18, 6).IsRequired();
            entity.Property(e => e.Price).HasPrecision(18, 2).IsRequired();

            entity.HasOne(e => e.Product)
                  .WithMany(p => p.SaleUOMs)
                  .HasForeignKey(e => e.ProductId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.HasIndex(e => new { e.ProductId, e.UOMId }).IsUnique();
            entity.HasIndex(e => e.ProductId);
            entity.HasIndex(e => e.IsDefault);
            entity.HasIndex(e => e.IsActive);

            entity.HasMany(e => e.Prices)
                  .WithOne(p => p.ProductSaleUOM)
                  .HasForeignKey(p => p.ProductSaleUOMId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<PriceList>(entity =>
        {
            entity.ToTable("price_lists");
            entity.HasKey(e => e.Id);

            entity.Property(e => e.Name).IsRequired().HasMaxLength(100);
            entity.Property(e => e.Code).IsRequired().HasMaxLength(50);
            entity.Property(e => e.Description).HasMaxLength(500);
            entity.Property(e => e.TenantId).IsRequired().HasMaxLength(100);

            entity.HasMany(e => e.ProductPrices)
                  .WithOne(p => p.PriceList)
                  .HasForeignKey(p => p.PriceListId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.HasIndex(e => new { e.Code, e.TenantId }).IsUnique();
            entity.HasIndex(e => e.TenantId);
            entity.HasIndex(e => e.IsDefault);
            entity.HasIndex(e => e.IsActive);
        });

        modelBuilder.Entity<ProductSaleUOMPrice>(entity =>
        {
            entity.ToTable("product_sale_uom_prices");
            entity.HasKey(e => e.Id);

            entity.Property(e => e.Price).HasPrecision(18, 2).IsRequired();

            entity.HasOne(e => e.ProductSaleUOM)
                  .WithMany(p => p.Prices)
                  .HasForeignKey(e => e.ProductSaleUOMId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.PriceList)
                  .WithMany(p => p.ProductPrices)
                  .HasForeignKey(e => e.PriceListId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.HasIndex(e => new { e.ProductSaleUOMId, e.PriceListId }).IsUnique();
            entity.HasIndex(e => e.ProductSaleUOMId);
            entity.HasIndex(e => e.PriceListId);
        });

        base.OnModelCreating(modelBuilder);
    }
}
