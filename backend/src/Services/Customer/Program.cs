using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Profitzen.Customer.Application.Services;
using Profitzen.Customer.Infrastructure;
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
    Log.Information("Starting Customer service");

var builder = WebApplication.CreateBuilder(args);

builder.Host.UseSerilog();

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var connectionString = builder.Configuration.GetConnectionString("DefaultConnection")
    ?? throw new InvalidOperationException("Connection string 'DefaultConnection' not found.");

builder.Services.AddDbContext<CustomerDbContext>(options =>
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

builder.Services.AddScoped<ICustomerService, CustomerService>();
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
    var context = scope.ServiceProvider.GetRequiredService<CustomerDbContext>();

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
    Log.Fatal(ex, "Customer service terminated unexpectedly");
}
finally
{
    Log.CloseAndFlush();
}

static async Task SeedDataAsync(CustomerDbContext context)
{
    if (!context.Customers.Any())
    {
        var tenant1Id = "user-hermano1-id";
        var tenant2Id = "user-hermano2-id";

        var customers = new[]
        {
            new Profitzen.Customer.Domain.Entities.Customer(
                tenant1Id,
                Profitzen.Customer.Domain.Enums.DocumentType.DNI,
                "12345678",
                "Juan",
                "Pérez García",
                "juan.perez@email.com",
                "987654321",
                "Av. Principal 123, Lima",
                1000m
            ),
            new Profitzen.Customer.Domain.Entities.Customer(
                tenant1Id,
                Profitzen.Customer.Domain.Enums.DocumentType.RUC,
                "20123456789",
                "María",
                "López Torres",
                "maria.lopez@email.com",
                "987654322",
                "Jr. Comercio 456, Lima",
                2000m
            ),
            new Profitzen.Customer.Domain.Entities.Customer(
                tenant2Id,
                Profitzen.Customer.Domain.Enums.DocumentType.DNI,
                "87654321",
                "Carlos",
                "Rodríguez Sánchez",
                null,
                "987654323",
                "Calle Los Olivos 789, Lima",
                500m
            )
        };

        context.Customers.AddRange(customers);
        await context.SaveChangesAsync();
    }
}
