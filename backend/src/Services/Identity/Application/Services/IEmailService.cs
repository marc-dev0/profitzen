namespace Profitzen.Identity.Application.Services;

public interface IEmailService
{
    Task SendEmailAsync(string to, string subject, string body);
}
