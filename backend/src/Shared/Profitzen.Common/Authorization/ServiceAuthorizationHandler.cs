using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;

namespace Profitzen.Common.Authorization;

public class ServiceAuthorizationRequirement : IAuthorizationRequirement
{
}

public class ServiceAuthorizationHandler : AuthorizationHandler<ServiceAuthorizationRequirement>
{
    private readonly IHttpContextAccessor _httpContextAccessor;

    public ServiceAuthorizationHandler(IHttpContextAccessor httpContextAccessor)
    {
        _httpContextAccessor = httpContextAccessor;
    }

    protected override Task HandleRequirementAsync(
        AuthorizationHandlerContext context,
        ServiceAuthorizationRequirement requirement)
    {
        var httpContext = _httpContextAccessor.HttpContext;
        if (httpContext == null)
        {
            return Task.CompletedTask;
        }

        var isServiceRequest = httpContext.Items["IsServiceRequest"] as bool?;

        if (isServiceRequest == true || context.User.Identity?.IsAuthenticated == true)
        {
            context.Succeed(requirement);
        }

        return Task.CompletedTask;
    }
}
