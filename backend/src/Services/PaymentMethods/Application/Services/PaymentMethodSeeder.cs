using Microsoft.EntityFrameworkCore;
using Profitzen.Common.Domain;
using Profitzen.PaymentMethods.Infrastructure;

namespace Profitzen.PaymentMethods.Application.Services;

public interface IPaymentMethodSeeder
{
    Task SeedDefaultsAsync(string tenantId);
}

public class PaymentMethodSeeder : IPaymentMethodSeeder
{
    private readonly PaymentMethodsDbContext _context;
    private readonly ILogger<PaymentMethodSeeder> _logger;

    public PaymentMethodSeeder(PaymentMethodsDbContext context, ILogger<PaymentMethodSeeder> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task SeedDefaultsAsync(string tenantId)
    {
        var exists = await _context.PaymentMethodConfigs
            .AnyAsync(pm => pm.TenantId == tenantId);

        if (exists)
        {
            _logger.LogInformation("Payment methods already exist for tenant {TenantId}. Skipping seed.", tenantId);
            return;
        }

        _logger.LogInformation("Seeding default payment methods for tenant {TenantId}...", tenantId);

        var defaults = new List<PaymentMethodConfig>
        {
            new()
            {
                TenantId = tenantId,
                Code = "CASH",
                Name = "Efectivo",
                Description = "Pago en billetes y monedas. Aplica redondeo al múltiplo de S/ 0.10 más cercano.",
                Icon = "Banknote",
                RequiresAmountReceived = true,
                AppliesRounding = true,
                IsActive = true,
                SortOrder = 1
            },
            new()
            {
                TenantId = tenantId,
                Code = "CARD",
                Name = "Tarjeta",
                Description = "Pago con tarjeta de débito o crédito. Monto exacto, sin redondeo.",
                Icon = "CreditCard",
                IsActive = true,
                SortOrder = 2
            },
            new()
            {
                TenantId = tenantId,
                Code = "TRANSFER",
                Name = "Transferencia",
                Description = "Transferencia bancaria o interbancaria. Requiere nro. de operación.",
                Icon = "ArrowRightLeft",
                RequiresReference = true,
                IsActive = true,
                SortOrder = 3
            },
            new()
            {
                TenantId = tenantId,
                Code = "WALLET",
                Name = "Yape/Plin",
                Description = "Billetera digital (Yape, Plin, etc.). Monto exacto.",
                Icon = "Smartphone",
                IsActive = true,
                SortOrder = 4
            },
            new()
            {
                TenantId = tenantId,
                Code = "CREDIT",
                Name = "Crédito",
                Description = "Venta al fiado. Genera deuda al cliente. Requiere cliente identificado.",
                Icon = "Clock",
                GeneratesDebt = true,
                RequiresCustomer = true,
                IsActive = true,
                SortOrder = 5
            }
        };

        _context.PaymentMethodConfigs.AddRange(defaults);
        await _context.SaveChangesAsync();
        _logger.LogInformation("Seeded {Count} default payment methods for tenant {TenantId}", defaults.Count, tenantId);
    }
}
