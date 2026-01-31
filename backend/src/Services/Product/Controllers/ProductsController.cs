using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Profitzen.Product.Application.DTOs;
using Profitzen.Product.Application.Services;
using System.Security.Claims;

namespace Profitzen.Product.Controllers;

[ApiController]
[Route("api/products")]
[Authorize]
public class ProductsController : ControllerBase
{
    private readonly IProductService _productService;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IConfiguration _configuration;
    private readonly ILogger<ProductsController> _logger;

    public ProductsController(
        IProductService productService,
        IHttpClientFactory httpClientFactory,
        IConfiguration configuration,
        ILogger<ProductsController> _logger)
    {
        _productService = productService;
        _httpClientFactory = httpClientFactory;
        _configuration = configuration;
        this._logger = _logger;
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

    private Guid GetCurrentStoreId()
    {
        var storeIdClaim = User.FindFirst("StoreId")?.Value;
        return Guid.TryParse(storeIdClaim, out var storeId) ? storeId : Guid.Empty;
    }

    [HttpGet("health")]
    [AllowAnonymous]
    public IActionResult Health()
    {
        return Ok(new
        {
            service = "Product Service",
            status = "healthy",
            timestamp = DateTime.UtcNow,
            version = "1.0.0"
        });
    }

    [HttpGet]
    [Authorize(Policy = "AllowServiceAuth")]
    public async Task<IActionResult> GetProducts([FromQuery] Guid? storeId = null, [FromQuery] bool includeStock = true)
    {
        var tenantId = GetCurrentTenantId();
        // If storeId is not provided in query, use the one from token claim as fallback (legacy behavior)
        // BUT if provided, use it.
        var finalStoreId = storeId.HasValue ? storeId.Value : GetCurrentStoreId();
        
        var products = await _productService.GetProductsAsync(tenantId, finalStoreId, includeStock);
        return Ok(products);
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetProduct(Guid id)
    {
        var product = await _productService.GetProductByIdAsync(id);
        if (product == null)
            return NotFound();

        return Ok(product);
    }

    [HttpGet("by-code/{code}")]
    public async Task<IActionResult> GetProductByCode(string code)
    {
        var tenantId = GetCurrentTenantId();
        var product = await _productService.GetProductByCodeAsync(code, tenantId);
        if (product == null)
            return NotFound();

        return Ok(product);
    }

    [HttpPost]
    public async Task<IActionResult> CreateProduct([FromBody] CreateProductRequest request)
    {
        var tenantId = GetCurrentTenantId();
        var userId = GetCurrentUserId();
        var storeId = GetCurrentStoreId();

        // 1. Crear el producto
        var product = await _productService.CreateProductAsync(request, tenantId, userId);

        // 2. Inicializar su inventario automáticamente
        try
        {
            var inventoryServiceUrl = _configuration["Services:Inventory:Url"] ?? "http://localhost:5001";
            var client = _httpClientFactory.CreateClient();

            // Copiar el token de autenticación
            var token = Request.Headers["Authorization"].ToString().Replace("Bearer ", "");
            client.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);

            var inventoryRequest = new
            {
                ProductId = product.Id,
                MinimumStock = 10
            };

            var response = await client.PostAsJsonAsync($"{inventoryServiceUrl}/api/inventory/store-inventory", inventoryRequest);

            if (!response.IsSuccessStatusCode)
            {
                // Log el error pero no fallar la creación del producto
                _logger.LogWarning("Failed to initialize inventory for product {ProductId}. Status: {StatusCode}", product.Id, response.StatusCode);
            }
        }
        catch (Exception ex)
        {
            // Log el error pero no fallar la creación del producto
            _logger.LogError(ex, "Exception initializing inventory for product {ProductId}", product.Id);
        }

        return CreatedAtAction(nameof(GetProduct), new { id = product.Id }, product);
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> UpdateProduct(Guid id, [FromBody] UpdateProductRequest request)
    {
        var userId = GetCurrentUserId();
        try
        {
            var product = await _productService.UpdateProductAsync(id, request, userId);
            return Ok(product);
        }
        catch (InvalidOperationException)
        {
            return NotFound();
        }
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> DeleteProduct(Guid id)
    {
        var userId = GetCurrentUserId();
        var result = await _productService.DeleteProductAsync(id, userId);
        if (!result)
            return NotFound();

        return NoContent();
    }

    [HttpGet("search")]
    [Authorize(Policy = "AllowServiceAuth")]
    public async Task<IActionResult> SearchProducts([FromQuery] string term, [FromQuery] bool includeStock = true)
    {
        if (string.IsNullOrWhiteSpace(term) || term.Length < 2)
            return Ok(Array.Empty<object>());

        var tenantId = GetCurrentTenantId();
        var storeId = GetCurrentStoreId();
        var products = await _productService.SearchProductsAsync(term, tenantId, storeId, includeStock);
        return Ok(products);
    }

    [HttpGet("{productId:guid}/conversions")]
    public async Task<IActionResult> GetProductConversions(Guid productId)
    {
        var conversions = await _productService.GetProductConversionsAsync(productId);
        return Ok(conversions);
    }

    [HttpPost("{productId:guid}/conversions")]
    public async Task<IActionResult> CreateProductConversion(Guid productId, [FromBody] CreateProductUOMConversionRequest request)
    {
        try
        {
            var userId = GetCurrentUserId();
            var conversion = await _productService.CreateProductConversionAsync(productId, request, userId);
            return CreatedAtAction(nameof(GetProductConversions), new { productId }, conversion);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpGet("{productId:guid}/purchase-uoms")]
    public async Task<IActionResult> GetProductPurchaseUOMs(Guid productId)
    {
        var purchaseUOMs = await _productService.GetProductPurchaseUOMsAsync(productId);
        return Ok(purchaseUOMs);
    }

    [HttpPost("{productId:guid}/purchase-uoms")]
    public async Task<IActionResult> AddProductPurchaseUOM(Guid productId, [FromBody] CreateProductPurchaseUOMRequest request)
    {
        try
        {
            var userId = GetCurrentUserId();
            var purchaseUOM = await _productService.AddProductPurchaseUOMAsync(productId, request, userId);
            return CreatedAtAction(nameof(GetProductPurchaseUOMs), new { productId }, purchaseUOM);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpDelete("{productId:guid}/purchase-uoms/{uomId:guid}")]
    public async Task<IActionResult> RemoveProductPurchaseUOM(Guid productId, Guid uomId)
    {
        var userId = GetCurrentUserId();
        var result = await _productService.RemoveProductPurchaseUOMAsync(productId, uomId, userId);
        if (!result)
            return NotFound();

        return NoContent();
    }

    [HttpGet("{productId:guid}/sale-uoms")]
    public async Task<IActionResult> GetProductSaleUOMs(Guid productId)
    {
        var saleUOMs = await _productService.GetProductSaleUOMsAsync(productId);
        return Ok(saleUOMs);
    }

    [HttpPost("{productId:guid}/sale-uoms")]
    public async Task<IActionResult> AddProductSaleUOM(Guid productId, [FromBody] CreateProductSaleUOMRequest request)
    {
        try
        {
            var userId = GetCurrentUserId();
            var saleUOM = await _productService.AddProductSaleUOMAsync(productId, request, userId);
            return CreatedAtAction(nameof(GetProductSaleUOMs), new { productId }, saleUOM);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpDelete("{productId:guid}/sale-uoms/{uomId:guid}")]
    public async Task<IActionResult> RemoveProductSaleUOM(Guid productId, Guid uomId)
    {
        var userId = GetCurrentUserId();
        var result = await _productService.RemoveProductSaleUOMAsync(productId, uomId, userId);
        if (!result)
            return NotFound();

        return NoContent();
    }

    [HttpPatch("{productId:guid}/purchase-price")]
    [Authorize(Policy = "AllowServiceAuth")]
    public async Task<IActionResult> UpdatePurchasePrice(Guid productId, [FromBody] UpdatePurchasePriceRequest request)
    {
        try
        {
            await _productService.UpdatePurchasePriceAsync(productId, request.PurchasePrice);
            return NoContent();
        }
        catch (InvalidOperationException)
        {
            return NotFound();
        }
    }
}
