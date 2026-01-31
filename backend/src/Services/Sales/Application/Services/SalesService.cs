using Microsoft.EntityFrameworkCore;
using Profitzen.Sales.Application.DTOs;
using Profitzen.Sales.Domain.Entities;
using Profitzen.Sales.Domain.Enums;
using Profitzen.Sales.Infrastructure;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;

namespace Profitzen.Sales.Application.Services;

public class SalesService : ISalesService
{
    private readonly SalesDbContext _context;
    private readonly ILogger<SalesService> _logger;
    private readonly IInventoryClient _inventoryClient;
    private readonly ICustomerClient _customerClient;
    private readonly IConfigurationClient _configurationClient;
    private readonly IHttpContextAccessor _httpContextAccessor;
    private readonly IHttpClientFactory _httpClientFactory;

    public SalesService(SalesDbContext context, ILogger<SalesService> logger, IInventoryClient inventoryClient, ICustomerClient customerClient, IConfigurationClient configurationClient, IHttpContextAccessor httpContextAccessor, IHttpClientFactory httpClientFactory)
    {
        _context = context;
        _logger = logger;
        _inventoryClient = inventoryClient;
        _customerClient = customerClient;
        _configurationClient = configurationClient;
        _httpContextAccessor = httpContextAccessor;
        _httpClientFactory = httpClientFactory;
    }

    public async Task<IEnumerable<SaleDto>> GetSalesAsync(string tenantId, Guid? storeId = null, DateTime? fromDate = null, DateTime? toDate = null)
    {
        var query = _context.Sales
            .Include(s => s.Customer)
            .Include(s => s.Items)
            .Include(s => s.Payments)
            .Where(s => s.TenantId == tenantId); // ALWAYS filter by tenant

        // Optionally filter by specific store
        if (storeId.HasValue)
            query = query.Where(s => s.StoreId == storeId.Value);

        if (fromDate.HasValue)
            query = query.Where(s => s.SaleDate >= fromDate.Value);

        if (toDate.HasValue)
            query = query.Where(s => s.SaleDate <= toDate.Value);

        return await query
            .OrderByDescending(s => s.SaleDate)
            .Select(s => MapToSaleDto(s))
            .ToListAsync();
    }

    public async Task<SaleDto?> GetSaleByIdAsync(Guid id)
    {
        var sale = await _context.Sales
            .Include(s => s.Customer)
            .Include(s => s.Items)
            .Include(s => s.Payments)
            .FirstOrDefaultAsync(s => s.Id == id);

        return sale == null ? null : MapToSaleDto(sale);
    }

    public async Task<SaleDto?> GetSaleByNumberAsync(string saleNumber)
    {
        var sale = await _context.Sales
            .Include(s => s.Customer)
            .Include(s => s.Items)
            .Include(s => s.Payments)
            .FirstOrDefaultAsync(s => s.SaleNumber == saleNumber);

        return sale == null ? null : MapToSaleDto(sale);
    }

