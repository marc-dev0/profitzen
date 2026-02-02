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
    public DbSet<AppModule> AppModules { get; set; }

    public IdentityDbContext(DbContextOptions<IdentityDbContext> options) : base(options)
    {
    }

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        builder.HasDefaultSchema("identity");

        builder.Entity<AppModule>(entity => {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.Code).IsUnique();
            entity.HasOne(e => e.Parent)
                  .WithMany(e => e.Children)
                  .HasForeignKey(e => e.ParentId)
                  .OnDelete(DeleteBehavior.Restrict);
        });

        builder.Entity<RoleModulePermission>(entity => {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Role).HasConversion<int>();
            entity.HasIndex(e => new { e.Role, e.Module }).IsUnique();
        });

        // Seed App Modules
        var modules = new List<AppModule>();
        
        // --- GRUPO: PRINCIPAL ---
        var dashId = Guid.NewGuid();
        modules.Add(new AppModule { Id = dashId, Code = "dashboard", Name = "Dashboard", Route = "/dashboard", Icon = "LayoutDashboard", SortOrder = 1, GroupName = "PRINCIPAL" });
        
        var posId = Guid.NewGuid();
        modules.Add(new AppModule { Id = posId, Code = "pos", Name = "Punto de Venta", Route = "/pos", Icon = "ShoppingCart", SortOrder = 2, GroupName = "PRINCIPAL" });

        // --- GRUPO: VENTAS ---
        var salesParentId = Guid.NewGuid();
        modules.Add(new AppModule { Id = salesParentId, Code = "sales_parent", Name = "Ventas", Icon = "FileText", SortOrder = 3, GroupName = "VENTAS" });
        
        modules.Add(new AppModule { Id = Guid.NewGuid(), ParentId = salesParentId, Code = "sales", Name = "Historial", Route = "/sales", SortOrder = 1 });
        modules.Add(new AppModule { Id = Guid.NewGuid(), ParentId = salesParentId, Code = "customers", Name = "Clientes", Route = "/customers", Icon = "Users", SortOrder = 2 });

        // --- GRUPO: INTELIGENCIA ---
        var intelParentId = Guid.NewGuid();
        modules.Add(new AppModule { Id = intelParentId, Code = "intelligence_parent", Name = "Inteligencia", Icon = "BarChart3", SortOrder = 4, GroupName = "INTELIGENCIA" });
        
        modules.Add(new AppModule { Id = Guid.NewGuid(), ParentId = intelParentId, Code = "analytics", Name = "Centro Analítico", Route = "/analytics", SortOrder = 1 });
        modules.Add(new AppModule { Id = Guid.NewGuid(), ParentId = intelParentId, Code = "analytics_ia", Name = "Analizador IA", Route = "/analytics/ia", Icon = "BrainCircuit", SortOrder = 2 });
        modules.Add(new AppModule { Id = Guid.NewGuid(), ParentId = intelParentId, Code = "analytics_ia_history", Name = "Bitácora de IA", Route = "/analytics/ia/vigilante/history", Icon = "Clock", SortOrder = 3 });

        // --- GRUPO: OPERACIONES ---
        var opParentId = Guid.NewGuid();
        modules.Add(new AppModule { Id = opParentId, Code = "operations_parent", Name = "Operaciones", Icon = "Package", SortOrder = 5, GroupName = "OPERACIONES" });
        
        modules.Add(new AppModule { Id = Guid.NewGuid(), ParentId = opParentId, Code = "products", Name = "Productos", Route = "/products", Icon = "Tags", SortOrder = 1 });
        modules.Add(new AppModule { Id = Guid.NewGuid(), ParentId = opParentId, Code = "inventory", Name = "Inventario", Route = "/inventory", Icon = "Package", SortOrder = 2 });
        modules.Add(new AppModule { Id = Guid.NewGuid(), ParentId = opParentId, Code = "purchases", Name = "Compras", Route = "/purchases", Icon = "CreditCard", SortOrder = 3 });
        modules.Add(new AppModule { Id = Guid.NewGuid(), ParentId = opParentId, Code = "suppliers", Name = "Proveedores", Route = "/suppliers", Icon = "Truck", SortOrder = 4 });

        var storesId = Guid.NewGuid();
        modules.Add(new AppModule { Id = storesId, Code = "stores", Name = "Sucursales", Route = "/stores", Icon = "Store", SortOrder = 6, GroupName = "PRINCIPAL" });

        // --- GRUPO: CONFIGURACIÓN ---
        var settingsId = Guid.NewGuid();
        modules.Add(new AppModule { Id = settingsId, Code = "settings", Name = "Mi Empresa", Route = "/settings", Icon = "Store", SortOrder = 1, GroupName = "CONFIGURACION" });
        
        var usersId = Guid.NewGuid();
        modules.Add(new AppModule { Id = usersId, Code = "users", Name = "Usuarios y Roles", Route = "/users", Icon = "UserCog", SortOrder = 2, GroupName = "CONFIGURACION" });

        builder.Entity<AppModule>().HasData(modules);

        // Initial Seed for Default Permissions
        var defaultPermissions = new List<RoleModulePermission>();
        
        // All Codes for Admin
        var adminCodes = modules.Select(m => m.Code).ToList();
        foreach (var code in adminCodes) defaultPermissions.Add(new RoleModulePermission { Id = Guid.NewGuid(), Role = UserRole.Admin, Module = code });

        // Select for Manager
        var managerCodes = modules.Where(m => m.GroupName != "CONFIGURACION" || m.Code == "stores").Select(m => m.Code).ToList();
        foreach (var code in managerCodes) defaultPermissions.Add(new RoleModulePermission { Id = Guid.NewGuid(), Role = UserRole.Manager, Module = code });

        // Cashier
        var cashierCodes = new[] { "pos", "customers" };
        foreach (var code in cashierCodes) defaultPermissions.Add(new RoleModulePermission { Id = Guid.NewGuid(), Role = UserRole.Cashier, Module = code });

        // Logistics
        var logisticsCodes = new[] { "products", "inventory", "purchases", "suppliers", "operations_parent" };
        foreach (var code in logisticsCodes) defaultPermissions.Add(new RoleModulePermission { Id = Guid.NewGuid(), Role = UserRole.Logistics, Module = code });

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