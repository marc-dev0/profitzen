using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Profitzen.Inventory.Application.DTOs;
using Profitzen.Inventory.Application.Services;
using System.Security.Claims;

namespace Profitzen.Inventory.Controllers;

[ApiController]
[Route("api/inventory")]
[Authorize]
public class InventoryController : ControllerBase
{
    private readonly IInventoryService _inventoryService;
    private readonly ILogger<InventoryController> _logger;

    public InventoryController(IInventoryService inventoryService, ILogger<InventoryController> logger)
    {
        _inventoryService = inventoryService;
        _logger = logger;
    }

    private Guid GetCurrentUserId()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return Guid.TryParse(userIdClaim, out var userId) ? userId : Guid.Empty;
    }

    private Guid GetCurrentStoreId()
    {
        var storeIdClaim = User.FindFirst("StoreId")?.Value;
        return Guid.TryParse(storeIdClaim, out var storeId) ? storeId : Guid.Empty;
    }

    private string? GetAuthToken()
    {
        var authorization = Request.Headers["Authorization"].ToString();
        if (string.IsNullOrEmpty(authorization) || !authorization.StartsWith("Bearer "))
            return null;

        return authorization.Substring("Bearer ".Length).Trim();
    }

    [HttpGet("health")]
    [AllowAnonymous]
    public IActionResult Health()
    {
        return Ok(new
        {
            service = "Inventory Service",
            status = "healthy",
            timestamp = DateTime.UtcNow,
            version = "1.0.0"
        });
    }

    [HttpGet("store-inventory")]
    public async Task<IActionResult> GetStoreInventory([FromQuery] Guid? storeId)
    {
        var targetStoreId = storeId ?? GetCurrentStoreId();
        if (targetStoreId == Guid.Empty)
             return BadRequest("Store ID identify failed");

        var token = GetAuthToken();
        var inventory = await _inventoryService.GetStoreInventoryAsync(targetStoreId, token);
        return Ok(inventory);
    }

    [HttpGet("store-inventory/internal")]
    [Authorize(Policy = "AllowServiceAuth")]
    public async Task<IActionResult> GetStoreInventoryInternal([FromQuery] Guid storeId)
    {
        var inventory = await _inventoryService.GetStoreInventoryAsync(storeId);
        return Ok(inventory);
    }

    [HttpGet("store-inventory/low-stock")]
    public async Task<IActionResult> GetLowStockProducts([FromQuery] Guid? storeId)
    {
        var targetStoreId = storeId ?? GetCurrentStoreId();
        var token = GetAuthToken();
        var inventory = await _inventoryService.GetLowStockProductsAsync(targetStoreId, token);
        return Ok(inventory);
    }

    [HttpGet("store-inventory/low-stock/by-store")]
    [Authorize(Policy = "AllowServiceAuth")]
    public async Task<IActionResult> GetLowStockProductsByStore([FromQuery] Guid storeId)
    {
        var inventory = await _inventoryService.GetLowStockProductsAsync(storeId);
        return Ok(inventory);
    }

    [HttpGet("store-inventory/by-product/{productId:guid}")]
    [Authorize(Policy = "AllowServiceAuth")]
    public async Task<IActionResult> GetInventoriesByProduct(Guid productId)
    {
        var tenantId = GetCurrentTenantId();
        var inventories = await _inventoryService.GetInventoriesByProductIdAsync(productId, tenantId);
        return Ok(inventories);
    }

    [HttpGet("store-inventory/by-product-store")]
    [Authorize(Policy = "AllowServiceAuth")]
    public async Task<IActionResult> GetInventoryByProductAndStore([FromQuery] Guid productId, [FromQuery] Guid storeId)
    {
        _logger.LogInformation("GetInventoryByProductAndStore endpoint called. ProductId: {ProductId}, StoreId: {StoreId}",
            productId, storeId);

        var inventory = await _inventoryService.GetStoreInventoryByProductIdAsync(productId, storeId);
        if (inventory == null)
        {
            _logger.LogWarning("Inventory not found for ProductId: {ProductId}, StoreId: {StoreId}", productId, storeId);
            return NotFound();
        }

        _logger.LogInformation("Found inventory: {@Inventory}", inventory);
        return Ok(inventory);
    }

    [HttpPost("store-inventory")]
    [Authorize(Roles = "Admin,Manager,Logistics")]
    public async Task<IActionResult> CreateStoreInventory([FromBody] CreateStoreInventoryRequest request)
    {
        var storeId = GetCurrentStoreId();
        var tenantId = GetCurrentTenantId();
        var userId = GetCurrentUserId();
        var token = GetAuthToken();
        try
        {
            var inventory = await _inventoryService.CreateStoreInventoryAsync(request, storeId, tenantId, userId, token);
            return CreatedAtAction(nameof(GetStoreInventory), new { id = inventory.Id }, inventory);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }
    }

    [HttpPut("store-inventory/{id:guid}/stock")]
    [Authorize(Roles = "Admin,Manager,Logistics")]
    public async Task<IActionResult> UpdateStock(Guid id, [FromBody] UpdateStockRequest request)
    {
        var tenantId = GetCurrentTenantId();
        var userId = GetCurrentUserId();
        var token = GetAuthToken();
        try
        {
            var inventory = await _inventoryService.UpdateStockAsync(id, request, tenantId, userId, token);
            return Ok(inventory);
        }
        catch (InvalidOperationException)
        {
            return NotFound();
        }
    }

    [HttpPost("store-inventory/{id:guid}/stock/add")]
    [Authorize(Policy = "AllowServiceAuth")]
    public async Task<IActionResult> AddStock(Guid id, [FromBody] StockMovementRequest request)
    {
        var tenantId = GetCurrentTenantId();
        var userId = GetCurrentUserId();
        var token = GetAuthToken();
        try
        {
            var inventory = await _inventoryService.AddStockAsync(id, request, tenantId, userId, token);
            return Ok(inventory);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }
    }

    [HttpPost("store-inventory/{id:guid}/stock/remove")]
    [Authorize(Policy = "AllowServiceAuth")]
    public async Task<IActionResult> RemoveStock(Guid id, [FromBody] StockMovementRequest request)
    {
        var tenantId = GetCurrentTenantId();
        var userId = GetCurrentUserId();
        var token = GetAuthToken();
        try
        {
            var inventory = await _inventoryService.RemoveStockAsync(id, request, tenantId, userId, token);
            return Ok(inventory);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }
    }

    [HttpPatch("store-inventory/{id:guid}/minimum-stock")]
    public async Task<IActionResult> UpdateMinimumStock(Guid id, [FromBody] UpdateMinimumStockRequest request)
    {
        var token = GetAuthToken();
        try
        {
            var inventory = await _inventoryService.UpdateMinimumStockAsync(id, request.MinimumStock, token);
            return Ok(inventory);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    private string GetCurrentTenantId()
    {
        return User.FindFirst("TenantId")?.Value ?? string.Empty;
    }

    // Suppliers endpoints
    [HttpGet("suppliers")]
    public async Task<IActionResult> GetSuppliers()
    {
        var tenantId = GetCurrentTenantId();
        var suppliers = await _inventoryService.GetSuppliersAsync(tenantId);
        return Ok(suppliers);
    }

    [HttpGet("suppliers/{id:guid}")]
    public async Task<IActionResult> GetSupplier(Guid id)
    {
        var supplier = await _inventoryService.GetSupplierByIdAsync(id);
        if (supplier == null)
            return NotFound();

        return Ok(supplier);
    }

    [HttpPost("suppliers")]
    public async Task<IActionResult> CreateSupplier([FromBody] CreateSupplierRequest request)
    {
        try
        {
            var tenantId = GetCurrentTenantId();
            var userId = GetCurrentUserId();
            var supplier = await _inventoryService.CreateSupplierAsync(request, tenantId, userId);
            return CreatedAtAction(nameof(GetSupplier), new { id = supplier.Id }, supplier);
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPut("suppliers/{id:guid}")]
    public async Task<IActionResult> UpdateSupplier(Guid id, [FromBody] UpdateSupplierRequest request)
    {
        var userId = GetCurrentUserId();
        try
        {
            var supplier = await _inventoryService.UpdateSupplierAsync(id, request, userId);
            return Ok(supplier);
        }
        catch (InvalidOperationException)
        {
            return NotFound();
        }
    }

    [HttpDelete("suppliers/{id:guid}")]
    public async Task<IActionResult> DeleteSupplier(Guid id)
    {
        var userId = GetCurrentUserId();
        var result = await _inventoryService.DeleteSupplierAsync(id, userId);
        if (!result)
            return NotFound();

        return NoContent();
    }

    // Purchases endpoints
    [HttpGet("purchases")]
    public async Task<IActionResult> GetPurchases([FromQuery] Guid? storeId = null)
    {
        var targetStoreId = storeId ?? GetCurrentStoreId();
        var token = GetAuthToken();
        var purchases = await _inventoryService.GetPurchasesAsync(targetStoreId, token);
        return Ok(purchases);
    }

    [HttpGet("purchases/{id:guid}")]
    public async Task<IActionResult> GetPurchase(Guid id)
    {
        var tenantId = GetCurrentTenantId();
        var token = GetAuthToken();
        var purchase = await _inventoryService.GetPurchaseByIdAsync(id, tenantId, token);
        if (purchase == null)
            return NotFound();

        return Ok(purchase);
    }

    [HttpPost("purchases")]
    public async Task<IActionResult> CreatePurchase([FromBody] CreatePurchaseRequest request)
    {
        // Use StoreId from request if available, otherwise fallback to current context
        var storeId = request.StoreId ?? GetCurrentStoreId();
        var tenantId = GetCurrentTenantId();
        var userId = GetCurrentUserId();
        var token = GetAuthToken();

        if (storeId == Guid.Empty)
             return BadRequest("No se pudo identificar la tienda para esta compra.");

        try
        {
            var purchase = await _inventoryService.CreatePurchaseAsync(request, storeId, tenantId, userId, token);
            return CreatedAtAction(nameof(GetPurchase), new { id = purchase.Id }, purchase);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }
    }

    [HttpPost("purchases/{id:guid}/receive")]
    public async Task<IActionResult> MarkPurchaseAsReceived(Guid id)
    {
        var userId = GetCurrentUserId();
        var tenantId = GetCurrentTenantId();
        var token = GetAuthToken();
        try
        {
            var purchase = await _inventoryService.MarkPurchaseAsReceivedAsync(id, userId, tenantId, token);
            return Ok(purchase);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpGet("purchases/last-prices")]
    [Authorize(Policy = "AllowServiceAuth")]
    public async Task<IActionResult> GetLastPurchasePrices([FromQuery] string tenantId)
    {
        var lastPrices = await _inventoryService.GetLastPurchasePricesAsync(tenantId);
        return Ok(lastPrices);
    }

    [HttpGet("series")]
    public async Task<IActionResult> GetDocumentSeries([FromQuery] string? documentType = null)
    {
        var tenantId = GetCurrentTenantId();
        var storeId = GetCurrentStoreId();
        var series = await _inventoryService.GetDocumentSeriesAsync(tenantId, storeId, documentType);
        return Ok(series);
    }

    [HttpGet("series/{id:guid}")]
    public async Task<IActionResult> GetDocumentSeriesById(Guid id)
    {
        var series = await _inventoryService.GetDocumentSeriesByIdAsync(id);
        if (series == null)
            return NotFound();

        return Ok(series);
    }

    [HttpPost("series")]
    public async Task<IActionResult> CreateDocumentSeries([FromBody] CreateDocumentSeriesRequest request)
    {
        var tenantId = GetCurrentTenantId();
        var userId = GetCurrentUserId();
        try
        {
            var series = await _inventoryService.CreateDocumentSeriesAsync(request, tenantId, userId);
            return CreatedAtAction(nameof(GetDocumentSeriesById), new { id = series.Id }, series);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPut("series/{id:guid}")]
    public async Task<IActionResult> UpdateDocumentSeries(Guid id, [FromBody] UpdateDocumentSeriesRequest request)
    {
        var userId = GetCurrentUserId();
        try
        {
            var series = await _inventoryService.UpdateDocumentSeriesAsync(id, request, userId);
            return Ok(series);
        }
        catch (InvalidOperationException)
        {
            return NotFound();
        }
    }

    [HttpGet("series/next-number")]
    public async Task<IActionResult> GetNextDocumentNumber([FromQuery] string documentType)
    {
        var tenantId = GetCurrentTenantId();
        var storeId = GetCurrentStoreId();
        try
        {
            var nextNumber = await _inventoryService.GetNextDocumentNumberAsync(tenantId, storeId, documentType);
            return Ok(nextNumber);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpGet("products/search")]
    public async Task<IActionResult> SearchProducts([FromQuery] string term)
    {
        if (string.IsNullOrWhiteSpace(term) || term.Length < 2)
            return Ok(Array.Empty<ProductSearchDto>());

        var storeId = GetCurrentStoreId();
        var token = GetAuthToken();
        var products = await _inventoryService.SearchProductsAsync(term, storeId, token);
        return Ok(products);
    }

    [HttpGet("products")]
    public async Task<IActionResult> GetAllProducts([FromQuery] Guid? storeId)
    {
        var targetStoreId = storeId ?? GetCurrentStoreId();
        var token = GetAuthToken();
        var products = await _inventoryService.GetAllProductsWithStockAsync(targetStoreId, token);
        return Ok(products);
    }

    [HttpPost("adjustments")]
    [Authorize(Roles = "Admin,Manager,Logistics")]
    public async Task<IActionResult> CreateAdjustment([FromBody] CreateInventoryAdjustmentRequest request)
    {
        try
        {
            var tenantId = GetCurrentTenantId();
            var userId = GetCurrentUserId();
            var token = GetAuthToken();
            var adjustment = await _inventoryService.CreateAdjustmentAsync(request, tenantId, userId, token);
            return Ok(adjustment);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("adjustments-batch")]
    [Authorize]
    public async Task<IActionResult> CreateAdjustmentBatch([FromBody] BatchInventoryAdjustmentRequest request)
    {
        try
        {
            var tenantId = GetCurrentTenantId();
            var userId = GetCurrentUserId();
            var token = GetAuthToken();
            var code = await _inventoryService.CreateAdjustmentBatchAsync(request, tenantId, userId, token);
            return Ok(new { message = "Ajuste masivo realizado correctamente", adjustmentCode = code });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("transfer")]
    [Authorize]
    public async Task<IActionResult> TransferStock([FromBody] TransferStockRequest request)
    {
        try
        {
            var tenantId = GetCurrentTenantId();
            var userId = GetCurrentUserId();
            await _inventoryService.TransferStockAsync(request, tenantId, userId);
            return Ok(new { message = "Transferencia realizada correctamente" });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    // --- New Transfer Endpoints ---

    [HttpPost("transfers")]
    [Authorize]
    public async Task<IActionResult> CreateTransfer([FromBody] CreateTransferRequest request)
    {
        var tenantId = GetCurrentTenantId();
        var token = GetAuthToken();
        try
        {
            var transfer = await _inventoryService.CreateTransferAsync(request, tenantId, token);
            return CreatedAtAction(nameof(GetTransferById), new { id = transfer.Id }, transfer);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpGet("transfers/{id:guid}")]
    [Authorize]
    public async Task<IActionResult> GetTransferById(Guid id)
    {
        var tenantId = GetCurrentTenantId();
        try
        {
            var transfer = await _inventoryService.GetTransferByIdAsync(id, tenantId);
            return Ok(transfer);
        }
        catch (KeyNotFoundException)
        {
            return NotFound();
        }
    }

    [HttpGet("transfers/number/{number}")]
    [Authorize]
    public async Task<IActionResult> GetTransferByNumber(string number)
    {
        var tenantId = GetCurrentTenantId();
        var transfer = await _inventoryService.GetTransferByNumberAsync(number, tenantId);
        
        if (transfer == null) return NotFound();
        return Ok(transfer);
    }

    [HttpGet("transfers")]
    [Authorize]
    public async Task<IActionResult> GetTransfers([FromQuery] Guid? originStoreId, [FromQuery] Guid? destinationStoreId)
    {
        var tenantId = GetCurrentTenantId();
        var token = GetAuthToken();
        var transfers = await _inventoryService.GetTransfersAsync(originStoreId, destinationStoreId, tenantId, token);
        return Ok(transfers);
    }

    [HttpPost("transfers/{id:guid}/complete")]
    [Authorize]
    public async Task<IActionResult> CompleteTransfer(Guid id)
    {
        var tenantId = GetCurrentTenantId();
        var userId = GetCurrentUserId();
        var token = GetAuthToken();
        try
        {
            var transfer = await _inventoryService.CompleteTransferAsync(id, userId, tenantId, token);
            return Ok(transfer);
        }
        catch (KeyNotFoundException) { return NotFound(); }
        catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
    }

    [HttpPost("transfers/{id:guid}/cancel")]
    [Authorize]
    public async Task<IActionResult> CancelTransfer(Guid id)
    {
        var tenantId = GetCurrentTenantId();
        var userId = GetCurrentUserId();
        try
        {
            var transfer = await _inventoryService.CancelTransferAsync(id, userId, tenantId);
            return Ok(transfer);
        }
        catch (KeyNotFoundException) { return NotFound(); }
        catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
    }

    [HttpPost("transfer-batch")]
    [Authorize]
    public async Task<IActionResult> TransferStockBatch([FromBody] TransferStockBatchRequest request)
    {
        try
        {
            var tenantId = GetCurrentTenantId();
            var userId = GetCurrentUserId();
            var code = await _inventoryService.TransferStockBatchAsync(request, tenantId, userId);
            return Ok(new { message = "Transferencia masiva realizada correctamente", transferCode = code });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpGet("movements")]
    public async Task<IActionResult> GetInventoryMovements(
        [FromQuery] Guid? storeId = null,
        [FromQuery] Guid? productId = null,
        [FromQuery] DateTime? fromDate = null,
        [FromQuery] DateTime? toDate = null)
    {
        try
        {
            // If storeId is provided, use it. If not, pass null to fetch for all stores (if user has permission).
            // Logic: The frontend sends specific storeId for filtering, or omits it for "All".
            // However, we might want to default to "Current Store" if the user didn't explicitly ask for "All"?
            // Frontend sends empty string for "All", which becomes null here.
            
            // To be safe and compatible with previous behavior while allowing "All",
            // we will pass the storeId as is.
            var tenantId = GetCurrentTenantId();
            var movements = await _inventoryService.GetInventoryMovementsAsync(storeId, tenantId, productId, fromDate, toDate);
            return Ok(movements);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = ex.Message, details = ex.InnerException?.Message });
        }
    }
}