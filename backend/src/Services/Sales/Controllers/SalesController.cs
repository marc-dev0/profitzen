using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Profitzen.Sales.Application.DTOs;
using Profitzen.Sales.Application.Services;
using System.Security.Claims;

namespace Profitzen.Sales.Controllers;

[ApiController]
[Route("api/sales")]
[Authorize]
public class SalesController : ControllerBase
{
    private readonly ISalesService _salesService;

    public SalesController(ISalesService salesService)
    {
        _salesService = salesService;
    }

    private Guid GetCurrentUserId()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return Guid.TryParse(userIdClaim, out var userId) ? userId : Guid.Empty;
    }

    private Guid? GetCurrentStoreId()
    {
        var storeIdClaim = User.FindFirst("StoreId")?.Value;
        return Guid.TryParse(storeIdClaim, out var storeId) ? storeId : null;
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
            service = "Sales Service",
            status = "healthy",
            timestamp = DateTime.UtcNow,
            version = "1.0.0"
        });
    }

    [HttpGet]
    public async Task<IActionResult> GetSales([FromQuery] Guid? storeId, [FromQuery] DateTime? fromDate, [FromQuery] DateTime? toDate)
    {
        var tenantId = GetCurrentTenantId();
        
        // If no storeId is provided, get all sales for the tenant
        // If storeId is provided, filter by that specific store
        var sales = await _salesService.GetSalesAsync(tenantId, storeId, fromDate, toDate);
        return Ok(sales);
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetSale(Guid id)
    {
        var sale = await _salesService.GetSaleByIdAsync(id);
        if (sale == null)
            return NotFound();

        return Ok(sale);
    }

    [HttpGet("by-number/{saleNumber}")]
    public async Task<IActionResult> GetSaleByNumber(string saleNumber)
    {
        var sale = await _salesService.GetSaleByNumberAsync(saleNumber);
        if (sale == null)
            return NotFound();

        return Ok(sale);
    }

    [HttpPost]
    public async Task<IActionResult> CreateSale([FromBody] CreateSaleRequest request)
    {
        var storeId = GetCurrentStoreId();
        if (!storeId.HasValue)
            return BadRequest("StoreId not found in token");
            
        var cashierId = GetCurrentUserId();
        var tenantId = GetCurrentTenantId();
        var sale = await _salesService.CreateSaleAsync(request, storeId.Value, cashierId, tenantId);
        return CreatedAtAction(nameof(GetSale), new { id = sale.Id }, sale);
    }

    [HttpPost("{id:guid}/items")]
    public async Task<IActionResult> AddItemToSale(Guid id, [FromBody] AddSaleItemRequest request)
    {
        try
        {
            var sale = await _salesService.AddItemToSaleAsync(id, request);
            return Ok(sale);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }
    }

    [HttpDelete("{id:guid}/items/{productId:guid}")]
    public async Task<IActionResult> RemoveItemFromSale(Guid id, Guid productId)
    {
        try
        {
            var sale = await _salesService.RemoveItemFromSaleAsync(id, productId);
            return Ok(sale);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }
    }

    [HttpPut("{id:guid}/items/{productId:guid}")]
    public async Task<IActionResult> UpdateSaleItem(Guid id, Guid productId, [FromBody] UpdateSaleItemRequest request)
    {
        try
        {
            var sale = await _salesService.UpdateSaleItemAsync(id, productId, request);
            return Ok(sale);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }
    }

    [HttpPost("{id:guid}/discount")]
    public async Task<IActionResult> ApplyDiscount(Guid id, [FromBody] ApplyDiscountRequest request)
    {
        try
        {
            var sale = await _salesService.ApplyDiscountAsync(id, request);
            return Ok(sale);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }
    }

    [HttpPost("{id:guid}/payments")]
    public async Task<IActionResult> AddPayment(Guid id, [FromBody] AddPaymentRequest request)
    {
        try
        {
            var sale = await _salesService.AddPaymentAsync(id, request);
            return Ok(sale);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }
    }

    [HttpPost("{id:guid}/complete")]
    public async Task<IActionResult> CompleteSale(Guid id)
    {
        try
        {
            var sale = await _salesService.CompleteSaleAsync(id);
            return Ok(sale);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }
    }

    // CancelSale endpoint removed - Cancelled status no longer used
    /*
    [HttpPost("{id:guid}/cancel")]
    public async Task<IActionResult> CancelSale(Guid id)
    {
        try
        {
            var sale = await _salesService.CancelSaleAsync(id);
            return Ok(sale);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }
    }
    */

    [HttpPost("{id:guid}/return")]
    public async Task<IActionResult> ReturnSale(Guid id)
    {
        try
        {
            var sale = await _salesService.ReturnSaleAsync(id);
            return Ok(sale);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }
    }

    [HttpPost("{id:guid}/ticket")]
    public async Task<IActionResult> GetTicketPdf(Guid id, [FromBody] TicketSettingsDto settings)
    {
        try
        {
            var pdfBytes = await _salesService.GetTicketPdfAsync(id, settings);
            return File(pdfBytes, "application/pdf", $"Ticket_{id}.pdf");
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> DeleteSale(Guid id)
    {
        try
        {
            var result = await _salesService.DeleteSaleAsync(id);
            if (!result)
                return NotFound();

            return NoContent();
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }
    }

    [HttpGet("customers")]
    public async Task<IActionResult> GetCustomers()
    {
        var storeId = GetCurrentStoreId();
        if (!storeId.HasValue)
            return BadRequest("StoreId not found in token");
            
        var customers = await _salesService.GetCustomersAsync(storeId.Value);
        return Ok(customers);
    }

    [HttpGet("customers/{id:guid}")]
    public async Task<IActionResult> GetCustomer(Guid id)
    {
        var customer = await _salesService.GetCustomerByIdAsync(id);
        if (customer == null)
            return NotFound();

        return Ok(customer);
    }

    [HttpGet("customers/by-document/{documentNumber}")]
    public async Task<IActionResult> GetCustomerByDocument(string documentNumber)
    {
        var storeId = GetCurrentStoreId();
        if (!storeId.HasValue)
            return BadRequest("StoreId not found in token");
            
        var customer = await _salesService.GetCustomerByDocumentAsync(documentNumber, storeId.Value);
        if (customer == null)
            return NotFound();

        return Ok(customer);
    }

    [HttpPost("customers")]
    public async Task<IActionResult> CreateCustomer([FromBody] CreateCustomerRequest request)
    {
        var storeId = GetCurrentStoreId();
        if (!storeId.HasValue)
            return BadRequest("StoreId not found in token");
            
        var tenantId = GetCurrentTenantId();
        var customer = await _salesService.CreateCustomerAsync(request, storeId.Value, tenantId);
        return CreatedAtAction(nameof(GetCustomer), new { id = customer.Id }, customer);
    }

    [HttpPut("customers/{id:guid}")]
    public async Task<IActionResult> UpdateCustomer(Guid id, [FromBody] UpdateCustomerRequest request)
    {
        try
        {
            var customer = await _salesService.UpdateCustomerAsync(id, request);
            return Ok(customer);
        }
        catch (InvalidOperationException)
        {
            return NotFound();
        }
    }

    [HttpDelete("customers/{id:guid}")]
    public async Task<IActionResult> DeleteCustomer(Guid id)
    {
        var result = await _salesService.DeleteCustomerAsync(id);
        if (!result)
            return NotFound();

        return NoContent();
    }

    [HttpGet("reports/daily")]
    public async Task<IActionResult> GetDailySales([FromQuery] DateTime date, [FromQuery] Guid? storeId = null)
    {
        var tenantId = GetCurrentTenantId();
        var total = await _salesService.GetDailySalesAsync(tenantId, date, storeId);
        return Ok(new { date, total });
    }

    [HttpGet("reports/monthly")]
    public async Task<IActionResult> GetMonthlySales([FromQuery] int year, [FromQuery] int month, [FromQuery] Guid? storeId = null)
    {
        var tenantId = GetCurrentTenantId();
        var total = await _salesService.GetMonthlySalesAsync(tenantId, year, month, storeId);
        return Ok(new { year, month, total });
    }

    [HttpGet("reports/top")]
    public async Task<IActionResult> GetTopSales([FromQuery] int count = 10, [FromQuery] Guid? storeId = null)
    {
        var tenantId = GetCurrentTenantId();
        var sales = await _salesService.GetTopSalesAsync(tenantId, count, storeId);
        return Ok(sales);
    }

    [HttpGet("dashboard")]
    public async Task<IActionResult> GetDashboard([FromQuery] Guid? storeId)
    {
        var tenantId = GetCurrentTenantId();
        var dashboard = await _salesService.GetDashboardAsync(tenantId, storeId);
        return Ok(dashboard);
    }
}