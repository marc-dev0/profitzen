using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Profitzen.Common.Extensions;
using Profitzen.Sales.Application.Services;
using Profitzen.Sales.Domain.Entities;
using Profitzen.Sales.Infrastructure;
using Profitzen.Sales.Middleware;
using QuestPDF.Infrastructure;
using Serilog;
using System.Text;

Log.Logger = new LoggerConfiguration()
    .ReadFrom.Configuration(new ConfigurationBuilder()
        .AddJsonFile("appsettings.json")
        .AddJsonFile($"appsettings.{Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") ?? "Production"}.json", optional: true)
        .Build())
    .CreateLogger();

try
{
    Log.Information("Starting Sales service");
    QuestPDF.Settings.License = LicenseType.Community;

var builder = WebApplication.CreateBuilder(args);

builder.Host.UseSerilog();

builder.Services.AddControllers()
    .AddJsonOptions(options => 
    {
        options.JsonSerializerOptions.Converters.Add(new System.Text.Json.Serialization.JsonStringEnumConverter());
        options.JsonSerializerOptions.ReferenceHandler = System.Text.Json.Serialization.ReferenceHandler.IgnoreCycles;
    });
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var connectionString = builder.Configuration.GetConnectionString("DefaultConnection")
    ?? throw new InvalidOperationException("Connection string 'DefaultConnection' not found.");

builder.Services.AddDbContext<SalesDbContext>(options =>
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
builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<ISalesService, SalesService>();
builder.Services.AddScoped<IExpenseService, ExpenseService>();
builder.Services.AddScoped<IInventoryClient, InventoryClient>();
builder.Services.AddScoped<ICustomerClient, CustomerClient>();
builder.Services.AddScoped<ICashShiftService, CashShiftService>();
builder.Services.AddHttpClient<IConfigurationClient, ConfigurationClient>();
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

app.UseMiddleware<GlobalExceptionHandler>();

app.Logger.LogInformation($"Environment: {app.Environment.EnvironmentName}");

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
    var context = scope.ServiceProvider.GetRequiredService<SalesDbContext>();

    try
    {
        await context.Database.MigrateAsync();
        await SeedDataAsync(context);
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
    Log.Fatal(ex, "Sales service terminated unexpectedly");
}
finally
{
    Log.CloseAndFlush();
}

static async Task SeedDataAsync(SalesDbContext context)
{
    if (!context.Customers.Any())
    {
        // Get store IDs from Identity service data
        var store1Id = Guid.Parse("11111111-1111-1111-1111-111111111111"); // Mock store 1
        var store2Id = Guid.Parse("22222222-2222-2222-2222-222222222222"); // Mock store 2

        var customers = new[]
        {
            new Customer("DEMO", "12345678", "Juan Pérez", store1Id, "juan@email.com", "987654321", "Av. Principal 123", 500),
            new Customer("DEMO", "87654321", "María García", store1Id, "maria@email.com", "987654322", "Jr. Comercio 456", 300),
            new Customer("DEMO", "11223344", "Carlos López", store2Id, "carlos@email.com", "987654323", "Av. Central 789", 1000),
            new Customer("DEMO", "44332211", "Ana Torres", store2Id, "ana@email.com", "987654324", "Jr. Lima 321", 200)
        };

        context.Customers.AddRange(customers);
        await context.SaveChangesAsync();
    }
}