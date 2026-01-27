using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using Ocelot.DependencyInjection;
using Ocelot.Middleware;
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
    Log.Information("Starting ApiGateway");

var builder = WebApplication.CreateBuilder(args);

builder.Host.UseSerilog();

builder.Configuration.AddJsonFile($"ocelot.{builder.Environment.EnvironmentName}.json", optional: false, reloadOnChange: true);

var jwtSecret = builder.Configuration["JWT_SECRET"] ?? "default-super-secret-key-for-development-only-not-for-production";
var jwtIssuer = builder.Configuration["JWT_ISSUER"] ?? "Profitzen.Identity";
var jwtAudience = builder.Configuration["JWT_AUDIENCE"] ?? "Profitzen.Api";

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer("Bearer", options =>
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

builder.Services.AddCors(options =>
{
    options.AddPolicy("Development", policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

builder.Services.AddOcelot();

var app = builder.Build();

if (app.Environment.IsDevelopment() || app.Environment.EnvironmentName == "Demo")
{
    app.UseCors("Development");
}

app.UseAuthentication();

// Health check endpoint (bypasses Ocelot for monitoring)
if (app.Environment.IsDevelopment())
{
    app.Use(async (context, next) =>
    {
        if (context.Request.Path == "/health" && context.Request.Method == "GET")
        {
            context.Response.ContentType = "application/json";
            await context.Response.WriteAsync(System.Text.Json.JsonSerializer.Serialize(new
            {
                service = "API Gateway",
                status = "healthy",
                timestamp = DateTime.UtcNow,
                version = "1.0.0",
                environment = "Development"
            }));
            return;
        }
        await next();
    });
}

await app.UseOcelot();

app.Run();
}
catch (Exception ex)
{
    Log.Fatal(ex, "ApiGateway terminated unexpectedly");
}
finally
{
    Log.CloseAndFlush();
}