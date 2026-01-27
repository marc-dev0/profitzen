using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using Profitzen.Identity.Domain.Entities;
using Profitzen.Identity.Domain.Enums;

namespace Profitzen.Identity.Infrastructure;

public class IdentityDbContext : IdentityDbContext<User, IdentityRole<Guid>, Guid>
{
    public DbSet<Store> Stores { get; set; }
    public DbSet<Tenant> Tenants { get; set; }
    public DbSet<PasswordResetToken> PasswordResetTokens { get; set; }
    public DbSet<RoleModulePermission> RoleModulePermissions { get; set; }

    public IdentityDbContext(DbContextOptions<IdentityDbContext> options) : base(options)
    {
    }

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        builder.HasDefaultSchema("identity");

        builder.Entity<RoleModulePermission>(entity => {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Role).HasConversion<int>();
            entity.HasIndex(e => new { e.Role, e.Module }).IsUnique();
        });

        // Initial Seed for Default Permissions
        var defaultPermissions = new List<RoleModulePermission>();
        
        // Admin
        var adminModules = new[] { "dashboard", "pos", "sales", "products", "inventory", "purchases", "suppliers", "customers", "stores", "users", "settings", "analytics" };
        foreach (var m in adminModules) defaultPermissions.Add(new RoleModulePermission { Id = Guid.NewGuid(), Role = UserRole.Admin, Module = m });

        // Manager
        var managerModules = new[] { "dashboard", "pos", "sales", "products", "inventory", "purchases", "suppliers", "customers", "stores", "analytics" };
        foreach (var m in managerModules) defaultPermissions.Add(new RoleModulePermission { Id = Guid.NewGuid(), Role = UserRole.Manager, Module = m });

         // Cashier
        var cashierModules = new[] { "pos", "customers" };
        foreach (var m in cashierModules) defaultPermissions.Add(new RoleModulePermission { Id = Guid.NewGuid(), Role = UserRole.Cashier, Module = m });

        // Logistics
        var logisticsModules = new[] { "products", "inventory", "purchases", "suppliers" };
        foreach (var m in logisticsModules) defaultPermissions.Add(new RoleModulePermission { Id = Guid.NewGuid(), Role = UserRole.Logistics, Module = m });

        builder.Entity<RoleModulePermission>().HasData(defaultPermissions);

        builder.Entity<Tenant>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.CompanyName).IsRequired().HasMaxLength(255);
            entity.Property(e => e.Plan).IsRequired().HasMaxLength(50);
            entity.HasIndex(e => e.CompanyName);
        });

        builder.Entity<Store>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Name).IsRequired().HasMaxLength(255);
            entity.Property(e => e.TenantId).IsRequired().HasMaxLength(450);
            entity.Property(e => e.Address).IsRequired().HasMaxLength(500);
            entity.Property(e => e.Phone).HasMaxLength(20);
            entity.Property(e => e.Email).HasMaxLength(255);
            entity.HasIndex(e => e.TenantId);

            entity.HasMany(s => s.Users)
                .WithMany(u => u.Stores)
                .UsingEntity(j => j.ToTable("UserStores"));
        });

        builder.Entity<User>(entity =>
        {
            entity.Property(e => e.TenantId).IsRequired().HasMaxLength(450);
            entity.Property(e => e.FirstName).IsRequired().HasMaxLength(100);
            entity.Property(e => e.LastName).IsRequired().HasMaxLength(100);
            entity.Property(e => e.Phone).HasMaxLength(20);
            entity.Property(e => e.Role).HasConversion<int>();
            entity.HasIndex(e => new { e.Email, e.TenantId }).IsUnique();

            entity.HasOne(u => u.Tenant)
                .WithMany()
                .HasForeignKey(u => u.TenantId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        builder.Entity<PasswordResetToken>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Token).IsRequired().HasMaxLength(500);
            entity.Property(e => e.ExpiresAt).IsRequired();
            entity.Property(e => e.IsUsed).IsRequired();
            entity.Property(e => e.CreatedAt).IsRequired();
            
            entity.HasOne(t => t.User)
                .WithMany()
                .HasForeignKey(t => t.UserId)
                .OnDelete(DeleteBehavior.Cascade);
                
            entity.HasIndex(e => e.Token);
            entity.HasIndex(e => new { e.UserId, e.IsUsed });
        });

        builder.Entity<PasswordResetToken>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Token).IsRequired().HasMaxLength(500);
            entity.Property(e => e.ExpiresAt).IsRequired();
            entity.Property(e => e.IsUsed).IsRequired();
            entity.Property(e => e.CreatedAt).IsRequired();
            
            entity.HasOne(t => t.User)
                .WithMany()
                .HasForeignKey(t => t.UserId)
                .OnDelete(DeleteBehavior.Cascade);
                
            entity.HasIndex(e => e.Token);
            entity.HasIndex(e => new { e.UserId, e.IsUsed });
        });

        builder.Entity<IdentityRole<Guid>>(entity =>
        {
            entity.ToTable("AspNetRoles", "identity");
        });

        builder.Entity<IdentityUserRole<Guid>>(entity =>
        {
            entity.ToTable("AspNetUserRoles", "identity");
        });

        builder.Entity<IdentityUserClaim<Guid>>(entity =>
        {
            entity.ToTable("AspNetUserClaims", "identity");
        });

        builder.Entity<IdentityUserLogin<Guid>>(entity =>
        {
            entity.ToTable("AspNetUserLogins", "identity");
        });

        builder.Entity<IdentityRoleClaim<Guid>>(entity =>
        {
            entity.ToTable("AspNetRoleClaims", "identity");
        });

        builder.Entity<IdentityUserToken<Guid>>(entity =>
        {
            entity.ToTable("AspNetUserTokens", "identity");
        });
    }
}