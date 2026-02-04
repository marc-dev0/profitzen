using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Profitzen.Customer.Application.DTOs;
using Profitzen.Customer.Application.Services;
using System.Security.Claims;

namespace Profitzen.Customer.Controllers;

[ApiController]
[Route("api/customer")]
[Authorize]
public class CustomerController : ControllerBase
{
    private readonly ICustomerService _customerService;

    public CustomerController(ICustomerService customerService)
    {
        _customerService = customerService;
    }

    private Guid GetCurrentUserId()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return Guid.TryParse(userIdClaim, out var userId) ? userId : Guid.Empty;
    }

    private string GetCurrentTenantId()
    {
        return User.FindFirst("TenantId")?.Value ?? string.Empty;
    }

    [HttpGet("health")]
    [AllowAnonymous]
    public IActionResult Health()
    {
        return Ok(new
        {
            service = "Customer Service",
            status = "healthy",
            timestamp = DateTime.UtcNow,
            version = "1.0.0"
        });
    }

    [HttpGet("customers")]
    public async Task<IActionResult> GetCustomers()
    {
        var tenantId = GetCurrentTenantId();
        var customers = await _customerService.GetCustomersAsync(tenantId);
        return Ok(customers);
    }

    [HttpGet("customers/{id:guid}")]
    public async Task<IActionResult> GetCustomer(Guid id)
    {
        var customer = await _customerService.GetCustomerByIdAsync(id);
        if (customer == null)
            return NotFound();

        return Ok(customer);
    }

    [HttpGet("customers/by-document/{documentNumber}")]
    public async Task<IActionResult> GetCustomerByDocument(string documentNumber)
    {
        var tenantId = GetCurrentTenantId();
        var customer = await _customerService.GetCustomerByDocumentAsync(documentNumber, tenantId);
        if (customer == null)
            return NotFound();

        return Ok(customer);
    }

    [HttpPost("customers")]
    public async Task<IActionResult> CreateCustomer([FromBody] CreateCustomerRequest request)
    {
        var tenantId = GetCurrentTenantId();
        var userId = GetCurrentUserId();
        try
        {
            var customer = await _customerService.CreateCustomerAsync(request, tenantId, userId);
            return CreatedAtAction(nameof(GetCustomer), new { id = customer.Id }, customer);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }
    }

    [HttpPut("customers/{id:guid}")]
    public async Task<IActionResult> UpdateCustomer(Guid id, [FromBody] UpdateCustomerRequest request)
    {
        var userId = GetCurrentUserId();
        try
        {
            var customer = await _customerService.UpdateCustomerAsync(id, request, userId);
            return Ok(customer);
        }
        catch (InvalidOperationException ex)
        {
            return NotFound(ex.Message);
        }
    }

    [HttpPut("customers/{id:guid}/credit-limit")]
    public async Task<IActionResult> UpdateCreditLimit(Guid id, [FromBody] UpdateCreditLimitRequest request)
    {
        var userId = GetCurrentUserId();
        try
        {
            var customer = await _customerService.UpdateCreditLimitAsync(id, request, userId);
            return Ok(customer);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }
    }

    [HttpDelete("customers/{id:guid}")]
    public async Task<IActionResult> DeleteCustomer(Guid id)
    {
        var userId = GetCurrentUserId();
        try
        {
            var result = await _customerService.DeleteCustomerAsync(id, userId);
            if (!result)
                return NotFound();

            return NoContent();
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }
    }

    [HttpGet("customers/{id:guid}/purchases")]
    public async Task<IActionResult> GetCustomerPurchases(Guid id)
    {
        var purchases = await _customerService.GetCustomerPurchasesAsync(id);
        return Ok(purchases);
    }

    [HttpGet("customers/{id:guid}/stats")]
    public async Task<IActionResult> GetCustomerStats(Guid id)
    {
        var stats = await _customerService.GetCustomerStatsAsync(id);
        if (stats == null)
            return NotFound();

        return Ok(stats);
    }

    [HttpPost("purchases")]
    public async Task<IActionResult> RecordPurchase([FromQuery] Guid customerId, [FromQuery] Guid saleId, [FromQuery] decimal totalAmount)
    {
        try
        {
            var tenantId = GetCurrentTenantId();
            var purchase = await _customerService.RecordPurchaseAsync(customerId, saleId, totalAmount, tenantId);
            return Ok(purchase);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }
    }

    [HttpGet("customers/top")]
    public async Task<IActionResult> GetTopCustomers([FromQuery] int count = 10)
    {
        var tenantId = GetCurrentTenantId();
        var customers = await _customerService.GetTopCustomersAsync(tenantId, count);
        return Ok(customers);
    }

    [HttpGet("credits")]
    public async Task<IActionResult> GetCustomerCredits([FromQuery] Guid customerId)
    {
        var credits = await _customerService.GetCustomerCreditsAsync(customerId);
        return Ok(credits);
    }

    [HttpGet("credits/{id:guid}")]
    public async Task<IActionResult> GetCredit(Guid id)
    {
        var credit = await _customerService.GetCreditByIdAsync(id);
        if (credit == null)
            return NotFound();

        return Ok(credit);
    }

    [HttpPost("credits")]
    public async Task<IActionResult> CreateCredit([FromBody] CreateCreditRequest request)
    {
        var userId = GetCurrentUserId();
        try
        {
            var credit = await _customerService.CreateCreditAsync(request, userId);
            return CreatedAtAction(nameof(GetCredit), new { id = credit.Id }, credit);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }
    }

    [HttpPost("credits/{id:guid}/payments")]
    public async Task<IActionResult> AddCreditPayment(Guid id, [FromBody] AddCreditPaymentRequest request)
    {
        var userId = GetCurrentUserId();
        try
        {
            var credit = await _customerService.AddCreditPaymentAsync(id, request, userId);
            return Ok(credit);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { error = "Internal Error", details = ex.ToString() });
        }
    }

    [HttpGet("credits/overdue")]
    public async Task<IActionResult> GetOverdueCredits()
    {
        var tenantId = GetCurrentTenantId();
        var credits = await _customerService.GetOverdueCreditsAsync(tenantId);
        return Ok(credits);
    }

    [HttpGet("credits/pending")]
    public async Task<IActionResult> GetPendingCredits()
    {
        var tenantId = GetCurrentTenantId();
        var credits = await _customerService.GetPendingCreditsAsync(tenantId);
        return Ok(credits);
    }
    [HttpGet("internal/customers/{id:guid}")]
    [Authorize(Policy = "AllowServiceAuth")]
    [ApiExplorerSettings(IgnoreApi = true)]
    public async Task<IActionResult> GetCustomerInternal(Guid id)
    {

        var customer = await _customerService.GetCustomerByIdAsync(id);
        if (customer == null)
            return NotFound();

        return Ok(customer);
    }

    [HttpPost("internal/credits")]
    [Authorize(Policy = "AllowServiceAuth")]
    [ApiExplorerSettings(IgnoreApi = true)]
    public async Task<IActionResult> CreateCreditInternal([FromBody] CreateCreditRequest request)
    {


        try
        {
            var credit = await _customerService.CreateCreditAsync(request, Guid.Empty);
            return CreatedAtAction(nameof(GetCredit), new { id = credit.Id }, credit);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }
    }

    [HttpPost("internal/credits/refund")]
    [Authorize(Policy = "AllowServiceAuth")]
    [ApiExplorerSettings(IgnoreApi = true)]
    public async Task<IActionResult> RefundCreditInternal([FromBody] RefundCreditRequest request)
    {
        try
        {
            await _customerService.RefundCreditAsync(request.CustomerId, request.Reference, Guid.Empty);
            return Ok();
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }
    }
}
