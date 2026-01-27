using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Profitzen.Inventory.Application.Services;
using Profitzen.Inventory.Infrastructure;
using Profitzen.Common.Services;
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
    Log.Information("Starting Inventory service");

var builder = WebApplication.CreateBuilder(args);

builder.Host.UseSerilog();

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var connectionString = builder.Configuration.GetConnectionString("DefaultConnection")
    ?? throw new InvalidOperationException("Connection string 'DefaultConnection' not found.");

builder.Services.AddDbContext<InventoryDbContext>(options =>
    options.UseNpgsql(connectionString));

var jwtSecret = builder.Configuration["JWT_SECRET"] ?? "default-super-secret-key-for-development-only-not-for-production";
var jwtIssuer = builder.Configuration["JWT_ISSUER"] ?? "Profitzen.Identity";
var jwtAudience = builder.Configuration["JWT_AUDIENCE"] ?? "Profitzen.Api";

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
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

builder.Services.AddHttpClient();
// TODO: Fix DI issue - MasterDataCacheService (Singleton) cannot consume ServiceHttpClient (Scoped)
// builder.Services.AddSingleton<IMasterDataCacheService, MasterDataCacheService>();
builder.Services.AddScoped<IInventoryService, InventoryService>();
builder.Services.AddAuthorization();
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

app.UseServiceAuth();
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

using (var scope = app.Services.CreateScope())
{
    var context = scope.ServiceProvider.GetRequiredService<InventoryDbContext>();

    try
    {
        await context.Database.MigrateAsync();
    }
    catch (Exception ex)
    {
        Log.Error(ex, "Error during database initialization");
    }
}

app.Run();
}
catch (Exception ex)
{
    Log.Fatal(ex, "Inventory service terminated unexpectedly");
}
finally
{
    Log.CloseAndFlush();
}