using Microsoft.EntityFrameworkCore;
using Profitzen.Inventory.Application.DTOs;
using Profitzen.Inventory.Domain.Entities;
using Profitzen.Inventory.Domain.Enums;
using Profitzen.Inventory.Infrastructure;
using Profitzen.Common.Http;
using System.Net.Http.Headers;
using System.Text.Json;

namespace Profitzen.Inventory.Application.Services;

public class InventoryService : IInventoryService
{
    private readonly InventoryDbContext _context;
    private readonly ServiceHttpClient _serviceHttpClient;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IConfiguration _configuration;
    private readonly ILogger<InventoryService> _logger;
    // TODO: Fix DI issue and re-enable
    // private readonly IMasterDataCacheService _masterDataCache;

    public InventoryService(
        InventoryDbContext context,
        ServiceHttpClient serviceHttpClient,
        IHttpClientFactory httpClientFactory,
        IConfiguration configuration,
        ILogger<InventoryService> logger)
        // IMasterDataCacheService masterDataCache)
    {
        _context = context;
        _serviceHttpClient = serviceHttpClient;
        _httpClientFactory = httpClientFactory;
        _configuration = configuration;
        _logger = logger;
        // _masterDataCache = masterDataCache;
    }

    private async Task<ProductInfo?> GetProductFromServiceAsync(Guid productId, string tenantId)
    {
        var productServiceUrl = _configuration["Services:ProductService:Url"] ?? "http://localhost:5005";

        try
        {
            var client = _serviceHttpClient.CreateClient(tenantId: tenantId);
            var response = await client.GetAsync($"{productServiceUrl}/api/products/{productId}");

            if (response.IsSuccessStatusCode)
            {
                var json = await response.Content.ReadAsStringAsync();
                var product = JsonSerializer.Deserialize<ProductInfo>(json, new JsonSerializerOptions
                {
                    PropertyNameCaseInsensitive = true
                });
                return product;
            }
            else
            {
                _logger.LogWarning("Failed to get product {ProductId} from Product service. Status: {StatusCode}",
                    productId, response.StatusCode);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error calling Product service for product {ProductId}", productId);
        }

        return null;
    }

    private async Task<ProductFullInfo?> GetProductFullInfoFromServiceAsync(Guid productId, string? token = null)
    {
        var productServiceUrl = _configuration["Services:ProductService:Url"] ?? "http://localhost:5005";
        var client = _httpClientFactory.CreateClient();

        if (!string.IsNullOrEmpty(token))
        {
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        }

        try
        {
            var response = await client.GetAsync($"{productServiceUrl}/api/products/{productId}");
            if (response.IsSuccessStatusCode)
            {
                var json = await response.Content.ReadAsStringAsync();
                var product = JsonSerializer.Deserialize<ProductFullInfo>(json, new JsonSerializerOptions
                {
                    PropertyNameCaseInsensitive = true
                });
                return product;
            }
        }
        catch
        {
        }

        return null;
    }

    private record ProductInfo(string Code, string Name, string? CategoryName, decimal PurchasePrice = 0, string? Barcode = null, string? ShortScanCode = null, List<ProductPurchaseUOMInfo>? PurchaseUOMs = null, List<ProductSaleUOMInfo>? SaleUOMs = null);

    private record ProductFullInfo(
        Guid Id,
        string Code,
        string Name,
        string? CategoryName,
        decimal PurchasePrice,
        decimal SalePrice,
        Guid BaseUOMId,
        string? BaseUOMCode,
        string? BaseUOMName,
        List<ProductPurchaseUOMInfo>? PurchaseUOMs,
        List<ProductSaleUOMInfo>? SaleUOMs,
        bool IsActive = true
    );

    private record InternalProductResponse(
        Guid Id,
        string Code,
        string Name,
        string? CategoryName,
        decimal PurchasePrice,
        decimal SalePrice,
        bool IsActive,
        string? Barcode,
        string? ShortScanCode,
        List<ProductSaleUOMInfo>? SaleUOMs
    );

    private record ProductPurchaseUOMInfo(Guid UOMId, string? UOMCode, string? UOMName, decimal ConversionToBase, bool IsDefault);
    private record ProductSaleUOMInfo(Guid UOMId, string? UOMCode, string? UOMName, decimal ConversionToBase, bool IsDefault, decimal Price, List<ProductPriceInfo>? Prices = null);
    private record ProductPriceInfo(Guid PriceListId, string PriceListCode, string PriceListName, decimal Price);

    private async Task<(string Code, string Name)?> GetUOMDetailsAsync(Guid uomId, string tenantId)
    {
        var masterDataUrl = _configuration["Services:MasterData:Url"] ?? "http://localhost:5007";
        try
        {
            var client = _serviceHttpClient.CreateClient(tenantId: tenantId);
            var response = await client.GetAsync($"{masterDataUrl}/api/master-data/values/by-id/{uomId}");
            if (response.IsSuccessStatusCode)
            {
                var json = await response.Content.ReadAsStringAsync();
                var uomData = JsonSerializer.Deserialize<UOMResponse>(json, new JsonSerializerOptions
                {
                    PropertyNameCaseInsensitive = true
                });
                if (uomData != null)
                {
                    return (uomData.Code, uomData.Name);
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to get UOM details for {UOMId}", uomId);
        }
        return null;
    }

    private record UOMResponse(Guid Id, string Code, string Name);


    public async Task<IEnumerable<StoreInventoryDto>> GetLowStockProductsAsync(Guid storeId, string? token = null)
    {
        var inventoryItems = await _context.StoreInventories
            .Where(si => si.StoreId == storeId && si.CurrentStock <= si.MinimumStock)
            .ToListAsync();

        var result = new List<StoreInventoryDto>();

        foreach (var item in inventoryItems)
        {
            var product = await GetProductFromServiceAsync(item.ProductId, item.TenantId);
            if (product != null)
            {
                result.Add(new StoreInventoryDto(
                    item.Id,
                    item.ProductId,
                    product.Code,
                    product.Name,
                    product.CategoryName,
                    item.StoreId,
                    item.CurrentStock,
                    item.MinimumStock,
                    item.IsLowStock(),
                    item.CreatedAt,
                    null, null, product.PurchasePrice
                ));
            }
        }

        return result;
    }

    public async Task<IEnumerable<StoreInventoryDto>> GetStoreInventoryAsync(Guid storeId, string? token = null)
    {
        var inventoryItems = await _context.StoreInventories
            .Where(si => si.StoreId == storeId)
            .ToListAsync();

        var result = new List<StoreInventoryDto>();

        foreach (var item in inventoryItems)
        {
            var product = await GetProductFromServiceAsync(item.ProductId, item.TenantId);
            if (product != null)
            {
                result.Add(new StoreInventoryDto(
                    item.Id,
                    item.ProductId,
                    product.Code,
                    product.Name,
                    product.CategoryName,
                    item.StoreId,
                    item.CurrentStock,
                    item.MinimumStock,
                    item.IsLowStock(),
                    item.CreatedAt,
                    null, null, product.PurchasePrice
                ));
            }
        }

        return result;
    }

    public async Task<StoreInventoryDto> CreateStoreInventoryAsync(CreateStoreInventoryRequest request, Guid storeId, string tenantId, Guid userId, string? token = null)
    {
        var existingInventory = await _context.StoreInventories
            .FirstOrDefaultAsync(si => si.ProductId == request.ProductId && si.StoreId == storeId);

        if (existingInventory != null)
            throw new InvalidOperationException("Store inventory for this product already exists");

        var storeInventory = new StoreInventory(tenantId, request.ProductId, storeId, request.MinimumStock);
        _context.StoreInventories.Add(storeInventory);
        await _context.SaveChangesAsync();

        return await GetStoreInventoryByIdAsync(storeInventory.Id, token)
            ?? throw new InvalidOperationException("Failed to retrieve created store inventory");
    }

    public async Task<StoreInventoryDto?> GetStoreInventoryByIdAsync(Guid id, string? token = null)
    {
        var storeInventory = await _context.StoreInventories
            .FirstOrDefaultAsync(si => si.Id == id);

        if (storeInventory == null)
            return null;

        var product = await GetProductFromServiceAsync(storeInventory.ProductId, storeInventory.TenantId);
        if (product == null)
            return null;

        return new StoreInventoryDto(
            storeInventory.Id,
            storeInventory.ProductId,
            product.Code,
            product.Name,
            product.CategoryName,
            storeInventory.StoreId,
            storeInventory.CurrentStock,
            storeInventory.MinimumStock,
            storeInventory.IsLowStock(),
            storeInventory.CreatedAt,
            null, null, product?.PurchasePrice ?? 0
        );
    }

    public async Task<StoreInventoryDto?> GetStoreInventoryByProductIdAsync(Guid productId, Guid storeId)
    {
        _logger.LogInformation("GetStoreInventoryByProductIdAsync called. ProductId: {ProductId}, StoreId: {StoreId}",
            productId, storeId);

        var storeInventory = await _context.StoreInventories
            .FirstOrDefaultAsync(si => si.ProductId == productId && si.StoreId == storeId);

        if (storeInventory == null)
        {
            // Log available inventories for debugging
            var availableInventories = await _context.StoreInventories
                .Where(si => si.ProductId == productId)
                .Select(si => new { si.Id, si.ProductId, si.StoreId, si.TenantId, si.CurrentStock })
                .ToListAsync();

            _logger.LogWarning("No inventory found for ProductId: {ProductId}, StoreId: {StoreId}. Available inventories for this product: {@Inventories}",
                productId, storeId, availableInventories);

            return null;
        }

        _logger.LogInformation("Found inventory. Id: {Id}, CurrentStock: {Stock}, TenantId: {TenantId}",
            storeInventory.Id, storeInventory.CurrentStock, storeInventory.TenantId);

        // Try to get product info, but don't fail if not available
        var product = await GetProductFromServiceAsync(storeInventory.ProductId, storeInventory.TenantId);
        var productCode = product?.Code ?? string.Empty;
        var productName = product?.Name ?? string.Empty;
        var categoryName = product?.CategoryName;

        return new StoreInventoryDto(
            storeInventory.Id,
            storeInventory.ProductId,
            productCode,
            productName,
            categoryName,
            storeInventory.StoreId,
            storeInventory.CurrentStock,
            storeInventory.MinimumStock,
            storeInventory.IsLowStock(),
            storeInventory.CreatedAt,
            null, null, product?.PurchasePrice ?? 0
        );
    }

    public async Task<IEnumerable<StoreInventoryDto>> GetInventoriesByProductIdAsync(Guid productId, string tenantId)
    {
        var inventories = await _context.StoreInventories
            .Where(si => si.ProductId == productId && si.TenantId == tenantId)
            .ToListAsync();

        return inventories.Select(inventory => new StoreInventoryDto(
            inventory.Id,
            inventory.ProductId,
            string.Empty,
            string.Empty,
            null,
            inventory.StoreId,
            inventory.CurrentStock,
            inventory.MinimumStock,
            inventory.IsLowStock(),
            inventory.CreatedAt,
            null, null, 0
        )).ToList();
    }

    public async Task<StoreInventoryDto> UpdateStockAsync(Guid storeInventoryId, UpdateStockRequest request, string tenantId, Guid userId, string? token = null)
    {
        var storeInventory = await _context.StoreInventories.FindAsync(storeInventoryId);
        if (storeInventory == null)
            throw new InvalidOperationException("Store inventory not found");

        var movement = new InventoryMovement(
            tenantId,
            storeInventoryId,
            request.NewStock - storeInventory.CurrentStock,
            InventoryMovementType.Adjustment,
            request.Reason,
            userId
        );

        storeInventory.UpdateStock(request.NewStock);
        _context.InventoryMovements.Add(movement);
        await _context.SaveChangesAsync();

        return await GetStoreInventoryByIdAsync(storeInventoryId, token)
            ?? throw new InvalidOperationException("Failed to retrieve updated store inventory");
    }

    public async Task<StoreInventoryDto> AddStockAsync(Guid storeInventoryId, StockMovementRequest request, string tenantId, Guid userId, string? token = null)
    {
        var storeInventory = await _context.StoreInventories.FindAsync(storeInventoryId);
        if (storeInventory == null)
            throw new InvalidOperationException("Store inventory not found");

        var movement = new InventoryMovement(
            tenantId,
            storeInventoryId,
            request.Quantity,
            InventoryMovementType.Entry,
            request.Reason,
            userId,
            request.UOMId,
            request.UOMCode,
            request.OriginalQuantity,
            request.ConversionFactor
        );

        storeInventory.AddStock(request.Quantity);
        _context.InventoryMovements.Add(movement);
        await _context.SaveChangesAsync();

        return await GetStoreInventoryByIdAsync(storeInventoryId, token)
            ?? throw new InvalidOperationException("Failed to retrieve updated store inventory");
    }

    public async Task<StoreInventoryDto> RemoveStockAsync(Guid storeInventoryId, StockMovementRequest request, string tenantId, Guid userId, string? token = null)
    {
        var storeInventory = await _context.StoreInventories.FindAsync(storeInventoryId);
        if (storeInventory == null)
            throw new InvalidOperationException("Store inventory not found");

        var movement = new InventoryMovement(
            tenantId,
            storeInventoryId,
            -request.Quantity,
            InventoryMovementType.Exit,
            request.Reason,
            userId,
            request.UOMId,
            request.UOMCode,
            request.OriginalQuantity,
            request.ConversionFactor
        );

        storeInventory.RemoveStock(request.Quantity);
        _context.InventoryMovements.Add(movement);
        await _context.SaveChangesAsync();

        return await GetStoreInventoryByIdAsync(storeInventoryId, token)
            ?? throw new InvalidOperationException("Failed to retrieve updated store inventory");
    }

    public async Task<StoreInventoryDto> UpdateMinimumStockAsync(Guid storeInventoryId, int minimumStock, string? token = null)
    {
        var storeInventory = await _context.StoreInventories.FindAsync(storeInventoryId);
        if (storeInventory == null)
            throw new InvalidOperationException("Store inventory not found");

        storeInventory.UpdateMinimumStock(minimumStock);
        await _context.SaveChangesAsync();

        return await GetStoreInventoryByIdAsync(storeInventoryId, token)
            ?? throw new InvalidOperationException("Failed to retrieve updated store inventory");
    }

    // Suppliers
    public async Task<IEnumerable<SupplierDto>> GetSuppliersAsync(string tenantId)
    {
        return await _context.Suppliers
            .Where(s => s.TenantId == tenantId && s.IsActive)
            .Select(s => new SupplierDto(
                s.Id,
                s.Code,
                s.Name,
                s.ContactName,
                s.Phone,
                s.Email,
                s.Address,
                s.TaxId,
                s.IsActive,
                s.CreatedAt
            ))
            .ToListAsync();
    }

    public async Task<SupplierDto?> GetSupplierByIdAsync(Guid id)
    {
        var supplier = await _context.Suppliers.FindAsync(id);

        return supplier == null ? null : new SupplierDto(
            supplier.Id,
            supplier.Code,
            supplier.Name,
            supplier.ContactName,
            supplier.Phone,
            supplier.Email,
            supplier.Address,
            supplier.TaxId,
            supplier.IsActive,
            supplier.CreatedAt
        );
    }

    public async Task<SupplierDto> CreateSupplierAsync(CreateSupplierRequest request, string tenantId, Guid userId)
    {
        // Generate supplier code automatically
        var lastSupplier = await _context.Suppliers
            .Where(s => s.TenantId == tenantId)
            .OrderByDescending(s => s.CreatedAt)
            .FirstOrDefaultAsync();

        var supplierCode = lastSupplier == null
            ? "SUP-0001"
            : $"SUP-{int.Parse(lastSupplier.Code.Split('-')[1]) + 1:D4}";

        var supplier = new Supplier(
            supplierCode,
            request.Name,
            request.ContactName,
            request.Phone,
            request.Email,
            request.Address,
            request.TaxId,
            tenantId
        );

        _context.Suppliers.Add(supplier);
        await _context.SaveChangesAsync();

        return await GetSupplierByIdAsync(supplier.Id)
            ?? throw new InvalidOperationException("Failed to retrieve created supplier");
    }

    public async Task<SupplierDto> UpdateSupplierAsync(Guid id, UpdateSupplierRequest request, Guid userId)
    {
        var supplier = await _context.Suppliers.FindAsync(id);
        if (supplier == null)
            throw new InvalidOperationException("Supplier not found");

        supplier.UpdateDetails(
            request.Name,
            request.ContactName,
            request.Phone,
            request.Email,
            request.Address,
            request.TaxId
        );

        if (request.IsActive)
            supplier.Activate();
        else
            supplier.Deactivate();

        await _context.SaveChangesAsync();

        return await GetSupplierByIdAsync(id)
            ?? throw new InvalidOperationException("Failed to retrieve updated supplier");
    }

    public async Task<bool> DeleteSupplierAsync(Guid id, Guid userId)
    {
        var supplier = await _context.Suppliers.FindAsync(id);
        if (supplier == null)
            return false;

        supplier.Deactivate();
        await _context.SaveChangesAsync();
        return true;
    }

    // Purchases
    public async Task<IEnumerable<PurchaseDto>> GetPurchasesAsync(Guid storeId, string? token = null)
    {
        var purchases = await _context.Purchases
            .Include(p => p.Supplier)
            .Include(p => p.Details)
            .Where(p => p.StoreId == storeId)
            .OrderByDescending(p => p.PurchaseDate)
            .ToListAsync();

        var result = new List<PurchaseDto>();

        // Get tenantId from first purchase (all purchases in result should have same tenant)
        var tenantId = purchases.FirstOrDefault()?.StoreId.ToString();

        foreach (var purchase in purchases)
        {
            var details = new List<PurchaseDetailDto>();
            foreach (var detail in purchase.Details)
            {
                var product = await GetProductFromServiceAsync(detail.ProductId, detail.TenantId);
                if (product != null)
                {
                    var uom = await GetUOMDetailsAsync(detail.UOMId, detail.TenantId);
                    (string Code, string Name)? bonusUom = null;
                    if (detail.BonusUOMId.HasValue)
                    {
                        bonusUom = await GetUOMDetailsAsync(detail.BonusUOMId.Value, detail.TenantId);
                    }

                    details.Add(new PurchaseDetailDto(
                        detail.Id,
                        detail.ProductId,
                        product.Code,
                        product.Name,
                        detail.UOMId,
                        uom?.Code,
                        uom?.Name,
                        detail.Quantity,
                        detail.UnitPrice,
                        detail.Subtotal,
                        detail.BonusQuantity,
                        detail.BonusUOMId,
                        bonusUom?.Code,
                        bonusUom?.Name,
                        product.Barcode
                    ));
                }
            }

            result.Add(new PurchaseDto(
                purchase.Id,
                purchase.PurchaseNumber,
                purchase.SupplierId,
                purchase.Supplier.Name,
                purchase.StoreId,
                purchase.DocumentType,
                purchase.PurchaseDate,
                purchase.Status,
                purchase.ReceivedDate,
                purchase.ReceivedByUserId,
                purchase.TotalAmount,
                purchase.InvoiceNumber,
                purchase.Notes,
                details,
                purchase.CreatedAt
            ));
        }

        return result;
    }

    public async Task<PurchaseDto?> GetPurchaseByIdAsync(Guid id, string? tenantId = null, string? token = null)
    {
        var purchase = await _context.Purchases
            .Include(p => p.Supplier)
            .Include(p => p.Details)
            .FirstOrDefaultAsync(p => p.Id == id);

        if (purchase == null)
            return null;

        var details = new List<PurchaseDetailDto>();
        foreach (var detail in purchase.Details)
        {
            var product = await GetProductFromServiceAsync(detail.ProductId, detail.TenantId);
            if (product != null)
            {
                var uom = await GetUOMDetailsAsync(detail.UOMId, detail.TenantId);
                (string Code, string Name)? bonusUom = null;
                if (detail.BonusUOMId.HasValue)
                {
                     bonusUom = await GetUOMDetailsAsync(detail.BonusUOMId.Value, detail.TenantId);
                }

                details.Add(new PurchaseDetailDto(
                    detail.Id,
                    detail.ProductId,
                    product.Code,
                    product.Name,
                    detail.UOMId,
                    uom?.Code,
                    uom?.Name,
                    detail.Quantity,
                    detail.UnitPrice,
                    detail.Subtotal,
                    detail.BonusQuantity,
                    detail.BonusUOMId,
                    bonusUom?.Code,
                    bonusUom?.Name,
                    product.Barcode
                ));
            }
        }

        return new PurchaseDto(
            purchase.Id,
            purchase.PurchaseNumber,
            purchase.SupplierId,
            purchase.Supplier.Name,
            purchase.StoreId,
            purchase.DocumentType,
            purchase.PurchaseDate,
            purchase.Status,
            purchase.ReceivedDate,
            purchase.ReceivedByUserId,
            purchase.TotalAmount,
            purchase.InvoiceNumber,
            purchase.Notes,
            details,
            purchase.CreatedAt
        );
    }

    public async Task<PurchaseDto> CreatePurchaseAsync(CreatePurchaseRequest request, Guid storeId, string tenantId, Guid userId, string? token = null)
    {
        var purchaseDate = request.PurchaseDate.Kind == DateTimeKind.Utc
            ? request.PurchaseDate
            : request.PurchaseDate.ToUniversalTime();

        string purchaseNumber;
        string? invoiceNumber = null;

        if (!string.IsNullOrWhiteSpace(request.InvoiceNumber))
        {
            purchaseNumber = request.InvoiceNumber;
            invoiceNumber = request.InvoiceNumber;
        }
        else
        {
            var count = await _context.Purchases.CountAsync();
            purchaseNumber = $"COMP-{(count + 1).ToString().PadLeft(6, '0')}";
        }

        var purchase = new Purchase(
            tenantId,
            purchaseNumber,
            request.SupplierId,
            storeId,
            request.DocumentType,
            purchaseDate,
            invoiceNumber,
            request.Notes,
            userId
        );

        _context.Purchases.Add(purchase);
        await _context.SaveChangesAsync();

        // Add details (do NOT update inventory yet - only when marked as Received)
        foreach (var detailRequest in request.Details)
        {
            var detail = new PurchaseDetail(
                tenantId,
                purchase.Id,
                detailRequest.ProductId,
                detailRequest.UOMId,
                detailRequest.Quantity,
                detailRequest.UnitPrice,
                detailRequest.BonusQuantity,
                detailRequest.BonusUOMId
            );

            purchase.AddDetail(detail);
            _context.PurchaseDetails.Add(detail);
        }

        purchase.CalculateTotal();
        await _context.SaveChangesAsync();

        return await GetPurchaseByIdAsync(purchase.Id, tenantId, token)
            ?? throw new InvalidOperationException("Failed to retrieve created purchase");
    }

    public async Task<PurchaseDto> MarkPurchaseAsReceivedAsync(Guid purchaseId, Guid userId, string tenantId, string? token = null)
    {
        var purchase = await _context.Purchases
            .Include(p => p.Details)
            .Include(p => p.Supplier)
            .FirstOrDefaultAsync(p => p.Id == purchaseId);

        if (purchase == null)
            throw new InvalidOperationException("Purchase not found");

        purchase.MarkAsReceived(userId);

        // Now update inventory for each detail
        foreach (var detail in purchase.Details)
        {
            var productInfo = await GetProductFullInfoFromServiceAsync(detail.ProductId, token);
            if (productInfo == null)
                continue;

            // Calculate quantity in base UOM
            var purchaseUOM = productInfo.PurchaseUOMs?.FirstOrDefault(u => u.UOMId == detail.UOMId);
            var purchaseConversion = purchaseUOM?.ConversionToBase ?? 1m;
            var quantityInBaseUOM = detail.Quantity * purchaseConversion;

            // Add bonus quantity if exists
            if (detail.BonusQuantity.HasValue && detail.BonusQuantity.Value > 0 && detail.BonusUOMId.HasValue)
            {
                var bonusUOM = productInfo.PurchaseUOMs?.FirstOrDefault(u => u.UOMId == detail.BonusUOMId.Value);
                var bonusConversion = bonusUOM?.ConversionToBase ?? 1m;
                quantityInBaseUOM += detail.BonusQuantity.Value * bonusConversion;
            }

            var quantityInt = (int)Math.Ceiling(quantityInBaseUOM);

            // Find or create store inventory
            var storeInventory = await _context.StoreInventories
                .FirstOrDefaultAsync(si => si.ProductId == detail.ProductId && si.StoreId == purchase.StoreId);

            if (storeInventory == null)
            {
                storeInventory = new StoreInventory(tenantId, detail.ProductId, purchase.StoreId, 10);
                _context.StoreInventories.Add(storeInventory);
                await _context.SaveChangesAsync();
            }

            var uomData = await GetUOMDetailsAsync(detail.UOMId, tenantId);
            var uomCode = uomData?.Code;

            var movement = new InventoryMovement(
                tenantId,
                storeInventory.Id,
                quantityInt,
                InventoryMovementType.Entry,
                $"Compra {purchase.PurchaseNumber} recibida",
                userId,
                detail.UOMId,
                uomCode,
                (int)detail.Quantity,
                (int)purchaseConversion
            );

            storeInventory.AddStock(quantityInt);
            _context.InventoryMovements.Add(movement);
        }

        await _context.SaveChangesAsync();

        // Update product purchase prices with base unit prices
        var productPricesToUpdate = new List<(Guid ProductId, decimal BasePrice)>();
        
        foreach (var detail in purchase.Details)
        {
            var productInfo = await GetProductFullInfoFromServiceAsync(detail.ProductId, token);
            if (productInfo != null)
            {
                var purchaseUOM = productInfo.PurchaseUOMs?.FirstOrDefault(u => u.UOMId == detail.UOMId);
                var purchaseConversion = purchaseUOM?.ConversionToBase ?? 1m;
                var baseUnitPrice = detail.UnitPrice / (purchaseConversion > 0 ? purchaseConversion : 1m);
                productPricesToUpdate.Add((detail.ProductId, baseUnitPrice));
            }
        }

        foreach (var priceInfo in productPricesToUpdate)
        {
            await UpdateProductPurchasePriceAsync(priceInfo.ProductId, priceInfo.BasePrice, tenantId);
        }

        return await GetPurchaseByIdAsync(purchaseId, tenantId, token)
            ?? throw new InvalidOperationException("Failed to retrieve updated purchase");
    }

    public async Task<Dictionary<Guid, decimal>> GetLastPurchasePricesAsync(string tenantId)
    {
        var lastPrices = await _context.PurchaseDetails
            .Include(pd => pd.Purchase)
                .ThenInclude(p => p.Supplier)
            .Where(pd => pd.Purchase.Supplier.TenantId == tenantId)
            .GroupBy(pd => pd.ProductId)
            .Select(g => new
            {
                ProductId = g.Key,
                LastPrice = g.OrderByDescending(pd => pd.Purchase.PurchaseDate)
                             .ThenByDescending(pd => pd.CreatedAt)
                             .Select(pd => pd.UnitPrice)
                             .FirstOrDefault()
            })
            .ToDictionaryAsync(x => x.ProductId, x => x.LastPrice);

        return lastPrices;
    }

    private async Task UpdateProductPurchasePriceAsync(Guid productId, decimal basePrice, string tenantId)
    {
        var productServiceUrl = _configuration["Services:ProductService:Url"] ?? "http://localhost:5005";
        var serviceApiKey = _configuration["Services:ApiKey"] ?? "internal-service-key-change-in-production";

        try
        {
            var client = _httpClientFactory.CreateClient();
            client.DefaultRequestHeaders.Add("X-Service-Key", serviceApiKey);
            client.DefaultRequestHeaders.Add("X-Tenant-Id", tenantId);

            var requestBody = new
            {
                PurchasePrice = basePrice
            };

            var response = await client.PatchAsJsonAsync(
                $"{productServiceUrl}/api/products/{productId}/purchase-price",
                requestBody
            );

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning("Failed to update purchase price for product {ProductId}. Status: {StatusCode}", 
                    productId, response.StatusCode);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Exception updating purchase price for product {ProductId}", productId);
        }
    }

    public async Task<IEnumerable<DocumentSeriesDto>> GetDocumentSeriesAsync(string tenantId, Guid storeId, string? documentType = null)
    {
        var query = _context.DocumentSeries
            .Where(ds => ds.TenantId == tenantId && ds.IsActive);

        if (!string.IsNullOrEmpty(documentType))
            query = query.Where(ds => ds.DocumentType == documentType);

        return await query
            .Select(ds => new DocumentSeriesDto(
                ds.Id,
                ds.SeriesCode,
                ds.DocumentType,
                ds.DocumentTypeName,
                ds.CurrentNumber,
                ds.StoreId,
                ds.IsActive,
                ds.IsDefault,
                ds.CreatedAt
            ))
            .ToListAsync();
    }

    public async Task<DocumentSeriesDto?> GetDocumentSeriesByIdAsync(Guid id)
    {
        var series = await _context.DocumentSeries.FindAsync(id);

        return series == null ? null : new DocumentSeriesDto(
            series.Id,
            series.SeriesCode,
            series.DocumentType,
            series.DocumentTypeName,
            series.CurrentNumber,
            series.StoreId,
            series.IsActive,
            series.IsDefault,
            series.CreatedAt
        );
    }

    public async Task<DocumentSeriesDto> CreateDocumentSeriesAsync(CreateDocumentSeriesRequest request, string tenantId, Guid userId)
    {
        var existingSeries = await _context.DocumentSeries
            .FirstOrDefaultAsync(ds => ds.SeriesCode == request.SeriesCode && ds.TenantId == tenantId);

        if (existingSeries != null)
            throw new InvalidOperationException("Series code already exists for this tenant");

        if (request.IsDefault)
        {
            var currentDefault = await _context.DocumentSeries
                .FirstOrDefaultAsync(ds => ds.TenantId == tenantId &&
                                          ds.StoreId == request.StoreId &&
                                          ds.DocumentType == request.DocumentType &&
                                          ds.IsDefault);

            if (currentDefault != null)
                currentDefault.RemoveDefault();
        }

        var series = new DocumentSeries(
            request.SeriesCode,
            request.DocumentType,
            request.DocumentTypeName,
            request.StoreId,
            tenantId,
            request.IsDefault
        );

        _context.DocumentSeries.Add(series);
        await _context.SaveChangesAsync();

        return await GetDocumentSeriesByIdAsync(series.Id)
            ?? throw new InvalidOperationException("Failed to retrieve created series");
    }

    public async Task<DocumentSeriesDto> UpdateDocumentSeriesAsync(Guid id, UpdateDocumentSeriesRequest request, Guid userId)
    {
        var series = await _context.DocumentSeries.FindAsync(id);
        if (series == null)
            throw new InvalidOperationException("Document series not found");

        if (request.IsDefault && !series.IsDefault)
        {
            var currentDefault = await _context.DocumentSeries
                .FirstOrDefaultAsync(ds => ds.TenantId == series.TenantId &&
                                          ds.StoreId == series.StoreId &&
                                          ds.DocumentType == series.DocumentType &&
                                          ds.IsDefault);

            if (currentDefault != null)
                currentDefault.RemoveDefault();

            series.SetAsDefault();
        }
        else if (!request.IsDefault && series.IsDefault)
        {
            series.RemoveDefault();
        }

        if (request.IsActive)
            series.Activate();
        else
            series.Deactivate();

        await _context.SaveChangesAsync();

        return await GetDocumentSeriesByIdAsync(id)
            ?? throw new InvalidOperationException("Failed to retrieve updated series");
    }

    public async Task<NextDocumentNumberDto> GetNextDocumentNumberAsync(string tenantId, Guid storeId, string documentType)
    {
        var series = await _context.DocumentSeries
            .Where(ds => ds.TenantId == tenantId &&
                        ds.DocumentType == documentType &&
                        ds.IsDefault &&
                        ds.IsActive)
            .FirstOrDefaultAsync();

        if (series == null)
            throw new InvalidOperationException($"No active default series found for document type {documentType}");

        var nextNumber = $"{series.CurrentNumber + 1:D8}";
        var fullNumber = $"{series.SeriesCode}-{nextNumber}";

        return new NextDocumentNumberDto(
            series.SeriesCode,
            nextNumber,
            fullNumber
        );
    }

    public async Task<IEnumerable<ProductSearchDto>> SearchProductsAsync(string searchTerm, Guid storeId, string? token = null)
    {
        var productServiceUrl = _configuration["Services:ProductService:Url"] ?? "http://localhost:5005";
        var client = _httpClientFactory.CreateClient();

        if (!string.IsNullOrEmpty(token))
        {
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        }

        try
        {
            var response = await client.GetAsync($"{productServiceUrl}/api/products/search?term={Uri.EscapeDataString(searchTerm)}");
            if (response.IsSuccessStatusCode)
            {
                var json = await response.Content.ReadAsStringAsync();
                var products = JsonSerializer.Deserialize<List<InternalProductResponse>>(json, new JsonSerializerOptions
                {
                    PropertyNameCaseInsensitive = true
                });

                if (products != null && products.Any())
                {
                    var productIds = products.Select(p => p.Id).ToList();
                    var storeInventories = await _context.StoreInventories
                        .Where(si => si.StoreId == storeId && productIds.Contains(si.ProductId))
                        .ToDictionaryAsync(si => si.ProductId, si => new { si.CurrentStock, si.MinimumStock });

                    return products.Select(p =>
                    {
                        var inventory = storeInventories.GetValueOrDefault(p.Id);
                        return new ProductSearchDto(
                            p.Id,
                            p.Code,
                            p.Name,
                            p.CategoryName,
                            p.PurchasePrice,
                            p.SalePrice,
                            inventory?.CurrentStock ?? 0,
                            p.IsActive,
                            inventory?.MinimumStock ?? 10,
                            p.Barcode,
                            p.ShortScanCode,
                            p.SaleUOMs
                        );
                    }).ToList();
                }

                return products ?? [];
            }
        }
        catch
        {
        }

        return [];
    }

    public async Task<IEnumerable<ProductSearchDto>> GetAllProductsWithStockAsync(Guid storeId, string? token = null)
    {
        var productServiceUrl = _configuration["Services:ProductService:Url"] ?? "http://localhost:5005";
        var client = _httpClientFactory.CreateClient();

        if (!string.IsNullOrEmpty(token))
        {
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        }

        try
        {
            var response = await client.GetAsync($"{productServiceUrl}/api/products");
            if (response.IsSuccessStatusCode)
            {
                var json = await response.Content.ReadAsStringAsync();
                var products = JsonSerializer.Deserialize<List<InternalProductResponse>>(json, new JsonSerializerOptions
                {
                    PropertyNameCaseInsensitive = true
                });

                if (products != null && products.Any())
                {
                    var productIds = products.Select(p => p.Id).ToList();
                    var storeInventories = await _context.StoreInventories
                        .Where(si => si.StoreId == storeId && productIds.Contains(si.ProductId))
                        .ToDictionaryAsync(si => si.ProductId, si => new { si.CurrentStock, si.MinimumStock });

                    return products.Select(p =>
                    {
                        var inventory = storeInventories.GetValueOrDefault(p.Id);
                        return new ProductSearchDto(
                            p.Id,
                            p.Code,
                            p.Name,
                            p.CategoryName,
                            p.PurchasePrice,
                            p.SalePrice,
                            inventory?.CurrentStock ?? 0,
                            p.IsActive,
                            inventory?.MinimumStock ?? 10,
                            p.Barcode,
                            p.ShortScanCode,
                            p.SaleUOMs
                        );
                    }).ToList();
                }

                return products ?? [];
            }
        }
        catch
        {
        }

        return [];
    }

    public async Task<InventoryAdjustmentDto> CreateAdjustmentAsync(CreateInventoryAdjustmentRequest request, string tenantId, Guid userId, string? token = null)
    {
        var storeInventory = await _context.StoreInventories
            .FirstOrDefaultAsync(si => si.Id == request.StoreInventoryId)
            ?? throw new InvalidOperationException("Store inventory not found");

        if (!request.IsPositive && storeInventory.CurrentStock < request.Quantity)
        {
            throw new InvalidOperationException($"Insufficient stock. Current stock: {storeInventory.CurrentStock}, requested: {request.Quantity}");
        }

        var adjustment = new InventoryAdjustment(
            tenantId,
            request.StoreInventoryId,
            request.AdjustmentType,
            request.Quantity,
            request.IsPositive,
            storeInventory.CurrentStock,
            request.Reason,
            userId
        );

        if (request.IsPositive)
        {
            storeInventory.AddStock(request.Quantity);
        }
        else
        {
            storeInventory.RemoveStock(request.Quantity);
        }

        var movement = new InventoryMovement(
            tenantId,
            storeInventory.Id,
            request.IsPositive ? request.Quantity : -request.Quantity,
            InventoryMovementType.Adjustment,
            $"Ajuste: {request.AdjustmentType} - {request.Reason}",
            userId,
            request.UOMId,
            request.UOMCode,
            request.OriginalQuantity,
            request.ConversionFactor
        );

        _context.InventoryAdjustments.Add(adjustment);
        _context.InventoryMovements.Add(movement);
        await _context.SaveChangesAsync();

        var productServiceUrl = _configuration["Services:ProductService:Url"] ?? "http://localhost:5005";
        var client = _httpClientFactory.CreateClient();

        if (!string.IsNullOrEmpty(token))
        {
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        }

        string productCode = "UNKNOWN";
        string productName = "UNKNOWN";

        try
        {
            var response = await client.GetAsync($"{productServiceUrl}/api/products/{storeInventory.ProductId}");
            if (response.IsSuccessStatusCode)
            {
                var json = await response.Content.ReadAsStringAsync();
                var product = JsonSerializer.Deserialize<JsonElement>(json);
                productCode = product.GetProperty("code").GetString() ?? "UNKNOWN";
                productName = product.GetProperty("name").GetString() ?? "UNKNOWN";
            }
        }
        catch
        {
        }

        return new InventoryAdjustmentDto(
            adjustment.Id,
            adjustment.StoreInventoryId,
            productCode,
            productName,
            adjustment.AdjustmentType,
            adjustment.Quantity,
            adjustment.IsPositive,
            adjustment.PreviousStock,
            adjustment.NewStock,
            adjustment.Reason,
            adjustment.UserId,
            "User Name",
            adjustment.AdjustmentDate
        );
    }

    public async Task<bool> TransferStockAsync(TransferStockRequest request, string tenantId, Guid userId)
    {
        if (request.SourceStoreId == request.DestinationStoreId)
            throw new InvalidOperationException("La tienda de origen y destino no pueden ser la misma");

        if (request.Quantity <= 0)
            throw new InvalidOperationException("La cantidad debe ser mayor a 0");

        using var transaction = await _context.Database.BeginTransactionAsync();
        try
        {
            // 1. Process Source Store (Exit)
            var sourceInventory = await _context.StoreInventories
                .FirstOrDefaultAsync(si => si.StoreId == request.SourceStoreId && si.ProductId == request.ProductId && si.TenantId == tenantId);

            if (sourceInventory == null || sourceInventory.CurrentStock < request.Quantity)
                throw new InvalidOperationException($"Stock insuficiente en el almacén de origen. Stock actual: {sourceInventory?.CurrentStock ?? 0}");

            sourceInventory.RemoveStock(request.Quantity);

            var sourceMovement = new InventoryMovement(
                tenantId,
                sourceInventory.Id,
                -request.Quantity,
                InventoryMovementType.Transfer,
                $"Transferencia Enviada a Destino: {request.Reason}",
                userId,
                request.UOMId,
                request.UOMCode,
                request.OriginalQuantity,
                request.ConversionFactor
            );
            _context.InventoryMovements.Add(sourceMovement);

            // 2. Process Destination Store (Entry)
            var destInventory = await _context.StoreInventories
                .FirstOrDefaultAsync(si => si.StoreId == request.DestinationStoreId && si.ProductId == request.ProductId && si.TenantId == tenantId);

            if (destInventory == null)
            {
                // Create inventory entry if it doesn't exist in destination
                // Default min stock to 10 or copy from source? Defaulting to 10 for now.
                destInventory = new StoreInventory(tenantId, request.ProductId, request.DestinationStoreId, 10);
                _context.StoreInventories.Add(destInventory);
                await _context.SaveChangesAsync(); // Save to get Id
            }

            destInventory.AddStock(request.Quantity);

            var destMovement = new InventoryMovement(
                tenantId,
                destInventory.Id,
                request.Quantity,
                InventoryMovementType.Transfer,
                $"Transferencia Recibida de Origen: {request.Reason}",
                userId,
                request.UOMId,
                request.UOMCode,
                request.OriginalQuantity,
                request.ConversionFactor
            );
            _context.InventoryMovements.Add(destMovement);

            await _context.SaveChangesAsync();
            await transaction.CommitAsync();

            return true;
        }
        catch (Exception)
        {
            await transaction.RollbackAsync();
            throw;
        }
    }

    public async Task<string> TransferStockBatchAsync(TransferStockBatchRequest request, string tenantId, Guid userId)
    {
        if (request.SourceStoreId == Guid.Empty || request.DestinationStoreId == Guid.Empty)
           throw new InvalidOperationException("ID de almacén de origen o destino no válido.");

        if (request.SourceStoreId == request.DestinationStoreId)
            throw new InvalidOperationException("La tienda de origen y destino no pueden ser la misma");

        if (request.Items == null || !request.Items.Any())
            throw new InvalidOperationException("No se seleccionaron productos para transferir");

        // Verify Source Exists (Optional but good)
        // Verify Destination Exists (Optional)

        using var transaction = await _context.Database.BeginTransactionAsync();
        try
        {
            // Generate a Transfer Code
            var transferCode = $"TRF-{DateTime.UtcNow:yyyyMMdd}-{Guid.NewGuid().ToString().Substring(0, 8).ToUpper()}";
            var baseReason = request.Reason;

            foreach (var item in request.Items)
            {
                if (item.Quantity <= 0) continue;

                // 1. Process Source Store (Exit)
                var sourceInventory = await _context.StoreInventories
                    .FirstOrDefaultAsync(si => si.StoreId == request.SourceStoreId && si.ProductId == item.ProductId && si.TenantId == tenantId);

                // For batch, we grab the product name for error message if possible, or just ID
                if (sourceInventory == null)
                    throw new InvalidOperationException($"No se encontró inventario en origen para el producto (ID: {item.ProductId}).");
                    
                if (sourceInventory.CurrentStock < item.Quantity)
                    throw new InvalidOperationException($"Stock insuficiente para producto (ID: {item.ProductId}). Stock actual: {sourceInventory.CurrentStock}, Solicitado: {item.Quantity}");

                sourceInventory.RemoveStock(item.Quantity);

                var sourceMovement = new InventoryMovement(
                    tenantId,
                    sourceInventory.Id,
                    -item.Quantity,
                    InventoryMovementType.Transfer,
                    $"Transferencia Enviada ({transferCode}): {baseReason}",
                    userId,
                    item.UOMId,
                    item.UOMCode ?? "-", // Default if null to prevent DB constraint issues
                    item.OriginalQuantity,
                    item.ConversionFactor
                );
                _context.InventoryMovements.Add(sourceMovement);

                // 2. Process Destination Store (Entry)
                // Relaxed check: Trust StoreId + ProductId uniqueness. IgnoreQueryFilters handles Soft Deletes.
                var destInventory = await _context.StoreInventories
                    .IgnoreQueryFilters()
                    .FirstOrDefaultAsync(si => si.StoreId == request.DestinationStoreId && si.ProductId == item.ProductId);

                if (destInventory == null)
                {
                    // Create inventory entry if it doesn't exist in destination
                    destInventory = new StoreInventory(tenantId, item.ProductId, request.DestinationStoreId, 10);
                    _context.StoreInventories.Add(destInventory);
                    await _context.SaveChangesAsync(); // Save to get Id
                }
                else 
                {
                    // Check soft delete
                    if (destInventory.IsDeleted)
                    {
                         destInventory.Restore();
                    }
                    
                    // Safety fix: data consistency
                    if (destInventory.TenantId != tenantId)
                    {
                        // Log warning or just proceed? Ideally we fix the tenant ID? 
                        // But StoreInventory TenantId should be readonly-ish. 
                        // Let's assume StoreId is the source of truth.
                    }
                }

                destInventory.AddStock(item.Quantity);

                var destMovement = new InventoryMovement(
                    tenantId,
                    destInventory.Id,
                    item.Quantity,
                    InventoryMovementType.Transfer,
                    $"Transferencia Recibida ({transferCode}): {baseReason}",
                    userId,
                    item.UOMId,
                    item.UOMCode ?? "-", // Default if null
                    item.OriginalQuantity,
                    item.ConversionFactor
                );
                _context.InventoryMovements.Add(destMovement);
            }

            await _context.SaveChangesAsync();
            await transaction.CommitAsync();

            return transferCode;
        }
        catch (Exception ex)
        {
            await transaction.RollbackAsync();
            // Wrap in InvalidOperationException to ensure message reaches client (if configured)
            // or just throw original.
            // If it's a DbUpdateException, inner exception holds the key.
            var message = ex.InnerException?.Message ?? ex.Message;
            throw new InvalidOperationException($"Error al procesar transferencia: {message}", ex);
        }
    }

    public async Task<IEnumerable<InventoryMovementDto>> GetInventoryMovementsAsync(
        Guid? storeId,
        string tenantId,
        Guid? productId = null,
        DateTime? fromDate = null,
        DateTime? toDate = null)
    {
        var query = _context.InventoryMovements
            .Include(m => m.StoreInventory)
            .Where(m => m.TenantId == tenantId);

        if (storeId.HasValue)
        {
            query = query.Where(m => m.StoreInventory.StoreId == storeId.Value);
        }

        if (productId.HasValue)
        {
            query = query.Where(m => m.StoreInventory.ProductId == productId.Value);
        }

        var peruTimeZone = TimeZoneInfo.FindSystemTimeZoneById("SA Pacific Standard Time");

        if (fromDate.HasValue)
        {
            var startDateUtc = TimeZoneInfo.ConvertTimeToUtc(
                DateTime.SpecifyKind(fromDate.Value.Date, DateTimeKind.Unspecified), peruTimeZone);
            query = query.Where(m => m.MovementDate >= startDateUtc);
        }

        if (toDate.HasValue)
        {
            var endDateUtc = TimeZoneInfo.ConvertTimeToUtc(
                DateTime.SpecifyKind(toDate.Value.Date.AddDays(1), DateTimeKind.Unspecified), peruTimeZone);
            query = query.Where(m => m.MovementDate < endDateUtc);
        }

        var movements = await query
            .OrderByDescending(m => m.MovementDate)
            .Take(500)
            .ToListAsync();

        var productIds = movements.Select(m => m.StoreInventory.ProductId).Distinct().ToList();
        var productInfos = new Dictionary<Guid, (string Code, string Name, string? Barcode, string? ShortScanCode)>();

        foreach (var pid in productIds)
        {
            var product = await GetProductFromServiceAsync(pid, tenantId);
            if (product != null)
            {
                productInfos[pid] = (product.Code, product.Name, product.Barcode, product.ShortScanCode);
            }
        }

        return movements.Select(m => {
            var productInfo = productInfos.GetValueOrDefault(m.StoreInventory.ProductId, ("UNKNOWN", "UNKNOWN", null, null));
            var movementTypeName = m.Type switch
            {
                InventoryMovementType.Entry => "Entrada",
                InventoryMovementType.Exit => "Salida",
                InventoryMovementType.Adjustment => "Ajuste",
                InventoryMovementType.Transfer => "Transferencia",
                InventoryMovementType.Return => "Devolución",
                InventoryMovementType.Loss => "Pérdida/Merma",
                _ => "Desconocido"
            };

            return new InventoryMovementDto(
                m.Id,
                m.StoreInventoryId,
                m.StoreInventory.ProductId,
                productInfo.Item1,
                productInfo.Item2,
                movementTypeName,
                m.Quantity,
                m.Reason,
                m.UserId,
                null,
                m.MovementDate,
                m.UOMCode,
                m.OriginalQuantity,
                m.ConversionFactor,
                productInfo.Item3,
                productInfo.Item4
            );
        }).ToList();
    }

    public async Task<string> CreateAdjustmentBatchAsync(BatchInventoryAdjustmentRequest request, string tenantId, Guid userId, string? token = null)
    {
        var adjustmentCode = $"ADJ-{DateTime.UtcNow:yyyyMMdd}-{Guid.NewGuid().ToString().Substring(0, 8).ToUpper()}";
        
        var movementType = request.AdjustmentType == "MERMA" || request.AdjustmentType == "VENCIDO" || request.AdjustmentType == "DAÑADO"
            ? InventoryMovementType.Loss
            : InventoryMovementType.Adjustment;
            
        if (request.AdjustmentType == "CARGA_INICIAL") 
            movementType = InventoryMovementType.Entry;

        var isPositive = request.IsPositive;
        
        foreach (var item in request.Items)
        {
             // Resolve StoreInventory
             StoreInventory? storeInventory = null;

             if (item.StoreInventoryId.HasValue && item.StoreInventoryId.Value != Guid.Empty)
             {
                 storeInventory = await _context.StoreInventories.FindAsync(item.StoreInventoryId.Value);
             }
             else if (request.StoreId != Guid.Empty && item.ProductId.HasValue)
             {
                 storeInventory = await _context.StoreInventories
                    .FirstOrDefaultAsync(si => si.StoreId == request.StoreId && si.ProductId == item.ProductId.Value);
             }

             // If still null, create it (Auto-create on adjustment if needed, e.g. Initial Load)
             if (storeInventory == null)
             {
                 if (request.StoreId == Guid.Empty || !item.ProductId.HasValue)
                 {
                     // Cannot create without StoreId and ProductId
                     continue; 
                 }

                 storeInventory = new StoreInventory(tenantId, item.ProductId.Value, request.StoreId, 0); // Start with 0 stock
                 _context.StoreInventories.Add(storeInventory);
                 await _context.SaveChangesAsync(); // Need Id for movement
             }

             var quantity = item.Quantity;
             var signedQuantity = isPositive ? quantity : -quantity;
             
             // Validation: Check negative stock if subtracting
             if (!isPositive && storeInventory.CurrentStock < quantity)
             {
                 // We could throw or skip. Throwing is safer for data integrity.
                 // But for batch, maybe we want to process others? 
                 // Let's throw for now as UI should prevent this.
                 throw new InvalidOperationException($"Stock insuficiente para realizar el ajuste en uno de los productos.");
             }

             var movement = new InventoryMovement(
                tenantId,
                storeInventory.Id,
                signedQuantity,
                movementType,
                $"Lote: {request.Reason} ({adjustmentCode}) - {request.AdjustmentType}",
                userId,
                item.UOMId,
                item.UOMCode,
                item.OriginalQuantity,
                item.ConversionFactor
            );
            
            if (isPositive)
                storeInventory.AddStock(quantity);
            else
                storeInventory.RemoveStock(quantity);
                
            _context.InventoryMovements.Add(movement);
        }
        
        await _context.SaveChangesAsync();
        return adjustmentCode;
    }

    // --- Transfer Implementation ---

    public async Task<TransferDto> CreateTransferAsync(CreateTransferRequest request, string tenantId, string? token = null)
    {
        // Format: TRF-{Date}-{Hex}
        var trfCode = $"TRF-{DateTime.UtcNow:yyyyMMdd}-{Guid.NewGuid().ToString().Substring(0, 8).ToUpper()}";

        var transfer = new Transfer
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            TransferNumber = trfCode,
            OriginStoreId = request.OriginStoreId,
            DestinationStoreId = request.DestinationStoreId,
            RequestedByUserId = request.RequestedByUserId,
            Status = TransferStatus.InTransit,
            Notes = request.Notes,
            CreatedAt = DateTime.UtcNow
        };

        foreach (var item in request.Items)
        {
             var originInventory = await _context.StoreInventories
                .FirstOrDefaultAsync(si => si.StoreId == request.OriginStoreId && si.ProductId == item.ProductId);
                
             // Strict check? Or allow negative? User usually wants control.
             if (originInventory == null || originInventory.CurrentStock < item.Quantity)
             {
                 throw new InvalidOperationException($"Stock insuficiente para el producto {item.ProductId} en la tienda de origen.");
             }
             
             originInventory.RemoveStock((int)item.Quantity);
             
             var movement = new InventoryMovement(
                tenantId,
                originInventory.Id,
                -(int)item.Quantity,
                InventoryMovementType.TransferOut,
                $"Transferencia Enviada ({trfCode}): {request.Notes}",
                request.RequestedByUserId,
                null, null, null, null 
             );
             _context.InventoryMovements.Add(movement);
             
             transfer.Details.Add(new TransferDetail
             {
                 Id = Guid.NewGuid(),
                 ProductId = item.ProductId,
                 Quantity = item.Quantity
             });
        }
        
        _context.Transfers.Add(transfer);
        await _context.SaveChangesAsync();
        
        return await GetTransferByIdAsync(transfer.Id, tenantId);
    }

    public async Task<TransferDto> GetTransferByIdAsync(Guid id, string tenantId)
    {
         var transfer = await _context.Transfers
            .Include(t => t.Details)
            .FirstOrDefaultAsync(t => t.Id == id && t.TenantId == tenantId);
            
         if (transfer == null) throw new KeyNotFoundException("Transferencia no encontrada");

         var details = new List<TransferDetailDto>();
         foreach(var d in transfer.Details)
         {
             var product = await GetProductFromServiceAsync(d.ProductId, tenantId);
             details.Add(new TransferDetailDto(d.Id, d.ProductId, product?.Code ?? "UNKNOWN", product?.Name ?? "Producto Desconocido", d.Quantity));
         }

         return new TransferDto(
            transfer.Id, 
            transfer.TransferNumber,
            transfer.OriginStoreId, "Cargando...", // Frontend handles lookup
            transfer.DestinationStoreId, "Cargando...", 
            transfer.Status,
            transfer.Status == TransferStatus.InTransit ? "En Tránsito" : 
            transfer.Status == TransferStatus.Completed ? "Completada" : "Cancelada",
            transfer.RequestedByUserId, "", // Frontend handles user lookup
            transfer.ReceivedByUserId, "",
            transfer.Notes,
            transfer.CreatedAt,
            transfer.CompletedAt,
            details
         );
    }

    public async Task<TransferDto?> GetTransferByNumberAsync(string transferNumber, string tenantId)
    {
        var transfer = await _context.Transfers
            .Include(t => t.Details)
            .FirstOrDefaultAsync(t => t.TransferNumber == transferNumber && t.TenantId == tenantId);

        if (transfer == null) return null;
        
        // Map details
         var details = transfer.Details.Select(d => new TransferDetailDto(
            d.Id, d.ProductId, "", "", d.Quantity
         )).ToList();
         
         // Fill product info for details - Optimization: Fetch all products in one go
         // For now, simple logic or skip heavy product info fetching if printed only needs name (we need name)
         // Actually, let's just return basic DTO. Frontend might lack product names if not fetched?
         // StoreInventory movement usually has names. 
         // Let's rely on cached names or basic lookup if implemented.
         // Actually, earlier GetTransferByIdAsync implementation also didn't fetch product names.
         
         // Fetch store names
         // Store lookup removed as Store entity is not in Inventory Context
         // var originStore = await _context.Stores.FindAsync(transfer.OriginStoreId);
         // var destStore = await _context.Stores.FindAsync(transfer.DestinationStoreId);
         
         string originStoreName = "Almacén Origen";
         string destStoreName = "Almacén Destino";
         
         // Fetch user names
         // Ideally use Identity service via gRPC or HTTP, but for monolithic/demo we might not have direct DB access to users here if separate contexts
         // However, in this demo solution, we don't have easy cross-service calls set up in this method yet.
         // BUT, the `TransferList` frontend component relies on IDs and fetches users separately.
         // The PDF generator in frontend relies on NAMES being passed.
         // My `GetTransferByNumber` returns specific names as empty strings: `transfer.RequestedByUserId, "",`
         // I need to return NAMES if possible.
         // If I can't fetch names easily here, I should return IDs and let frontend resolve them?
         // Frontend `handleReprintTransfer` uses `foundTransfer.requestedByUserName`.
         // So I MUST return names here.
         
         // I will try to fetch users from Identity Service URL? No, that's too complex for this fix.
         // Wait, the User table is in Identity Service. Inventory Service does not have access.
         // I can use `_identityService` if injected? I don't see it injected.
         // I will use a placeholder or see if I can fetch from a local cache? No.
         
         // ALTERNATIVE: I will return IDs, and Frontend MUST resolve names using its cached `users` list.
         // `handleReprintTransfer` in `InventoryPage` is:
         // requesterName: foundTransfer.requestedByUserName
         
         // I should change Frontend to use `requestedByUserId` to find name from `users` list.
         // BUT `InventoryPage` has `users` list? Yes `const { data: users } = useUsers();`.
         
         // So I will update FRONTEND to resolve names from IDs if names are empty.
         // But wait, the previous `GetTransferById` also returned empty names.
         // The `TransferList` component manually resolves names: `getUserName(transfer.requestedByUserId)`.
         
         // So the fix is in FRONTEND `handleReprintTransfer`.
         
         return new TransferDto(
            transfer.Id,
            transfer.TransferNumber,
            transfer.OriginStoreId, originStoreName, 
            transfer.DestinationStoreId, destStoreName, 
            transfer.Status,
            transfer.Status == TransferStatus.InTransit ? "En Tránsito" : 
            transfer.Status == TransferStatus.Completed ? "Completada" : "Cancelada",
            transfer.RequestedByUserId, "", 
            transfer.ReceivedByUserId, "",
            transfer.Notes,
            transfer.CreatedAt,
            transfer.CompletedAt,
            details
         );
    }

    public async Task<IEnumerable<TransferDto>> GetTransfersAsync(Guid? originStoreId, Guid? destinationStoreId, string tenantId, string? token = null)
    {
        var query = _context.Transfers.AsQueryable().Where(t => t.TenantId == tenantId);
        
        if (originStoreId.HasValue) 
            query = query.Where(t => t.OriginStoreId == originStoreId.Value);
            
        if (destinationStoreId.HasValue) 
            query = query.Where(t => t.DestinationStoreId == destinationStoreId.Value);
            
        // Incoming transfers (where I am destination) are usually most important to see
        
        var list = await query.Include(t => t.Details).OrderByDescending(t => t.CreatedAt).ToListAsync();
        
        return list.Select(t => new TransferDto(
            t.Id, t.TransferNumber, 
            t.OriginStoreId, "", 
            t.DestinationStoreId, "", 
            t.Status, 
            t.Status == TransferStatus.InTransit ? "En Tránsito" : 
            t.Status == TransferStatus.Completed ? "Completada" : "Cancelada",
            t.RequestedByUserId, "",
            t.ReceivedByUserId, "",
            t.Notes, t.CreatedAt, t.CompletedAt,
            new List<TransferDetailDto>() // Omit details for summary
        ));
    }

    public async Task<TransferDto> CompleteTransferAsync(Guid transferId, Guid userId, string tenantId, string? token = null)
    {
        var transfer = await _context.Transfers.Include(t => t.Details).FirstOrDefaultAsync(t => t.Id == transferId && t.TenantId == tenantId);
        if (transfer == null) throw new KeyNotFoundException("Transferencia no encontrada");
        
        if (transfer.Status != TransferStatus.InTransit) 
            throw new InvalidOperationException($"La transferencia no está en tránsito (Estado actual: {transfer.Status})");
        
        transfer.Status = TransferStatus.Completed;
        transfer.ReceivedByUserId = userId;
        transfer.CompletedAt = DateTime.UtcNow;
        
        foreach(var detail in transfer.Details)
        {
             var destInventory = await _context.StoreInventories
                .FirstOrDefaultAsync(si => si.StoreId == transfer.DestinationStoreId && si.ProductId == detail.ProductId);
                
             if (destInventory == null)
             {
                 destInventory = new StoreInventory(tenantId, transfer.DestinationStoreId, detail.ProductId, 0, 0);
                 _context.StoreInventories.Add(destInventory);
             }
             
             destInventory.AddStock((int)detail.Quantity);
             
             var movement = new InventoryMovement(
                tenantId,
                destInventory.Id,
                (int)detail.Quantity,
                InventoryMovementType.TransferIn,
                $"Transferencia Recibida ({transfer.TransferNumber}): {transfer.Notes}",
                userId,
                null, null, null, null
             );
             _context.InventoryMovements.Add(movement);
        }
        
        await _context.SaveChangesAsync();
        return await GetTransferByIdAsync(transfer.Id, tenantId);
    }
    
    public async Task<TransferDto> CancelTransferAsync(Guid transferId, Guid userId, string tenantId)
    {
        var transfer = await _context.Transfers
            .Include(t => t.Details)
            .FirstOrDefaultAsync(t => t.Id == transferId && t.TenantId == tenantId);

        if (transfer == null) throw new KeyNotFoundException("Transferencia no encontrada");

        if (transfer.Status != TransferStatus.InTransit)
            throw new InvalidOperationException($"Solo se pueden cancelar transferencias en tránsito (Estado actual: {transfer.Status})");

        // Restore stock to origin
        foreach (var detail in transfer.Details)
        {
             var originInventory = await _context.StoreInventories
                .FirstOrDefaultAsync(si => si.StoreId == transfer.OriginStoreId && si.ProductId == detail.ProductId);

             if (originInventory == null)
             {
                 // Create if missing (rare case)
                 originInventory = new StoreInventory(tenantId, transfer.OriginStoreId, detail.ProductId, 0, 0);
                 _context.StoreInventories.Add(originInventory);
             }

             originInventory.AddStock((int)detail.Quantity);

             var movement = new InventoryMovement(
                tenantId,
                originInventory.Id,
                (int)detail.Quantity,
                InventoryMovementType.TransferIn, 
                $"Cancelación de Transferencia ({transfer.TransferNumber})",
                userId,
                null, null, null, null
             );
             _context.InventoryMovements.Add(movement);
        }

        transfer.Status = TransferStatus.Cancelled;
        // Mark as "Received" by the user who cancelled effectively ending the cycle?
        // Or keep ReceivedBy null. Let's keep it null as it wasn't received.
        
        await _context.SaveChangesAsync();
        
        return await GetTransferByIdAsync(transfer.Id, tenantId);
    }

}

