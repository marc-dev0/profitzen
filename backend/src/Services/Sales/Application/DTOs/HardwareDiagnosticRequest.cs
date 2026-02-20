using System;

namespace Profitzen.Sales.Application.DTOs;

public record HardwareDiagnosticRequest(
    string DeviceName,
    bool IsConnected,
    string? ErrorMessage = null
);
