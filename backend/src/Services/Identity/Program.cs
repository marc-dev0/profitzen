using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Profitzen.Identity.Application.Services;
using Profitzen.Identity.Application.Services.Seeding;
using Profitzen.Identity.Domain.Entities;
using Profitzen.Identity.Domain.Enums;
using Profitzen.Identity.Infrastructure;
using Profitzen.Common.Extensions;
using System.Text;
using Serilog;

Log.Logger = new LoggerConfiguration()
    .ReadFrom.Configuration(new ConfigurationBuilder()
        .AddJsonFile("appsettings.json")
        .AddJsonFile($"appsettings.{Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") ?? "Production"}.json", optional: true)
        .Build())
    .CreateLogger();

try
{
    Log.Information("Starting Identity service");

var builder = WebApplication.CreateBuilder(args);

builder.Host.UseSerilog();

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var connectionString = builder.Configuration.GetConnectionString("DefaultConnection")
    ?? throw new InvalidOperationException("Connection string 'DefaultConnection' not found.");

builder.Services.AddDbContext<IdentityDbContext>(options =>
    options.UseNpgsql(connectionString));

builder.Services.AddIdentity<User, IdentityRole<Guid>>(options =>
{
    options.Password.RequireDigit = false;
    options.Password.RequireLowercase = false;
    options.Password.RequireUppercase = false;
    options.Password.RequireNonAlphanumeric = false;
    options.Password.RequiredLength = 6;
    options.User.RequireUniqueEmail = true;
})
.AddEntityFrameworkStores<IdentityDbContext>()
.AddDefaultTokenProviders();

var jwtSecret = builder.Configuration["JWT_SECRET"] ?? "default-super-secret-key-for-development-only-not-for-production";
var jwtIssuer = builder.Configuration["JWT_ISSUER"] ?? "Profitzen.Identity";
var jwtAudience = builder.Configuration["JWT_AUDIENCE"] ?? "Profitzen.Api";

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = jwtIssuer,
        ValidAudience = jwtAudience,
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret)),
        ClockSkew = TimeSpan.Zero
    };
});

builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IStoreService, StoreService>();
builder.Services.AddScoped<IUserManagementService, UserManagementService>();
builder.Services.AddScoped<IDemoDataSeeder, DemoDataSeeder>();
builder.Services.AddHttpClient();
builder.Services.AddServiceAuth();

builder.Services.AddCors(options =>
{
    options.AddPolicy("Development", policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

var app = builder.Build();

// Log environment for debugging
app.Logger.LogInformation($"Environment: {app.Environment.EnvironmentName}");
app.Logger.LogInformation($"Is Development: {app.Environment.IsDevelopment()}");

if (app.Environment.IsDevelopment() || app.Environment.IsEnvironment("Demo"))
{
    app.UseSwagger();
    app.UseSwaggerUI();
    app.UseCors("Development");
}

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

using (var scope = app.Services.CreateScope())
{
    var context = scope.ServiceProvider.GetRequiredService<IdentityDbContext>();

    try
    {
        await context.Database.MigrateAsync();
        var seeder = scope.ServiceProvider.GetRequiredService<IDemoDataSeeder>();
        await seeder.SeedPermissionsAsync();
    }
    catch (Exception ex)
    {
        Log.Error(ex, "Error during database migration");
    }
}

app.Run();
}
catch (Exception ex)
{
    Log.Fatal(ex, "Identity service terminated unexpectedly");
}
finally
{
    Log.CloseAndFlush();
}