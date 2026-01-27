namespace Profitzen.Identity.Application.DTOs;

public record RegisterRequest(
    string Email,
    string Password,
    string CompanyName,
    string FullName,
    string StoreName
);
