using Microsoft.EntityFrameworkCore;
using Profitzen.Configuration.Domain.Entities;

namespace Profitzen.Configuration.Infrastructure;

public class ConfigurationDbContext : DbContext
{
    public ConfigurationDbContext(DbContextOptions<ConfigurationDbContext> options)
        : base(options)
    {
    }

    public DbSet<DocumentSeries> DocumentSeries { get; set; }
    public DbSet<MasterDataType> MasterDataTypes { get; set; }
    public DbSet<MasterDataValue> MasterDataValues { get; set; }
    public DbSet<CompanySettings> CompanySettings { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.HasDefaultSchema("master_data");

        modelBuilder.Entity<CompanySettings>(entity =>
        {
            entity.ToTable("CompanySettings", "config");
            entity.HasKey(e => e.Id);
            
            entity.Property(e => e.TenantId).IsRequired().HasMaxLength(50);
            entity.Property(e => e.CompanyName).IsRequired().HasMaxLength(200);
            entity.Property(e => e.TradeName).HasMaxLength(200);
            entity.Property(e => e.Ruc).IsRequired().HasMaxLength(20);
            entity.Property(e => e.Address).HasMaxLength(500);
            entity.Property(e => e.Phone).HasMaxLength(50);
            entity.Property(e => e.Email).HasMaxLength(100);
            entity.Property(e => e.Website).HasMaxLength(200);
            entity.Property(e => e.LogoUrl).HasMaxLength(500);
            entity.Property(e => e.TicketHeader).HasMaxLength(500);
            entity.Property(e => e.TicketFooter).HasMaxLength(500);
            
            entity.Property(e => e.TaxName).HasMaxLength(20);
            entity.Property(e => e.TaxRate).HasColumnType("decimal(5,4)");
            entity.Property(e => e.Currency).HasMaxLength(10);
            entity.Property(e => e.CurrencySymbol).HasMaxLength(5);

            entity.HasIndex(e => e.TenantId).IsUnique();
        });

        modelBuilder.Entity<DocumentSeries>(entity =>
        {
            entity.HasKey(e => e.Id);

            entity.Property(e => e.SeriesCode)
                .HasMaxLength(4)
                .IsRequired();

            entity.Property(e => e.DocumentType)
                .HasMaxLength(2)
                .IsRequired();

            entity.Property(e => e.DocumentTypeName)
                .HasMaxLength(100)
                .IsRequired();

            entity.Property(e => e.TenantId)
                .HasMaxLength(450)
                .IsRequired();

            entity.HasIndex(e => new { e.SeriesCode, e.TenantId })
                .IsUnique();

            entity.HasIndex(e => e.StoreId);

            entity.HasIndex(e => new { e.TenantId, e.DocumentType });

            entity.HasIndex(e => e.IsDefault);

            entity.HasIndex(e => e.IsActive);

            entity.HasQueryFilter(e => e.DeletedAt == null);
        });

        modelBuilder.Entity<MasterDataType>(entity =>
        {
            entity.HasKey(e => e.Id);

            entity.Property(e => e.Code)
                .HasMaxLength(50)
                .IsRequired();

            entity.Property(e => e.Name)
                .HasMaxLength(100)
                .IsRequired();

            entity.Property(e => e.Description)
                .HasMaxLength(500)
                .IsRequired();

            entity.HasIndex(e => e.Code)
                .IsUnique();

            entity.HasIndex(e => e.IsActive);

            entity.HasQueryFilter(e => e.DeletedAt == null);
        });

        modelBuilder.Entity<MasterDataValue>(entity =>
        {
            entity.HasKey(e => e.Id);

            entity.Property(e => e.TypeCode)
                .HasMaxLength(50)
                .IsRequired();

            entity.Property(e => e.Code)
                .HasMaxLength(50)
                .IsRequired();

            entity.Property(e => e.Name)
                .HasMaxLength(200)
                .IsRequired();

            entity.Property(e => e.Description)
                .HasMaxLength(500)
                .IsRequired();

            entity.Property(e => e.TenantId)
                .HasMaxLength(450)
                .IsRequired();

            entity.Property(e => e.Metadata)
                .HasColumnType("jsonb");

            entity.HasOne(e => e.Type)
                .WithMany()
                .HasForeignKey(e => e.TypeCode)
                .HasPrincipalKey(t => t.Code)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.Parent)
                .WithMany(p => p.Children)
                .HasForeignKey(e => e.ParentId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasIndex(e => new { e.TypeCode, e.Code, e.TenantId })
                .IsUnique();

            entity.HasIndex(e => e.TenantId);

            entity.HasIndex(e => e.ParentId);

            entity.HasIndex(e => e.IsActive);

            entity.HasIndex(e => e.DisplayOrder);

            entity.HasQueryFilter(e => e.DeletedAt == null);
        });

        base.OnModelCreating(modelBuilder);
    }
}
