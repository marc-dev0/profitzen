using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Profitzen.Identity.Domain.Enums;
using System.Security.Claims;

namespace Profitzen.Identity.Authorization;

[AttributeUsage(AttributeTargets.Class | AttributeTargets.Method, AllowMultiple = false)]
public class RequireRoleAttribute : Attribute, IAuthorizationFilter
{
    private readonly UserRole[] _allowedRoles;

    public RequireRoleAttribute(params UserRole[] allowedRoles)
    {
        _allowedRoles = allowedRoles;
    }

    public void OnAuthorization(AuthorizationFilterContext context)
    {
        var user = context.HttpContext.User;

        if (!user.Identity?.IsAuthenticated ?? true)
        {
            context.Result = new UnauthorizedResult();
            return;
        }

        var userRoleClaim = user.FindFirst(ClaimTypes.Role)?.Value ?? user.FindFirst("role")?.Value ?? user.FindFirst("Role")?.Value;
        if (string.IsNullOrEmpty(userRoleClaim) || !Enum.TryParse<UserRole>(userRoleClaim, out var userRole))
        {
            context.Result = new ForbidResult();
            return;
        }

        bool hasRole = false;
        foreach (var allowed in _allowedRoles)
        {
            if (userRole.HasFlag(allowed))
            {
                hasRole = true;
                break;
            }
        }

        if (!hasRole)
        {
            context.Result = new ForbidResult();
            return;
        }
    }
}
