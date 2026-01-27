using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Profitzen.Product.Application.DTOs;
using Profitzen.Product.Domain.Entities;
using Profitzen.Product.Infrastructure;

namespace Profitzen.Product.Application.Services;

public class PriceListService : IPriceListService
{
    private readonly ProductDbContext _context;
    private readonly ILogger<PriceListService> _logger;

    public PriceListService(ProductDbContext context, ILogger<PriceListService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<IEnumerable<PriceListDto>> GetAllAsync(string tenantId)
    {
        var priceLists = await _context.PriceLists
            .Where(p => p.TenantId == tenantId && p.DeletedAt == null)
            .OrderBy(p => p.Name)
            .ToListAsync();

        if (!priceLists.Any())
        {
            _logger.LogInformation("No price lists found for tenant {TenantId}. Creating default price list.", tenantId);
            
            var defaultList = new PriceList("Precio Base", "BASE", tenantId, "Lista de precios base", true);
            
            _context.PriceLists.Add(defaultList);
            await _context.SaveChangesAsync();
            
            priceLists.Add(defaultList);
        }

        return priceLists.Select(MapToDto);
    }

    public async Task<PriceListDto?> GetByIdAsync(Guid id, string tenantId)
    {
        var priceList = await _context.PriceLists
            .FirstOrDefaultAsync(p => p.Id == id && p.TenantId == tenantId && p.DeletedAt == null);

        return priceList == null ? null : MapToDto(priceList);
    }

    public async Task<PriceListDto?> GetByCodeAsync(string code, string tenantId)
    {
        var priceList = await _context.PriceLists
            .FirstOrDefaultAsync(p => p.Code == code && p.TenantId == tenantId && p.DeletedAt == null);

        return priceList == null ? null : MapToDto(priceList);
    }

    public async Task<PriceListDto?> GetDefaultAsync(string tenantId)
    {
        var priceList = await _context.PriceLists
            .FirstOrDefaultAsync(p => p.IsDefault && p.TenantId == tenantId && p.DeletedAt == null);

        return priceList == null ? null : MapToDto(priceList);
    }

    public async Task<PriceListDto> CreateAsync(CreatePriceListDto dto, string tenantId, string userId)
    {
        var existingCode = await _context.PriceLists
            .AnyAsync(p => p.Code == dto.Code && p.TenantId == tenantId && p.DeletedAt == null);

        if (existingCode)
        {
            throw new InvalidOperationException($"Price list with code '{dto.Code}' already exists");
        }

        if (dto.IsDefault)
        {
            var currentDefault = await _context.PriceLists
                .FirstOrDefaultAsync(p => p.IsDefault && p.TenantId == tenantId && p.DeletedAt == null);

            if (currentDefault != null)
            {
                currentDefault.RemoveAsDefault();
            }
        }

        var priceList = new PriceList(dto.Name, dto.Code, tenantId, dto.Description, dto.IsDefault);
        priceList.GetType().GetProperty("CreatedBy")?.SetValue(priceList, userId);

        _context.PriceLists.Add(priceList);
        await _context.SaveChangesAsync();

        _logger.LogInformation("Price list {Code} created for tenant {TenantId}", dto.Code, tenantId);

        return MapToDto(priceList);
    }

    public async Task<PriceListDto> UpdateAsync(Guid id, UpdatePriceListDto dto, string tenantId, string userId)
    {
        var priceList = await _context.PriceLists
            .FirstOrDefaultAsync(p => p.Id == id && p.TenantId == tenantId && p.DeletedAt == null);

        if (priceList == null)
        {
            throw new InvalidOperationException("Price list not found");
        }

        priceList.Update(dto.Name, dto.Description);

        await _context.SaveChangesAsync();

        _logger.LogInformation("Price list {Id} updated for tenant {TenantId}", id, tenantId);

        return MapToDto(priceList);
    }

    public async Task<bool> SetAsDefaultAsync(Guid id, string tenantId, string userId)
    {
        var priceList = await _context.PriceLists
            .FirstOrDefaultAsync(p => p.Id == id && p.TenantId == tenantId && p.DeletedAt == null);

        if (priceList == null)
        {
            return false;
        }

        var currentDefault = await _context.PriceLists
            .FirstOrDefaultAsync(p => p.IsDefault && p.TenantId == tenantId && p.DeletedAt == null);

        if (currentDefault != null && currentDefault.Id != id)
        {
            currentDefault.RemoveAsDefault();
        }

        priceList.SetAsDefault();
        await _context.SaveChangesAsync();

        _logger.LogInformation("Price list {Id} set as default for tenant {TenantId}", id, tenantId);

        return true;
    }

    public async Task<bool> ActivateAsync(Guid id, string tenantId, string userId)
    {
        var priceList = await _context.PriceLists
            .FirstOrDefaultAsync(p => p.Id == id && p.TenantId == tenantId && p.DeletedAt == null);

        if (priceList == null)
        {
            return false;
        }

        priceList.Activate();
        await _context.SaveChangesAsync();

        _logger.LogInformation("Price list {Id} activated for tenant {TenantId}", id, tenantId);

        return true;
    }

    public async Task<bool> DeactivateAsync(Guid id, string tenantId, string userId)
    {
        var priceList = await _context.PriceLists
            .FirstOrDefaultAsync(p => p.Id == id && p.TenantId == tenantId && p.DeletedAt == null);

        if (priceList == null)
        {
            return false;
        }

        if (priceList.IsDefault)
        {
            throw new InvalidOperationException("Cannot deactivate the default price list");
        }

        priceList.Deactivate();
        await _context.SaveChangesAsync();

        _logger.LogInformation("Price list {Id} deactivated for tenant {TenantId}", id, tenantId);

        return true;
    }

    public async Task<bool> DeleteAsync(Guid id, string tenantId)
    {
        var priceList = await _context.PriceLists
            .FirstOrDefaultAsync(p => p.Id == id && p.TenantId == tenantId && p.DeletedAt == null);

        if (priceList == null)
        {
            return false;
        }

        if (priceList.IsDefault)
        {
            throw new InvalidOperationException("Cannot delete the default price list");
        }

        priceList.GetType().GetProperty("DeletedAt")?.SetValue(priceList, DateTime.UtcNow);
        await _context.SaveChangesAsync();

        _logger.LogInformation("Price list {Id} soft-deleted for tenant {TenantId}", id, tenantId);

        return true;
    }

    private static PriceListDto MapToDto(PriceList priceList)
    {
        return new PriceListDto
        {
            Id = priceList.Id,
            Name = priceList.Name,
            Code = priceList.Code,
            Description = priceList.Description,
            IsDefault = priceList.IsDefault,
            IsActive = priceList.IsActive,
            TenantId = priceList.TenantId,
            CreatedAt = priceList.CreatedAt,
            UpdatedAt = priceList.UpdatedAt
        };
    }
}
