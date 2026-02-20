using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Profitzen.Common.Services;
using Profitzen.PaymentMethods.Application.Services;
using Profitzen.PaymentMethods.Infrastructure;
using System.Security.Claims;

namespace Profitzen.PaymentMethods.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Policy = "AllowServiceAuth")]
public class PaymentMethodsController : ControllerBase
{
    private readonly PaymentMethodsDbContext _context;
    private readonly IPaymentMethodSeeder _seeder;
    private readonly SaleCalculationService _calculationService;

    public PaymentMethodsController(
        PaymentMethodsDbContext context, 
        IPaymentMethodSeeder seeder,
        SaleCalculationService calculationService)
    {
        _context = context;
        _seeder = seeder;
        _calculationService = calculationService;
    }

    private string GetCurrentTenantId() =>
        User.FindFirst("TenantId")?.Value ?? string.Empty;

    /// <summary>
    /// Obtiene todos los métodos de pago activos para el tenant actual.
    /// Si el tenant no tiene métodos configurados, se seedean los defaults.
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> GetPaymentMethods()
    {
        var tenantId = GetCurrentTenantId();

        // Auto-seed para tenants nuevos
        await _seeder.SeedDefaultsAsync(tenantId);

        var methods = await _context.PaymentMethodConfigs
            .Where(pm => pm.TenantId == tenantId && pm.IsActive)
            .OrderBy(pm => pm.SortOrder)
            .Select(pm => new PaymentMethodDto
            {
                Id = pm.Id,
                Code = pm.Code,
                Name = pm.Name,
                Description = pm.Description,
                Icon = pm.Icon,
                RequiresAmountReceived = pm.RequiresAmountReceived,
                AppliesRounding = pm.AppliesRounding,
                RequiresReference = pm.RequiresReference,
                GeneratesDebt = pm.GeneratesDebt,
                RequiresCustomer = pm.RequiresCustomer,
                SortOrder = pm.SortOrder
            })
            .ToListAsync();

        return Ok(methods);
    }

    /// <summary>
    /// Seed explícito de métodos de pago para un tenant.
    /// </summary>
    [HttpPost("seed/{tenantId}")]
    public async Task<IActionResult> SeedPaymentMethods(string tenantId)
    {
        await _seeder.SeedDefaultsAsync(tenantId);
        return Ok(new { message = $"Payment methods seeded for tenant {tenantId}" });
    }

    /// <summary>
    /// Calcula vuelto con redondeo BCRP.
    /// </summary>
    [HttpPost("calculate-change")]
    public IActionResult CalculateChange([FromBody] CalculateChangeRequest request)
    {
        var result = RoundingService.CalculateChange(
            request.TotalAmount,
            request.AmountReceived,
            request.AppliesRounding
        );

        return Ok(new CalculateChangeResponse
        {
            OriginalTotal = result.OriginalTotal,
            RoundedTotal = result.RoundedTotal,
            RoundingAdjustment = result.RoundingAdjustment,
            AmountReceived = result.AmountReceived,
            Change = result.Change,
            IsPaymentSufficient = result.IsPaymentSufficient,
            Deficit = result.Deficit
        });
    }

    /// <summary>
    /// Redondea un monto según regla BCRP (utility).
    /// </summary>
    [HttpGet("round/{amount}")]
    public IActionResult RoundAmount(decimal amount)
    {
        var rounded = RoundingService.ApplyBCRPRounding(amount);
        var adjustment = RoundingService.GetRoundingAdjustment(amount);

        return Ok(new
        {
            original = amount,
            rounded,
            adjustment,
            rule = adjustment > 0 ? "Redondeado hacia arriba"
                 : adjustment < 0 ? "Redondeado hacia abajo"
                 : "Sin redondeo"
        });
    }


    /// <summary>
    /// Health check.
    /// </summary>
    [HttpGet("health")]
    [AllowAnonymous]
    public IActionResult Health()
    {
        return Ok(new { status = "healthy", service = "PaymentMethods", timestamp = DateTime.UtcNow });
    }

    /// <summary>
    /// Calcula todos los valores financieros de una venta (subtotals, IGV, redondeo, vuelto)
    /// y cachea el resultado. Este es el ÚNICO lugar donde se calculan estos valores.
    /// </summary>
    [HttpPost("calculate-sale")]
    [AllowAnonymous]
    public async Task<IActionResult> CalculateSale([FromBody] Profitzen.PaymentMethods.DTOs.CalculateSaleRequest request)
    {
        var result = await _calculationService.CalculateAndCacheAsync(request);
        return Ok(result);
    }

    /// <summary>
    /// Recupera un cálculo previamente cacheado usando su cacheKey.
    /// Usado por el servicio Sales para obtener los valores exactos calculados.
    /// </summary>
    [HttpGet("get-calculation/{cacheKey}")]
    [AllowAnonymous]
    public async Task<IActionResult> GetCalculation(string cacheKey)
    {
        var result = await _calculationService.GetCachedCalculationAsync(cacheKey);
        if (result == null)
        {
            return NotFound(new { error = "Calculation not found or expired" });
        }
        return Ok(result);
    }
}

// --- DTOs ---

public class PaymentMethodDto
{
    public Guid Id { get; set; }
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string Icon { get; set; } = "CreditCard";
    public bool RequiresAmountReceived { get; set; }
    public bool AppliesRounding { get; set; }
    public bool RequiresReference { get; set; }
    public bool GeneratesDebt { get; set; }
    public bool RequiresCustomer { get; set; }
    public int SortOrder { get; set; }
}

public class CalculateChangeRequest
{
    public decimal TotalAmount { get; set; }
    public decimal AmountReceived { get; set; }
    public bool AppliesRounding { get; set; }
}

public class CalculateChangeResponse
{
    public decimal OriginalTotal { get; set; }
    public decimal RoundedTotal { get; set; }
    public decimal RoundingAdjustment { get; set; }
    public decimal AmountReceived { get; set; }
    public decimal Change { get; set; }
    public bool IsPaymentSufficient { get; set; }
    public decimal Deficit { get; set; }
}
