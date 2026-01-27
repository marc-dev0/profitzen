using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using Profitzen.Configuration.Infrastructure;
using Profitzen.Configuration.Application.Services;
using Profitzen.Common.Extensions;
using Serilog;

Log.Logger = new LoggerConfiguration()
    .ReadFrom.Configuration(new ConfigurationBuilder()
        .AddJsonFile("appsettings.json")
        .AddJsonFile($"appsettings.{Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") ?? "Production"}.json", optional: true)
        .Build())
    .CreateLogger();

try
{
    Log.Information("Starting Configuration service");

var builder = WebApplication.CreateBuilder(args);

builder.Host.UseSerilog();

// Configure form options for file uploads
builder.Services.Configure<Microsoft.AspNetCore.Http.Features.FormOptions>(options =>
{
    options.MultipartBodyLengthLimit = 10 * 1024 * 1024; // 10MB
});

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var connectionString = builder.Configuration.GetConnectionString("DefaultConnection")
    ?? throw new InvalidOperationException("Connection string 'DefaultConnection' not found.");

builder.Services.AddDbContext<ConfigurationDbContext>(options =>
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
builder.Services.AddScoped<IConfigurationService, ConfigurationService>();
builder.Services.AddScoped<IMasterDataService, MasterDataService>();

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
app.Logger.LogInformation($"Is Development: {app.Environment.IsDevelopment()}");

if (app.Environment.IsDevelopment() || app.Environment.IsEnvironment("Demo"))
{
    app.UseSwagger();
    app.UseSwaggerUI();
    app.UseCors("Development");
}

// Configure static files to serve uploaded logos from absolute path
var uploadBasePath = builder.Configuration["FileStorage:UploadPath"] 
    ?? Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.CommonApplicationData), "Profitzen", "uploads");

if (!Directory.Exists(uploadBasePath))
{
    Directory.CreateDirectory(uploadBasePath);
}

app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = new Microsoft.Extensions.FileProviders.PhysicalFileProvider(uploadBasePath),
    RequestPath = "/uploads",
    OnPrepareResponse = ctx =>
    {
        ctx.Context.Response.Headers.Append("Access-Control-Allow-Origin", "*");
        ctx.Context.Response.Headers.Append("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    }
});

app.UseServiceAuth();
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

using (var scope = app.Services.CreateScope())
{
    var context = scope.ServiceProvider.GetRequiredService<ConfigurationDbContext>();

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
    Log.Fatal(ex, "Configuration service terminated unexpectedly");
}
finally
{
    Log.CloseAndFlush();
}
