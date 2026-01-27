using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Profitzen.Product.Application.Services;
using Profitzen.Product.Infrastructure;
using Profitzen.Common.Extensions;
using Profitzen.Common.Services;
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
    Log.Information("Starting Product service");

var builder = WebApplication.CreateBuilder(args);

builder.Host.UseSerilog();

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var connectionString = builder.Configuration.GetConnectionString("DefaultConnection")
    ?? throw new InvalidOperationException("Connection string 'DefaultConnection' not found.");

builder.Services.AddDbContext<ProductDbContext>(options =>
    options.UseNpgsql(connectionString));

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

builder.Services.AddSingleton<IMasterDataCacheService, MasterDataCacheService>();
builder.Services.AddScoped<IProductService, ProductService>();
builder.Services.AddScoped<IDataEnrichmentService, DataEnrichmentService>();
builder.Services.AddScoped<IPriceListService, PriceListService>();
builder.Services.AddScoped<ITenantInitializationService, TenantInitializationService>();
builder.Services.AddHttpClient();
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

app.Logger.LogInformation($"Environment: {app.Environment.EnvironmentName}");

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
    var context = scope.ServiceProvider.GetRequiredService<ProductDbContext>();

    try
    {
        await context.Database.MigrateAsync();
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
    Log.Fatal(ex, "Product service terminated unexpectedly");
}
finally
{
    Log.CloseAndFlush();
}
