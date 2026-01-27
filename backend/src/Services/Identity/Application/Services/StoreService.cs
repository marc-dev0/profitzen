using Microsoft.EntityFrameworkCore;
using Profitzen.Identity.Application.DTOs;
using Profitzen.Identity.Domain.Entities;
using Profitzen.Identity.Infrastructure;

namespace Profitzen.Identity.Application.Services;

public class StoreService : IStoreService
{
    private readonly IdentityDbContext _context;

    public StoreService(IdentityDbContext context)
    {
        _context = context;
    }

    public async Task<IEnumerable<StoreDto>> GetStoresAsync(string tenantId)
    {
        var stores = await _context.Stores
            .Where(s => s.TenantId == tenantId)
            .OrderBy(s => s.Name)
            .Select(s => new StoreDto(
                s.Id,
                s.Name,
                s.TenantId,
                s.Address,
                s.Phone,
                s.Email,
                s.IsActive,
                s.CreatedAt,
                s.UpdatedAt
            ))
            .ToListAsync();

        return stores;
    }

    public async Task<StoreDto?> GetStoreByIdAsync(Guid id)
    {
        var store = await _context.Stores
            .Where(s => s.Id == id)
            .Select(s => new StoreDto(
                s.Id,
                s.Name,
                s.TenantId,
                s.Address,
                s.Phone,
                s.Email,
                s.IsActive,
                s.CreatedAt,
                s.UpdatedAt
            ))
            .FirstOrDefaultAsync();

        return store;
    }

    public async Task<StoreDto> CreateStoreAsync(CreateStoreRequest request, string tenantId, Guid userId)
    {
        var store = new Store(
            request.Name,
            request.Address,
            request.Phone,
            request.Email
        );

        var existingTenant = await _context.Tenants.FirstOrDefaultAsync(t => t.Id == tenantId);
        if (existingTenant == null)
        {
            throw new InvalidOperationException("Tenant not found");
        }

        var storeTenantIdField = typeof(Store).GetProperty("TenantId");
        if (storeTenantIdField != null)
        {
            storeTenantIdField.SetValue(store, tenantId);
        }

        _context.Stores.Add(store);
        await _context.SaveChangesAsync();

        return new StoreDto(
            store.Id,
            store.Name,
            store.TenantId,
            store.Address,
            store.Phone,
            store.Email,
            store.IsActive,
            store.CreatedAt,
            store.UpdatedAt
        );
    }

    public async Task<StoreDto> UpdateStoreAsync(Guid id, UpdateStoreRequest request, Guid userId)
    {
        var store = await _context.Stores.FirstOrDefaultAsync(s => s.Id == id);
        if (store == null)
        {
            throw new InvalidOperationException("Store not found");
        }

        store.UpdateInfo(request.Name, request.Address, request.Phone, request.Email);
        await _context.SaveChangesAsync();

        return new StoreDto(
            store.Id,
            store.Name,
            store.TenantId,
            store.Address,
            store.Phone,
            store.Email,
            store.IsActive,
            store.CreatedAt,
            store.UpdatedAt
        );
    }

    public async Task<bool> ActivateStoreAsync(Guid id, Guid userId)
    {
        var store = await _context.Stores.FirstOrDefaultAsync(s => s.Id == id);
        if (store == null)
            return false;

        store.Activate();
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> DeactivateStoreAsync(Guid id, Guid userId)
    {
        var store = await _context.Stores.FirstOrDefaultAsync(s => s.Id == id);
        if (store == null)
            return false;

        store.Deactivate();
        await _context.SaveChangesAsync();
        return true;
    }
}
