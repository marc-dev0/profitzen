using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Profitzen.Product.Application.DTOs;
using Profitzen.Product.Application.Services;
using System.Security.Claims;

namespace Profitzen.Product.Controllers;

[ApiController]
[Route("api/categories")]
[Authorize]
public class CategoriesController : ControllerBase
{
    private readonly IProductService _productService;

    public CategoriesController(IProductService productService)
    {
        _productService = productService;
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

    [HttpGet]
    public async Task<IActionResult> GetCategories()
    {
        var tenantId = GetCurrentTenantId();
        var categories = await _productService.GetCategoriesAsync(tenantId);
        return Ok(categories);
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetCategory(Guid id)
    {
        var category = await _productService.GetCategoryByIdAsync(id);
        if (category == null)
            return NotFound();

        return Ok(category);
    }

    [HttpPost]
    public async Task<IActionResult> CreateCategory([FromBody] CreateCategoryRequest request)
    {
        var tenantId = GetCurrentTenantId();
        var userId = GetCurrentUserId();
        var category = await _productService.CreateCategoryAsync(request, tenantId, userId);
        return CreatedAtAction(nameof(GetCategory), new { id = category.Id }, category);
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> UpdateCategory(Guid id, [FromBody] UpdateCategoryRequest request)
    {
        var userId = GetCurrentUserId();
        try
        {
            var category = await _productService.UpdateCategoryAsync(id, request, userId);
            return Ok(category);
        }
        catch (InvalidOperationException)
        {
            return NotFound();
        }
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> DeleteCategory(Guid id)
    {
        var userId = GetCurrentUserId();
        var result = await _productService.DeleteCategoryAsync(id, userId);
        if (!result)
            return NotFound();

        return NoContent();
    }
}