    public async Task<SaleDto> CreateSaleAsync(CreateSaleRequest request, Guid storeId, Guid cashierId, string tenantId)
    {
        _logger.LogInformation("Creating sale for StoreId: {StoreId}, CashierId: {CashierId}, CustomerId: {CustomerId}",
            storeId, cashierId, request.CustomerId);

        try
        {

            if (request.CustomerId.HasValue)
            {
                var existingCustomer = await _context.Customers.FindAsync(request.CustomerId.Value);
                if (existingCustomer == null)
                {
                    _logger.LogInformation("Customer {CustomerId} not found locally. Fetching from Customer Service...", request.CustomerId);
                    var remoteCustomer = await _customerClient.GetCustomerByIdAsync(request.CustomerId.Value, tenantId);
                    
                    if (remoteCustomer != null)
                    {
                        var newLocalCustomer = new Customer(
                            tenantId, 
                            remoteCustomer.DocumentNumber, 
                            remoteCustomer.FullName, 
                            storeId, 
                            remoteCustomer.Email, 
                            remoteCustomer.Phone, 
                            remoteCustomer.Address, 
                            remoteCustomer.CreditLimit
                        );

                        if (remoteCustomer.CurrentDebt > 0)
                        {
                            newLocalCustomer.AddDebt(remoteCustomer.CurrentDebt);
                        }
                        

                        var idProperty = typeof(Customer).GetProperty("Id");
                        if (idProperty != null)
                        {
                            idProperty.SetValue(newLocalCustomer, remoteCustomer.Id);
                            _logger.LogInformation("Correctly set Local Customer ID to {Id}", newLocalCustomer.Id);
                        }
                        else
                        {
                            _logger.LogWarning("Could not find Id property on Customer.");
                        }

                        _context.Customers.Add(newLocalCustomer);

                        await _context.SaveChangesAsync();
                        _logger.LogInformation("Customer {CustomerId} synced successfully with Local ID: {LocalId}", request.CustomerId, newLocalCustomer.Id);
                    }
                    else
                    {
                        _logger.LogWarning("Customer {CustomerId} not found in Customer Service either. Sale creation might fail if FK is enforced.", request.CustomerId);
                    }
                }
            }

            var sale = new Sale(tenantId, storeId, cashierId, request.CustomerId, request.Notes, request.DocumentType);
            _logger.LogInformation("Sale entity created with Id: {SaleId}, SaleNumber: {SaleNumber}, DocType: {DocType}",
                sale.Id, sale.SaleNumber, sale.DocumentType);

            _context.Sales.Add(sale);
            await _context.SaveChangesAsync();

            _logger.LogInformation("Sale saved successfully. SaleId: {SaleId}", sale.Id);

            var result = await GetSaleByIdAsync(sale.Id)
                ?? throw new InvalidOperationException("Failed to retrieve created sale");

            _logger.LogInformation("Sale created successfully. SaleId: {SaleId}, SaleNumber: {SaleNumber}",
                result.Id, result.SaleNumber);

            return result;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating sale for StoreId: {StoreId}, CashierId: {CashierId}",
                storeId, cashierId);
            throw;
        }
    }

    public async Task<SaleDto> AddItemToSaleAsync(Guid saleId, AddSaleItemRequest request)
    {
        _logger.LogInformation("Adding item to sale. SaleId: {SaleId}, ProductId: {ProductId}, ProductName: {ProductName}, Quantity: {Quantity}, UnitPrice: {UnitPrice}",
            saleId, request.ProductId, request.ProductName, request.Quantity, request.UnitPrice);

        try
        {
            // Load sale WITH tracking (no AsNoTracking)
            var sale = await _context.Sales
                .Include(s => s.Items)
                .FirstOrDefaultAsync(s => s.Id == saleId);

            if (sale == null)
            {
                _logger.LogWarning("Sale not found. SaleId: {SaleId}", saleId);
                throw new InvalidOperationException("Sale not found");
            }

            _logger.LogInformation("Sale loaded. Status: {Status}, Current items: {ItemCount}",
                sale.Status, sale.Items.Count);

            sale.AddItem(request.ProductId, request.ProductName, request.ProductCode,
                        request.Quantity, request.UnitPrice, request.DiscountAmount, request.ConversionToBase,
                        request.UOMId, request.UOMCode);

            _logger.LogInformation("Item added to sale. New item count: {ItemCount}", sale.Items.Count);

            // SAFE STATE MANAGEMENT
            // Only force 'Added' state for items that are truly new to the context
            foreach (var item in sale.Items)
            {
                var entry = _context.Entry(item);
                if (entry.State == EntityState.Detached)
                {
                    _logger.LogInformation("Marking detached item {ProductId} as Added", item.ProductId);
                    entry.State = EntityState.Added;
                }
            }

            await _context.SaveChangesAsync();

            _logger.LogInformation("Changes saved successfully.");

            var result = await GetSaleByIdAsync(saleId)
                ?? throw new InvalidOperationException("Failed to retrieve updated sale");

            _logger.LogInformation("Item added successfully. SaleId: {SaleId}, TotalItems: {ItemCount}, Total: {Total}",
                saleId, result.Items.Count, result.Total);

            return result;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error adding item to sale. SaleId: {SaleId}, ProductId: {ProductId}, Error: {ErrorMessage}",
                saleId, request.ProductId, ex.Message);
            throw;
        }
    }

    public async Task<SaleDto> RemoveItemFromSaleAsync(Guid saleId, Guid productId)
    {
        var sale = await _context.Sales
            .Include(s => s.Items)
            .FirstOrDefaultAsync(s => s.Id == saleId);

        if (sale == null)
            throw new InvalidOperationException("Sale not found");

        sale.RemoveItem(productId);
        await _context.SaveChangesAsync();

        return await GetSaleByIdAsync(saleId)
            ?? throw new InvalidOperationException("Failed to retrieve updated sale");
    }

    public async Task<SaleDto> UpdateSaleItemAsync(Guid saleId, Guid productId, UpdateSaleItemRequest request)
    {
        var sale = await _context.Sales
            .Include(s => s.Items)
            .FirstOrDefaultAsync(s => s.Id == saleId);

        if (sale == null)
            throw new InvalidOperationException("Sale not found");

        sale.UpdateItemQuantity(productId, request.Quantity);
        await _context.SaveChangesAsync();

        return await GetSaleByIdAsync(saleId)
            ?? throw new InvalidOperationException("Failed to retrieve updated sale");
    }

    public async Task<SaleDto> ApplyDiscountAsync(Guid saleId, ApplyDiscountRequest request)
    {
        var sale = await _context.Sales.FindAsync(saleId);
        if (sale == null)
            throw new InvalidOperationException("Sale not found");

        sale.ApplyDiscount(request.DiscountAmount);
        await _context.SaveChangesAsync();

        return await GetSaleByIdAsync(saleId)
            ?? throw new InvalidOperationException("Failed to retrieve updated sale");
    }

    public async Task<SaleDto> AddPaymentAsync(Guid saleId, AddPaymentRequest request)
    {
        _logger.LogInformation("Adding payment to sale. SaleId: {SaleId}, Method: {Method}, Amount: {Amount}",
            saleId, request.Method, request.Amount);

        try
        {
            var sale = await _context.Sales
                .Include(s => s.Items)
                .Include(s => s.Payments)
                .FirstOrDefaultAsync(s => s.Id == saleId);

            if (sale == null)
            {
                _logger.LogWarning("Sale not found. SaleId: {SaleId}", saleId);
                throw new InvalidOperationException("Sale not found");
            }

            _logger.LogInformation("Sale loaded. Status: {Status}, Current items: {ItemCount}, Current payments: {PaymentCount}",
                sale.Status, sale.Items.Count, sale.Payments.Count);

            sale.AddPayment(request.Method, request.Amount, request.Reference);

            _logger.LogInformation("Payment added to sale. New payment count: {PaymentCount}", sale.Payments.Count);

            var saleEntry = _context.Entry(sale);
            var newPayment = sale.Payments.Last();
            var paymentEntry = _context.Entry(newPayment);

            _logger.LogInformation("Sale entity state: {SaleState}", saleEntry.State);
            _logger.LogInformation("New Payment entity state: {PaymentState}, PaymentId: {PaymentId}, SaleId: {SaleId}",
                paymentEntry.State, newPayment.Id, newPayment.SaleId);

            if (paymentEntry.State != Microsoft.EntityFrameworkCore.EntityState.Added)
            {
                _logger.LogWarning("Payment state was {State}, forcing to Added", paymentEntry.State);
                paymentEntry.State = Microsoft.EntityFrameworkCore.EntityState.Added;
            }

            await _context.SaveChangesAsync();

            _logger.LogInformation("Changes saved successfully.");

            var result = await GetSaleByIdAsync(saleId)
                ?? throw new InvalidOperationException("Failed to retrieve updated sale");

            _logger.LogInformation("Payment added successfully. SaleId: {SaleId}, TotalPayments: {PaymentCount}, PaidAmount: {PaidAmount}",
                saleId, result.Payments.Count, result.PaidAmount);

            return result;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error adding payment to sale. SaleId: {SaleId}, Method: {Method}, Error: {ErrorMessage}",
                saleId, request.Method, ex.Message);
            throw;
        }
    }

    public async Task<SaleDto> CompleteSaleAsync(Guid saleId)
    {
        var sale = await _context.Sales
            .Include(s => s.Items)
            .Include(s => s.Payments)
            .Include(s => s.Customer)
            .FirstOrDefaultAsync(s => s.Id == saleId);

        if (sale == null)
            throw new InvalidOperationException("Sale not found");


        var creditPayment = sale.Payments.FirstOrDefault(p => p.Method == PaymentMethod.Credit);
        if (creditPayment != null)
        {
             if (sale.CustomerId == null)
                 throw new InvalidOperationException("Customer required for credit sale.");

             var success = await _customerClient.CreateCreditAsync(
                 sale.CustomerId.Value, 
                 creditPayment.Amount, 
                 DateTime.UtcNow.AddDays(30),
                 $"Venta a Crédito #{sale.SaleNumber}",
                 sale.TenantId
             );

             if (!success)
                 throw new InvalidOperationException("Failed to register credit in Customer Service.");

             sale.Customer?.AddDebt(creditPayment.Amount);
        }


        if (sale.DocumentType == "01")
        {
            if (sale.CustomerId == null || sale.Customer == null)
            {
                throw new InvalidOperationException("Para emitir una Factura, es obligatorio seleccionar un cliente.");
            }

            if (sale.Customer.DocumentNumber.Trim().Length != 11)
            {
                throw new InvalidOperationException("Para emitir una Factura, el cliente debe tener un RUC válido (11 dígitos).");
            }
        }


        string? documentSeries = null;
        string? documentNumber = null;
        try
        {
            var token = _httpContextAccessor.HttpContext?.Request.Headers["Authorization"].ToString().Replace("Bearer ", "") ?? "";
            var docType = sale.DocumentType ?? "80";


            var fullDocumentNumber = await _configurationClient.IncrementSeriesNumberAsync(sale.TenantId, sale.StoreId, docType, token);
            
            var parts = fullDocumentNumber.Split('-');
            if (parts.Length == 2)
            {
                documentSeries = parts[0];
                documentNumber = parts[1];
            }
            else
            {
                documentNumber = fullDocumentNumber;
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to generate document number for Sale {SaleId}.", saleId);

            throw new InvalidOperationException("Error generando número de comprobante. Por favor intente nuevamente.", ex);
        }

        sale.Complete(documentSeries, documentNumber);
        await _context.SaveChangesAsync();


        foreach (var item in sale.Items)
        {

            var quantityInBaseUnits = (int)Math.Ceiling(item.Quantity * item.ConversionToBase);

            _logger.LogInformation("Reducing stock for ProductId: {ProductId}, SaleQuantity: {SaleQuantity}, ConversionToBase: {Conversion}, BaseUnits: {BaseUnits}, StoreId: {StoreId}",
                item.ProductId, item.Quantity, item.ConversionToBase, quantityInBaseUnits, sale.StoreId);

            var success = await _inventoryClient.ReduceStockAsync(
                item.ProductId,
                sale.StoreId,
                quantityInBaseUnits,
                $"Venta #{sale.SaleNumber}",
                sale.TenantId,
                uomId: item.UOMId,
                uomCode: item.UOMCode,
                originalQuantity: item.Quantity,
                conversionFactor: (int)item.ConversionToBase);

            if (!success)
            {
                _logger.LogWarning("Failed to reduce stock for ProductId: {ProductId}. Sale will proceed but stock may be incorrect.",
                    item.ProductId);
            }
        }

        return await GetSaleByIdAsync(saleId)
            ?? throw new InvalidOperationException("Failed to retrieve completed sale");
    }



    public async Task<SaleDto> ReturnSaleAsync(Guid saleId)
    {
        var sale = await _context.Sales
            .Include(s => s.Items)
            .Include(s => s.Payments)
            .Include(s => s.Customer)
            .FirstOrDefaultAsync(s => s.Id == saleId);

        if (sale == null)
            throw new InvalidOperationException("Sale not found");

        sale.Refund();


        foreach (var item in sale.Items)
        {

            var quantityInBaseUnits = (int)Math.Ceiling(item.Quantity * item.ConversionToBase);

            _logger.LogInformation("Increasing stock for ProductId: {ProductId}, SaleQuantity: {SaleQuantity}, ConversionToBase: {Conversion}, BaseUnits: {BaseUnits}, StoreId: {StoreId}",
                item.ProductId, item.Quantity, item.ConversionToBase, quantityInBaseUnits, sale.StoreId);

            var success = await _inventoryClient.IncreaseStockAsync(
                item.ProductId,
                sale.StoreId,
                quantityInBaseUnits,
                $"Devolución Venta #{sale.SaleNumber}",
                sale.TenantId,
                uomId: item.UOMId,
                uomCode: item.UOMCode,
                originalQuantity: item.Quantity,
                conversionFactor: (int)item.ConversionToBase);

            if (!success)
            {
                _logger.LogWarning("Failed to increase stock for ProductId: {ProductId}. Return will proceed but stock may be incorrect.",
                    item.ProductId);
            }
        }


        var creditPayment = sale.Payments.FirstOrDefault(p => p.Method == PaymentMethod.Credit);
        if (creditPayment != null && sale.CustomerId.HasValue)
        {
             var refundSuccess = await _customerClient.RefundCreditAsync(
                 sale.CustomerId.Value,
                 $"#{sale.SaleNumber}",
                 sale.TenantId
             );
             
             if (!refundSuccess)
             {
                 _logger.LogError("Failed to refund credit for Sale {SaleNumber} Customer {CustomerId}. Manual intervention required.", 
                     sale.SaleNumber, sale.CustomerId);
                 // We do NOT throw here because the Stock Return part already succeeded. 
                 // We don't want to revert the Stock Return.
                 // Ideally we should have a transactional outbox or compensations.
                 // For now, allow it but LOG ERROR.
             }
             else 
             {
                 // Only update local replica if remote succeeded
                 sale.Customer?.PayDebt(creditPayment.Amount);
             }
        }

        await _context.SaveChangesAsync();

        return await GetSaleByIdAsync(saleId)
            ?? throw new InvalidOperationException("Failed to retrieve refunded sale");
    }

    public async Task<bool> DeleteSaleAsync(Guid saleId)
    {
        var sale = await _context.Sales.FindAsync(saleId);
        if (sale == null)
            return false;

        if (sale.Status == SaleStatus.Completed)
            throw new InvalidOperationException("Cannot delete completed sale");

        _context.Sales.Remove(sale);
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<IEnumerable<CustomerDto>> GetCustomersAsync(Guid storeId)
    {
        return await _context.Customers
            .Where(c => c.StoreId == storeId && c.IsActive)
            .Select(c => new CustomerDto(
                c.Id,
                c.DocumentNumber,
                c.Name, // FullName (same as Name in Sales context)
                c.Name,
                c.Email,
                c.Phone,
                c.Address,
                c.IsActive,
                c.CreditLimit,
                c.CurrentDebt,
                c.GetAvailableCredit(),
                c.CreatedAt
            ))
            .ToListAsync();
    }

    public async Task<CustomerDto?> GetCustomerByIdAsync(Guid id)
    {
        var customer = await _context.Customers.FindAsync(id);
        return customer == null ? null : new CustomerDto(
            customer.Id,
            customer.DocumentNumber,
            customer.Name, // FullName
            customer.Name,
            customer.Email,
            customer.Phone,
            customer.Address,
            customer.IsActive,
            customer.CreditLimit,
            customer.CurrentDebt,
            customer.GetAvailableCredit(),
            customer.CreatedAt
        );
    }

    public async Task<CustomerDto?> GetCustomerByDocumentAsync(string documentNumber, Guid storeId)
    {
        var customer = await _context.Customers
            .FirstOrDefaultAsync(c => c.DocumentNumber == documentNumber && c.StoreId == storeId);

        return customer == null ? null : new CustomerDto(
            customer.Id,
            customer.DocumentNumber,
            customer.Name, // FullName
            customer.Name,
            customer.Email,
            customer.Phone,
            customer.Address,
            customer.IsActive,
            customer.CreditLimit,
            customer.CurrentDebt,
            customer.GetAvailableCredit(),
            customer.CreatedAt
        );
    }

    public async Task<CustomerDto> CreateCustomerAsync(CreateCustomerRequest request, Guid storeId, string tenantId)
    {
        var customer = new Customer(
            tenantId,
            request.DocumentNumber,
            request.Name,
            storeId,
            request.Email,
            request.Phone,
            request.Address,
            request.CreditLimit
        );

        _context.Customers.Add(customer);
        await _context.SaveChangesAsync();

        return await GetCustomerByIdAsync(customer.Id)
            ?? throw new InvalidOperationException("Failed to retrieve created customer");
    }

    public async Task<CustomerDto> UpdateCustomerAsync(Guid id, UpdateCustomerRequest request)
    {
        var customer = await _context.Customers.FindAsync(id);
        if (customer == null)
            throw new InvalidOperationException("Customer not found");

        customer.UpdateContactInfo(request.Name, request.Email, request.Phone, request.Address);
        customer.UpdateCreditLimit(request.CreditLimit);

        await _context.SaveChangesAsync();

        return await GetCustomerByIdAsync(id)
            ?? throw new InvalidOperationException("Failed to retrieve updated customer");
    }

    public async Task<bool> DeleteCustomerAsync(Guid id)
    {
        var customer = await _context.Customers.FindAsync(id);
        if (customer == null)
            return false;

        customer.Deactivate();
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<decimal> GetDailySalesAsync(string tenantId, DateTime date, Guid? storeId = null)
    {
        var startDate = date.Date;
        var endDate = startDate.AddDays(1);

        var query = _context.Sales
            .Where(s => s.TenantId == tenantId &&
                       s.Status == SaleStatus.Completed &&
                       s.SaleDate >= startDate &&
                       s.SaleDate < endDate);

        if (storeId.HasValue)
            query = query.Where(s => s.StoreId == storeId.Value);

        return await query.SumAsync(s => s.Total);
    }

    public async Task<decimal> GetMonthlySalesAsync(string tenantId, int year, int month, Guid? storeId = null)
    {
        var startDate = new DateTime(year, month, 1);
        var endDate = startDate.AddMonths(1);

        var query = _context.Sales
            .Where(s => s.TenantId == tenantId &&
                       s.Status == SaleStatus.Completed &&
                       s.SaleDate >= startDate &&
                       s.SaleDate < endDate);

        if (storeId.HasValue)
            query = query.Where(s => s.StoreId == storeId.Value);

        return await query.SumAsync(s => s.Total);
    }

    public async Task<IEnumerable<SaleDto>> GetTopSalesAsync(string tenantId, int count = 10, Guid? storeId = null)
    {
        var query = _context.Sales
            .Include(s => s.Customer)
            .Include(s => s.Items)
            .Include(s => s.Payments)
            .Where(s => s.TenantId == tenantId && s.Status == SaleStatus.Completed);

        if (storeId.HasValue)
            query = query.Where(s => s.StoreId == storeId.Value);

        return await query
            .OrderByDescending(s => s.Total)
            .Take(count)
            .Select(s => MapToSaleDto(s))
            .ToListAsync();
    }

    public async Task<SalesDashboardDto> GetDashboardAsync(string tenantId, Guid? storeId = null)
    {
        // TODO: Get timezone from store settings. Using -5 (Peru) for now.
        var timeZoneOffset = TimeSpan.FromHours(-5); 
        var nowUtc = DateTime.UtcNow;
        var nowLocal = nowUtc.Add(timeZoneOffset);
        
        var todayLocal = nowLocal.Date; // 00:00:00 Local
        var todayStartUtc = DateTime.SpecifyKind(todayLocal.Subtract(timeZoneOffset), DateTimeKind.Utc);
        var tomorrowStartUtc = todayStartUtc.AddDays(1);
        
        var yesterdayStartUtc = todayStartUtc.AddDays(-1);
        var weekStartLocal = todayLocal.AddDays(-7); // Last 7 days window or Start of week? Typically "Last 7 days" includes today, but let's stick to "Current Week" or "Last 7 days rolling". Impl below was rolling.
        // The original code used rolling windows based on 'Date'. Let's align "Today" to local start of day.
        
        var weekStartUtc = todayStartUtc.AddDays(-6); // 7 days including today
        var lastWeekStartUtc = weekStartUtc.AddDays(-7);
        
        var monthStartLocal = new DateTime(nowLocal.Year, nowLocal.Month, 1);
        var monthStartUtc = DateTime.SpecifyKind(monthStartLocal.Subtract(timeZoneOffset), DateTimeKind.Utc);
        
        var lastMonthStartLocal = monthStartLocal.AddMonths(-1);
        var lastMonthStartUtc = DateTime.SpecifyKind(lastMonthStartLocal.Subtract(timeZoneOffset), DateTimeKind.Utc);
        // End of last month is Start of this month
        
        var last30DaysStartUtc = todayStartUtc.AddDays(-29); // 30 days including today

        var completedSales = _context.Sales
            .Where(s => s.TenantId == tenantId && s.Status == SaleStatus.Completed);

        // Optionally filter by store
        if (storeId.HasValue)
            completedSales = completedSales.Where(s => s.StoreId == storeId.Value);

        // Today's revenue
        var todayRevenue = await completedSales
            .Where(s => s.SaleDate >= todayStartUtc && s.SaleDate < tomorrowStartUtc)
            .SumAsync(s => (decimal?)s.Total) ?? 0;

        var todaySalesCount = await completedSales
            .Where(s => s.SaleDate >= todayStartUtc && s.SaleDate < tomorrowStartUtc)
            .CountAsync();

        // Yesterday's revenue
        var yesterdayRevenue = await completedSales
            .Where(s => s.SaleDate >= yesterdayStartUtc && s.SaleDate < todayStartUtc)
            .SumAsync(s => (decimal?)s.Total) ?? 0;

        var yesterdaySalesCount = await completedSales
            .Where(s => s.SaleDate >= yesterdayStartUtc && s.SaleDate < todayStartUtc)
            .CountAsync();

        // Growth percentage (today vs yesterday)
        var revenueGrowth = yesterdayRevenue > 0
            ? ((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100
            : (todayRevenue > 0 ? 100m : 0m);

        // Week revenue (last 7 days including today)
        var weekRevenue = await completedSales
            .Where(s => s.SaleDate >= weekStartUtc && s.SaleDate < tomorrowStartUtc)
            .SumAsync(s => (decimal?)s.Total) ?? 0;

        // Last week revenue (7-14 days ago)
        var lastWeekRevenue = await completedSales
            .Where(s => s.SaleDate >= lastWeekStartUtc && s.SaleDate < weekStartUtc)
            .SumAsync(s => (decimal?)s.Total) ?? 0;

        // Week growth percentage
        var weekGrowth = lastWeekRevenue > 0
            ? ((weekRevenue - lastWeekRevenue) / lastWeekRevenue) * 100
            : (weekRevenue > 0 ? 100m : 0m);

        // Month revenue (current month)
        var monthRevenue = await completedSales
            .Where(s => s.SaleDate >= monthStartUtc) // Up to now
            .SumAsync(s => (decimal?)s.Total) ?? 0;

        // Last month revenue (full last month)
        var lastMonthRevenue = await completedSales
            .Where(s => s.SaleDate >= lastMonthStartUtc && s.SaleDate < monthStartUtc)
            .SumAsync(s => (decimal?)s.Total) ?? 0;

        // Month growth percentage
        var monthGrowth = lastMonthRevenue > 0
            ? ((monthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100
            : (monthRevenue > 0 ? 100m : 0m);

        // Average ticket (this month)
        var monthSalesCount = await completedSales
            .Where(s => s.SaleDate >= monthStartUtc)
            .CountAsync();
        var averageTicket = monthSalesCount > 0 ? monthRevenue / monthSalesCount : 0;

        // Average ticket (last month)
        var lastMonthSalesCount = await completedSales
            .Where(s => s.SaleDate >= lastMonthStartUtc && s.SaleDate < monthStartUtc)
            .CountAsync();
        var lastMonthAverageTicket = lastMonthSalesCount > 0 ? lastMonthRevenue / lastMonthSalesCount : 0;

        // Top 10 products (last 30 days)
        var topProducts = await completedSales
            .Where(s => s.SaleDate >= last30DaysStartUtc)
            .SelectMany(s => s.Items)
            .GroupBy(i => new { i.ProductId, i.ProductCode, i.ProductName, i.UOMCode })
            .Select(g => new
            {
                g.Key.ProductId,
                g.Key.ProductCode,
                ProductName = g.Key.ProductName.Contains(" (")
                    ? g.Key.ProductName.Substring(0, g.Key.ProductName.IndexOf(" ("))
                    : g.Key.ProductName,
                TotalSold = g.Sum(i => i.Quantity),
                TotalRevenue = g.Sum(i => i.Subtotal),
                UnitOfMeasure = g.Key.UOMCode ?? "UNID"
            })
            .OrderByDescending(x => x.TotalRevenue)
            .Take(100)
            .ToListAsync();

        var rankedTopProducts = topProducts.Select((p, index) => new TopProductDto(
            index + 1,
            p.ProductId,
            p.ProductCode,
            p.ProductName,
            p.TotalSold,
            p.TotalRevenue,
            p.UnitOfMeasure
        )).ToList();

        // Last 30 days daily sales
        var salesLast30Days = await completedSales
            .Where(s => s.SaleDate >= last30DaysStartUtc && s.SaleDate < tomorrowStartUtc)
            .Select(s => new { s.SaleDate, s.Total })
            .ToListAsync();

        // Group by LOCAL date
        // Fix NaN issues by ensuring division by zero is handled
        var last30Days = salesLast30Days
            .GroupBy(s => s.SaleDate.Add(timeZoneOffset).Date)
            .Select(g => new DailySalesDto(
                DateTime.SpecifyKind(g.Key, DateTimeKind.Utc),
                g.Sum(s => s.Total),
                g.Count()
            ))
            .OrderBy(d => d.Date)
            .ToList();

        // Fill missing days with zero
        var allDays = new List<DailySalesDto>();
        // Iterate including today
        for (var date = last30DaysStartUtc.Add(timeZoneOffset).Date; date <= todayLocal.Date; date = date.AddDays(1))
        {
            var existing = last30Days.FirstOrDefault(d => d.Date.Date == date.Date);
            var utcDate = DateTime.SpecifyKind(date, DateTimeKind.Utc);
            allDays.Add(existing ?? new DailySalesDto(utcDate, 0m, 0));
        }

        // Sales by payment method (this month)
        var salesByPaymentMethod = await completedSales
            .Where(s => s.SaleDate >= monthStartUtc)
            .SelectMany(s => s.Payments)
            .GroupBy(p => p.Method)
            .Select(g => new SalesByPaymentMethodDto(
                g.Key.ToString(),
                g.Sum(p => p.Amount),
                g.Count()
            ))
            .ToListAsync();

        // Low stock alerts (only if storeId is provided, otherwise empty list)
        var lowStockAlerts = storeId.HasValue 
            ? await _inventoryClient.GetLowStockAlertsAsync(storeId.Value, tenantId)
            : new List<LowStockAlertDto>();

        return new SalesDashboardDto(
            todayRevenue,
            yesterdayRevenue,
            revenueGrowth,
            todaySalesCount,
            yesterdaySalesCount,
            weekRevenue,
            lastWeekRevenue,
            weekGrowth,
            monthRevenue,
            lastMonthRevenue,
            monthGrowth,
            averageTicket,
            lastMonthAverageTicket,
            rankedTopProducts,
            allDays,
            salesByPaymentMethod,
            lowStockAlerts
        );
    }

    private static SaleDto MapToSaleDto(Sale sale)
    {
        return new SaleDto(
            sale.Id,
            sale.SaleNumber,
            sale.StoreId,
            sale.CashierId,
            sale.CustomerId,
            sale.Customer?.Name,
            sale.SaleDate,
            sale.Subtotal,
            sale.DiscountAmount,
            sale.TaxAmount,
            sale.Total,
            sale.Status,
            sale.Notes,
            sale.GetPaidAmount(),
            sale.GetRemainingAmount(),
            sale.IsFullyPaid(),
            sale.Items.Select(i => new SaleItemDto(
                i.Id,
                i.ProductId,
                i.ProductName,
                i.ProductCode,
                i.Quantity,
                i.UnitPrice,
                i.DiscountAmount,
                i.Subtotal
            )).ToList(),
            sale.Payments.Select(p => new PaymentDto(
                p.Id,
                p.Method,
                p.Amount,
                p.Reference,
                p.PaymentDate
            )).ToList(),
            sale.DocumentType,
            sale.DocumentSeries,
            sale.DocumentNumber
        );
    }

    public async Task<byte[]> GetTicketPdfAsync(Guid saleId, TicketSettingsDto settings)
    {
        var sale = await GetSaleByIdAsync(saleId);
        if (sale == null) throw new InvalidOperationException("Sale not found");

        // 1. Pre-fetch Logo Image if needed
        byte[] logoBytes = null;
        if (settings.ShowLogo && !string.IsNullOrEmpty(settings.LogoUrl))
        {
            try
            {
                if (settings.LogoUrl.StartsWith("http", StringComparison.OrdinalIgnoreCase))
                {
                    using var client = _httpClientFactory.CreateClient();
                    // Set a timeout to avoid hanging
                    client.Timeout = TimeSpan.FromSeconds(5);
                    logoBytes = await client.GetByteArrayAsync(settings.LogoUrl);
                }
                else if (settings.LogoUrl.StartsWith("data:image", StringComparison.OrdinalIgnoreCase))
                {
                    // Handle Base64
                    var base64Data = settings.LogoUrl.Split(',')[1];
                    logoBytes = Convert.FromBase64String(base64Data);
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to load logo image from {Url}", settings.LogoUrl);
                // Continue without logo
            }
        }

        // Define fonts
        var textStyle = TextStyle.Default.FontSize(settings.TicketWidth == 58 ? 8 : 9).FontFamily(Fonts.Arial);
        var headerStyle = TextStyle.Default.FontSize(settings.TicketWidth == 58 ? 10 : 11).Bold().FontFamily(Fonts.Arial);
        var titleStyle = TextStyle.Default.FontSize(settings.TicketWidth == 58 ? 12 : 14).Bold().FontFamily(Fonts.Arial);

        var document = Document.Create(container =>
        {
            container.Page(page =>
            {
                page.ContinuousSize(settings.TicketWidth, Unit.Millimetre);
                page.Margin(settings.TicketWidth == 58 ? 2 : 4, Unit.Millimetre);
                page.DefaultTextStyle(textStyle);

                page.Content().Column(col =>
                {
                    // --- LOGO ---
                    if (logoBytes != null)
                    {
                        col.Item().AlignCenter().Image(logoBytes).FitArea();
                    }

                    // --- HEADER ---
                    col.Item().AlignCenter().Text(settings.StoreName).Style(titleStyle);
                    col.Item().AlignCenter().Text($"RUC: {settings.StoreRuc}");
                    col.Item().AlignCenter().Text(settings.StoreAddress);
                    col.Item().AlignCenter().Text($"Tel: {settings.StorePhone}");
                    
                    col.Item().PaddingVertical(5).LineHorizontal(1).LineColor(Colors.Black);

                    // --- SALE INFO ---
                    var docTypeName = "COMPROBANTE DE VENTA";
                    if (sale.DocumentType == "01") docTypeName = "FACTURA ELECTRÓNICA";
                    else if (sale.DocumentType == "03") docTypeName = "BOLETA DE VENTA";
                    else if (sale.DocumentType == "80") docTypeName = "NOTA DE VENTA";

                    col.Item().AlignCenter().Text(docTypeName).Style(headerStyle);
                    
                    var docNumberText = !string.IsNullOrEmpty(sale.DocumentNumber) 
                        ? $"{sale.DocumentSeries}-{sale.DocumentNumber}" 
                        : sale.SaleNumber;

                    col.Item().AlignCenter().Text(docNumberText);
                    
                    col.Item().PaddingTop(5).Text($"Fecha: {sale.SaleDate.ToLocalTime():dd/MM/yyyy HH:mm}");
                    col.Item().Text($"Cajero: {settings.CashierName ?? "Usuario"}");
                    col.Item().Text($"Cliente: {sale.CustomerName ?? "Público General"}");

                    col.Item().PaddingVertical(5).LineHorizontal(1).LineColor(Colors.Black);

                    // --- ITEMS ---
                    col.Item().Table(table =>
                    {
                        table.ColumnsDefinition(columns =>
                        {
                            columns.RelativeColumn(3); // Name
                            columns.RelativeColumn(1); // Qty
                            columns.RelativeColumn(1); // Price
                            columns.RelativeColumn(1); // Total
                        });

                        // Header
                        table.Header(header =>
                        {
                            header.Cell().Text("Prod").Bold();
                            header.Cell().AlignRight().Text("Cant").Bold();
                            header.Cell().AlignRight().Text("P.U").Bold();
                            header.Cell().AlignRight().Text("Tot").Bold();
                        });

                        // Items
                        foreach (var item in sale.Items)
                        {
                            table.Cell().Text(item.ProductName);
                            table.Cell().AlignRight().Text($"{item.Quantity}");
                            table.Cell().AlignRight().Text($"{item.UnitPrice:N2}");
                            table.Cell().AlignRight().Text($"{item.Subtotal:N2}");
                        }
                    });

                    col.Item().PaddingVertical(5).LineHorizontal(1).LineColor(Colors.Black);

                    // --- TOTALS ---
                    col.Item().AlignRight().Text(text =>
                    {
                        text.Span("Subtotal: ").Bold();
                        text.Span($"S/ {sale.Subtotal:N2}");
                    });
                    
                    col.Item().AlignRight().Text(text =>
                    {
                        text.Span("IGV: ").Bold();
                        text.Span($"S/ {sale.TaxAmount:N2}");
                    });

                    col.Item().PaddingTop(5).AlignRight().Text(text =>
                    {
                        text.Span("TOTAL: ").Style(titleStyle);
                        text.Span($"S/ {sale.Total:N2}").Style(titleStyle);
                    });

                    // --- FOOTER ---
                    var footerText = settings.FooterText ?? "Gracias por su compra";
                    // Fix literal newlines if they come escaped from JSON
                    footerText = footerText.Replace("\\n", "\n");

                    col.Item().PaddingTop(10).AlignCenter().Text(footerText);
                    col.Item().PaddingTop(5).AlignCenter().Text("Powered by Profitzen").FontSize(7).FontColor(Colors.Grey.Medium);
                });
            });
        });

        try
        {
            _logger.LogInformation("Generating PDF for Sale {SaleId}", saleId);
            var pdfBytes = document.GeneratePdf();
            _logger.LogInformation("PDF generated successfully for Sale {SaleId}, Size: {Size} bytes", saleId, pdfBytes.Length);
            return pdfBytes;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to generate PDF for Sale {SaleId}", saleId);
            throw new InvalidOperationException("Error interno al generar el PDF del ticket.", ex);
        }
    }
}