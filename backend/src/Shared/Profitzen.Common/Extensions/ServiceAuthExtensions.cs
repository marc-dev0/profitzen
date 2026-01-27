using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.DependencyInjection;
using Profitzen.Common.Authorization;
using Profitzen.Common.Http;
using Profitzen.Common.Middleware;

namespace Profitzen.Common.Extensions;

public static class ServiceAuthExtensions
{
    public static IServiceCollection AddServiceAuth(this IServiceCollection services)
    {
        services.AddHttpContextAccessor();
        services.AddScoped<ServiceHttpClient>();
        services.AddScoped<IAuthorizationHandler, ServiceAuthorizationHandler>();

        services.Configure<AuthorizationOptions>(options =>
        {
            options.AddPolicy("AllowServiceAuth", policy =>
            {
                policy.AddRequirements(new ServiceAuthorizationRequirement());
            });
        });

        return services;
    }

    public static IApplicationBuilder UseServiceAuth(this IApplicationBuilder app)
    {
        app.UseMiddleware<ServiceAuthenticationMiddleware>();
        return app;
    }
}
