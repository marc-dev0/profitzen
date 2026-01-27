using Profitzen.Common.Domain;

namespace Profitzen.Configuration.Domain.Entities;

public class CompanySettings : BaseEntity
{
    public string TenantId { get; private set; } = string.Empty;
    public string CompanyName { get; private set; } = string.Empty;
    public string? TradeName { get; private set; }
    public string Ruc { get; private set; } = string.Empty;
    public string? Address { get; private set; }
    public string? Phone { get; private set; }
    public string? Email { get; private set; }
    public string? Website { get; private set; }
    public string? TicketHeader { get; private set; }
    public string? TicketFooter { get; private set; }
    public bool ShowLogo { get; private set; }
    public int TicketWidth { get; private set; }
    public int TicketMargin { get; private set; }
    public string? LogoUrl { get; private set; }
    
    // Configuración Fiscal
    public string? TaxName { get; private set; }
    public decimal TaxRate { get; private set; }
    public bool PricesIncludeTax { get; private set; }
    public string? Currency { get; private set; }
    public string? CurrencySymbol { get; private set; }

    private CompanySettings() { }

    public CompanySettings(
        string tenantId,
        string companyName,
        string ruc,
        string? tradeName = null,
        string? address = null,
        string? phone = null,
        string? email = null,
        string? website = null,
        string? ticketHeader = null,
        string? ticketFooter = null,
        bool showLogo = true,
        int ticketWidth = 80,
        int ticketMargin = 5,
        string? logoUrl = null,
        string? taxName = "IGV",
        decimal taxRate = 0.18m,
        bool pricesIncludeTax = true,
        string? currency = "PEN",
        string? currencySymbol = "S/")
    {
        TenantId = tenantId;
        CompanyName = companyName;
        Ruc = ruc;
        TradeName = tradeName;
        Address = address;
        Phone = phone;
        Email = email;
        Website = website;
        TicketHeader = ticketHeader;
        TicketFooter = ticketFooter;
        ShowLogo = showLogo;
        TicketWidth = ticketWidth;
        TicketMargin = ticketMargin;
        LogoUrl = logoUrl;
        TaxName = taxName;
        TaxRate = taxRate;
        PricesIncludeTax = pricesIncludeTax;
        Currency = currency;
        CurrencySymbol = currencySymbol;
    }

    public void Update(
        string companyName,
        string ruc,
        string? tradeName,
        string? address,
        string? phone,
        string? email,
        string? website,
        string? ticketHeader,
        string? ticketFooter,
        bool showLogo,
        int ticketWidth,
        int ticketMargin,
        string? taxName,
        decimal taxRate,
        bool pricesIncludeTax,
        string? currency,
        string? currencySymbol)
    {
        CompanyName = companyName;
        Ruc = ruc;
        TradeName = tradeName;
        Address = address;
        Phone = phone;
        Email = email;
        Website = website;
        TicketHeader = ticketHeader;
        TicketFooter = ticketFooter;
        ShowLogo = showLogo;
        TicketWidth = ticketWidth;
        TicketMargin = ticketMargin;
        TaxName = taxName;
        TaxRate = taxRate;
        PricesIncludeTax = pricesIncludeTax;
        Currency = currency;
        CurrencySymbol = currencySymbol;
        UpdatedAt = DateTime.UtcNow;
    }

    public void UpdateLogo(string logoUrl)
    {
        LogoUrl = logoUrl;
        UpdatedAt = DateTime.UtcNow;
    }
}
