namespace Profitzen.Configuration.Application.DTOs;

public record CompanySettingsDto(
    Guid Id,
    string TenantId,
    string CompanyName,
    string? TradeName,
    string Ruc,
    string? Address,
    string? Phone,
    string? Email,
    string? Website,
    string? TicketHeader,
    string? TicketFooter,
    bool ShowLogo,
    int TicketWidth,
    int TicketMargin,
    string? LogoUrl,
    string? TaxName,
    decimal TaxRate,
    bool PricesIncludeTax,
    string? Currency,
    string? CurrencySymbol
);

public record UpdateCompanySettingsRequest
{
    public string CompanyName { get; init; } = string.Empty;
    public string? TradeName { get; init; }
    public string Ruc { get; init; } = string.Empty;
    public string? Address { get; init; }
    public string? Phone { get; init; }
    public string? Email { get; init; }
    public string? Website { get; init; }
    public string? TicketHeader { get; init; }
    public string? TicketFooter { get; init; }
    public bool ShowLogo { get; init; }
    public int TicketWidth { get; init; }
    public int TicketMargin { get; init; }
    public string? TaxName { get; init; }
    public decimal TaxRate { get; init; }
    public bool PricesIncludeTax { get; init; }
    public string? Currency { get; init; }
    public string? CurrencySymbol { get; init; }
}
