using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Profitzen.Product.Application.DTOs;
using Profitzen.Product.Application.Services;
using System.Security.Claims;

namespace Profitzen.Product.Controllers;

[ApiController]
[Route("api/price-lists")]
[Authorize]
public class PriceListController : ControllerBase
{
    private readonly IPriceListService _priceListService;
    private readonly ILogger<PriceListController> _logger;

    public PriceListController(IPriceListService priceListService, ILogger<PriceListController> logger)
    {
        _priceListService = priceListService;
        _logger = logger;
    }

    private string GetCurrentTenantId()
    {
        return User.FindFirst("TenantId")?.Value
            ?? throw new UnauthorizedAccessException("TenantId not found in token");
    }

    private string GetCurrentUserId()
    {
        return User.FindFirst(ClaimTypes.NameIdentifier)?.Value
            ?? throw new UnauthorizedAccessException("UserId not found in token");
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<PriceListDto>>> GetAll()
    {
        try
        {
            var tenantId = GetCurrentTenantId();
            var priceLists = await _priceListService.GetAllAsync(tenantId);
            return Ok(priceLists);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting price lists");
            return StatusCode(500, "Error retrieving price lists");
        }
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<PriceListDto>> GetById(Guid id)
    {
        try
        {
            var tenantId = GetCurrentTenantId();
            var priceList = await _priceListService.GetByIdAsync(id, tenantId);

            if (priceList == null)
            {
                return NotFound($"Price list with ID {id} not found");
            }

            return Ok(priceList);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting price list {Id}", id);
            return StatusCode(500, "Error retrieving price list");
        }
    }

    [HttpGet("code/{code}")]
    public async Task<ActionResult<PriceListDto>> GetByCode(string code)
    {
        try
        {
            var tenantId = GetCurrentTenantId();
            var priceList = await _priceListService.GetByCodeAsync(code, tenantId);

            if (priceList == null)
            {
                return NotFound($"Price list with code '{code}' not found");
            }

            return Ok(priceList);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting price list by code {Code}", code);
            return StatusCode(500, "Error retrieving price list");
        }
    }

    [HttpGet("default")]
    public async Task<ActionResult<PriceListDto>> GetDefault()
    {
        try
        {
            var tenantId = GetCurrentTenantId();
            var priceList = await _priceListService.GetDefaultAsync(tenantId);

            if (priceList == null)
            {
                return NotFound("No default price list found");
            }

            return Ok(priceList);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting default price list");
            return StatusCode(500, "Error retrieving default price list");
        }
    }

    [HttpPost]
    public async Task<ActionResult<PriceListDto>> Create([FromBody] CreatePriceListDto dto)
    {
        try
        {
            var tenantId = GetCurrentTenantId();
            var userId = GetCurrentUserId();
            var priceList = await _priceListService.CreateAsync(dto, tenantId, userId);
            return CreatedAtAction(nameof(GetById), new { id = priceList.Id }, priceList);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating price list");
            return StatusCode(500, "Error creating price list");
        }
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<PriceListDto>> Update(Guid id, [FromBody] UpdatePriceListDto dto)
    {
        try
        {
            var tenantId = GetCurrentTenantId();
            var userId = GetCurrentUserId();
            var priceList = await _priceListService.UpdateAsync(id, dto, tenantId, userId);
            return Ok(priceList);
        }
        catch (InvalidOperationException ex)
        {
            return NotFound(ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating price list {Id}", id);
            return StatusCode(500, "Error updating price list");
        }
    }

    [HttpPost("{id}/set-default")]
    public async Task<ActionResult> SetAsDefault(Guid id)
    {
        try
        {
            var tenantId = GetCurrentTenantId();
            var userId = GetCurrentUserId();
            var result = await _priceListService.SetAsDefaultAsync(id, tenantId, userId);

            if (!result)
            {
                return NotFound($"Price list with ID {id} not found");
            }

            return NoContent();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error setting price list {Id} as default", id);
            return StatusCode(500, "Error setting price list as default");
        }
    }

    [HttpPost("{id}/activate")]
    public async Task<ActionResult> Activate(Guid id)
    {
        try
        {
            var tenantId = GetCurrentTenantId();
            var userId = GetCurrentUserId();
            var result = await _priceListService.ActivateAsync(id, tenantId, userId);

            if (!result)
            {
                return NotFound($"Price list with ID {id} not found");
            }

            return NoContent();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error activating price list {Id}", id);
            return StatusCode(500, "Error activating price list");
        }
    }

    [HttpPost("{id}/deactivate")]
    public async Task<ActionResult> Deactivate(Guid id)
    {
        try
        {
            var tenantId = GetCurrentTenantId();
            var userId = GetCurrentUserId();
            var result = await _priceListService.DeactivateAsync(id, tenantId, userId);

            if (!result)
            {
                return NotFound($"Price list with ID {id} not found");
            }

            return NoContent();
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deactivating price list {Id}", id);
            return StatusCode(500, "Error deactivating price list");
        }
    }

    [HttpDelete("{id}")]
    public async Task<ActionResult> Delete(Guid id)
    {
        try
        {
            var tenantId = GetCurrentTenantId();
            var result = await _priceListService.DeleteAsync(id, tenantId);

            if (!result)
            {
                return NotFound($"Price list with ID {id} not found");
            }

            return NoContent();
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting price list {Id}", id);
            return StatusCode(500, "Error deleting price list");
        }
    }
}
