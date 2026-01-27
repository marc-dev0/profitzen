namespace Profitzen.Identity.Application.DTOs;

public record ForgotPasswordRequest(
    string Email
);

public record ResetPasswordRequest(
    string Token,
    string NewPassword
);

public record ForgotPasswordResponse(
    string Message
);

public record ResetPasswordResponse(
    string Message
);
