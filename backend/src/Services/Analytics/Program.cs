using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Profitzen.Analytics.Application.Services;
using Profitzen.Analytics.Infrastructure;
using Profitzen.Common.Extensions;
using Microsoft.SemanticKernel;
using Microsoft.Extensions.AI;
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
    Log.Information("Starting Analytics service");

var builder = WebApplication.CreateBuilder(args);

builder.Host.UseSerilog();

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var connectionString = builder.Configuration.GetConnectionString("DefaultConnection")
    ?? throw new InvalidOperationException("Connection string 'DefaultConnection' not found.");

builder.Services.AddDbContext<AnalyticsDbContext>(options =>
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

// AI - Semantic Kernel with Groq (OpenAI Compatible)
var aiUrl = builder.Configuration["AI:GroqUrl"] ?? "https://api.groq.com/openai/v1";
var aiModel = builder.Configuration["AI:Model"] ?? "llama-3.3-70b-versatile";
var aiApiKey = builder.Configuration["AI:ApiKey"];

#pragma warning disable SKEXP0010, SKEXP0070
if (!string.IsNullOrEmpty(aiApiKey))
{
    Log.Information("Registering Groq with Semantic Kernel. Model: {Model} at {Url}", aiModel, aiUrl);
    builder.Services.AddOpenAIChatCompletion(
        modelId: aiModel,
        apiKey: aiApiKey,
        endpoint: new Uri(aiUrl)
    );
}
else
{
    Log.Warning("AI ApiKey is missing. AI features will be disabled or fail.");
}
#pragma warning restore SKEXP0010, SKEXP0070

// IChatClient for other components
builder.Services.AddSingleton<Microsoft.Extensions.AI.IChatClient>(sp =>
{
    if (string.IsNullOrEmpty(aiApiKey))
    {
        return Microsoft.Extensions.AI.ChatClient.Create(new()); // Null client effectively
    }

    return new OpenAI.Chat.ChatClient(aiModel, new System.ClientModel.ApiKeyCredential(aiApiKey), new OpenAI.OpenAIClientOptions 
    { 
        Endpoint = new Uri(aiUrl) 
    })
    .AsChatClient();
});

builder.Services.AddKernel();

builder.Services.AddScoped<IAnalyticsService, AnalyticsService>();
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

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

using (var scope = app.Services.CreateScope())
{
    var context = scope.ServiceProvider.GetRequiredService<AnalyticsDbContext>();

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
    Log.Fatal(ex, "Analytics service terminated unexpectedly");
}
finally
{
    Log.CloseAndFlush();
}
