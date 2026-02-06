using Microsoft.EntityFrameworkCore;
using Profitzen.Customer.Application.DTOs;
using Profitzen.Customer.Domain.Entities;
using Profitzen.Customer.Infrastructure;

namespace Profitzen.Customer.Application.Services;

public class CustomerService : ICustomerService
{
    private readonly CustomerDbContext _context;

    public CustomerService(CustomerDbContext context)
    {
        _context = context;
    }

    public async Task<IEnumerable<CustomerDto>> GetCustomersAsync(string tenantId)
    {
        return await _context.Customers
            .Where(c => c.TenantId == tenantId && c.IsActive)
            .Include(c => c.Purchases)
            .Select(c => new CustomerDto(
                c.Id,
                c.DocumentType,
                c.DocumentNumber,
                c.FirstName,
                c.LastName,
                c.GetFullName(),
                c.Email,
                c.Phone,
                c.Address,
                c.CreditLimit,
                c.CurrentDebt,
                c.GetAvailableCredit(),
                c.Purchases.Count,
                c.Purchases.Sum(p => p.TotalAmount),
                c.IsActive,
                c.CreatedAt
            ))
            .ToListAsync();
    }

    public async Task<CustomerDto?> GetCustomerByIdAsync(Guid id)
    {
        var customer = await _context.Customers
            .Include(c => c.Purchases)
            .FirstOrDefaultAsync(c => c.Id == id);

        return customer == null ? null : new CustomerDto(
            customer.Id,
            customer.DocumentType,
            customer.DocumentNumber,
            customer.FirstName,
            customer.LastName,
            customer.GetFullName(),
            customer.Email,
            customer.Phone,
            customer.Address,
            customer.CreditLimit,
            customer.CurrentDebt,
            customer.GetAvailableCredit(),
            customer.Purchases.Count,
            customer.Purchases.Sum(p => p.TotalAmount),
            customer.IsActive,
            customer.CreatedAt
        );
    }

    public async Task<CustomerDto?> GetCustomerByDocumentAsync(string documentNumber, string tenantId)
    {
        var customer = await _context.Customers
            .Include(c => c.Purchases)
            .FirstOrDefaultAsync(c => c.DocumentNumber == documentNumber && c.TenantId == tenantId);

        return customer == null ? null : new CustomerDto(
            customer.Id,
            customer.DocumentType,
            customer.DocumentNumber,
            customer.FirstName,
            customer.LastName,
            customer.GetFullName(),
            customer.Email,
            customer.Phone,
            customer.Address,
            customer.CreditLimit,
            customer.CurrentDebt,
            customer.GetAvailableCredit(),
            customer.Purchases.Count,
            customer.Purchases.Sum(p => p.TotalAmount),
            customer.IsActive,
            customer.CreatedAt
        );
    }

    public async Task<CustomerDto> CreateCustomerAsync(CreateCustomerRequest request, string tenantId, Guid userId)
    {
        var existingCustomer = await _context.Customers
            .FirstOrDefaultAsync(c => c.DocumentNumber == request.DocumentNumber && c.TenantId == tenantId);

        if (existingCustomer != null)
            throw new InvalidOperationException("Customer with this document number already exists");

        var customer = new Domain.Entities.Customer(
            tenantId,
            request.DocumentType,
            request.DocumentNumber,
            request.FirstName,
            request.LastName,
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

    public async Task<CustomerDto> UpdateCustomerAsync(Guid id, UpdateCustomerRequest request, Guid userId)
    {
        var customer = await _context.Customers.FindAsync(id);
        if (customer == null)
            throw new InvalidOperationException("Customer not found");

        var newDocType = request.DocumentType ?? customer.DocumentType;
        var newDocNum = request.DocumentNumber ?? customer.DocumentNumber;


        if (newDocNum != customer.DocumentNumber)
        {
            var existing = await _context.Customers
                .FirstOrDefaultAsync(c => c.DocumentNumber == newDocNum && c.TenantId == customer.TenantId && c.Id != id);
            
            if (existing != null)
                throw new InvalidOperationException($"Ya existe un cliente con el número de documento {newDocNum}");
        }

        customer.UpdateInfo(
            newDocType,
            newDocNum,
            request.FirstName,
            request.LastName,
            request.Email,
            request.Phone,
            request.Address
        );

        await _context.SaveChangesAsync();

        return await GetCustomerByIdAsync(id)
            ?? throw new InvalidOperationException("Failed to retrieve updated customer");
    }

    public async Task<CustomerDto> UpdateCreditLimitAsync(Guid id, UpdateCreditLimitRequest request, Guid userId)
    {
        var customer = await _context.Customers.FindAsync(id);
        if (customer == null)
            throw new InvalidOperationException("Customer not found");

        customer.UpdateCreditLimit(request.CreditLimit);
        await _context.SaveChangesAsync();

        return await GetCustomerByIdAsync(id)
            ?? throw new InvalidOperationException("Failed to retrieve updated customer");
    }

    public async Task<bool> DeleteCustomerAsync(Guid id, Guid userId)
    {
        var customer = await _context.Customers.FindAsync(id);
        if (customer == null)
            return false;

        customer.Deactivate();
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<IEnumerable<PurchaseDto>> GetCustomerPurchasesAsync(Guid customerId)
    {
        return await _context.Purchases
            .Where(p => p.CustomerId == customerId)
            .OrderByDescending(p => p.PurchaseDate)
            .Select(p => new PurchaseDto(
                p.Id,
                p.CustomerId,
                p.SaleId,
                p.TotalAmount,
                p.PurchaseDate
            ))
            .ToListAsync();
    }

    public async Task<CustomerStatsDto?> GetCustomerStatsAsync(Guid customerId)
    {
        var customer = await _context.Customers
            .Include(c => c.Purchases)
            .FirstOrDefaultAsync(c => c.Id == customerId);

        if (customer == null)
            return null;

        var purchases = customer.Purchases.OrderBy(p => p.PurchaseDate).ToList();

        if (!purchases.Any())
            return new CustomerStatsDto(
                customer.Id,
                customer.GetFullName(),
                0,
                0,
                0,
                customer.CreatedAt,
                null,
                0
            );

        var firstPurchase = purchases.First().PurchaseDate;
        var lastPurchase = purchases.Last().PurchaseDate;
        var totalSpent = purchases.Sum(p => p.TotalAmount);
        var averageTicket = totalSpent / purchases.Count;
        var daysSinceLastPurchase = (DateTime.UtcNow - lastPurchase).Days;

        return new CustomerStatsDto(
            customer.Id,
            customer.GetFullName(),
            purchases.Count,
            totalSpent,
            averageTicket,
            firstPurchase,
            lastPurchase,
            daysSinceLastPurchase
        );
    }

    public async Task<PurchaseDto> RecordPurchaseAsync(Guid customerId, Guid saleId, decimal totalAmount, string tenantId)
    {
        var customer = await _context.Customers.FindAsync(customerId);
        if (customer == null)
            throw new InvalidOperationException("Customer not found");

        var purchase = new Purchase(tenantId, customerId, saleId, totalAmount);
        _context.Purchases.Add(purchase);
        await _context.SaveChangesAsync();

        return new PurchaseDto(
            purchase.Id,
            purchase.CustomerId,
            purchase.SaleId,
            purchase.TotalAmount,
            purchase.PurchaseDate
        );
    }

    public async Task<IEnumerable<CreditDto>> GetCustomerCreditsAsync(Guid customerId)
    {
        return await _context.Credits
            .Include(c => c.Customer)
            .Include(c => c.Payments)
            .Where(c => c.CustomerId == customerId)
            .OrderByDescending(c => c.CreditDate)
            .Select(c => new CreditDto(
                c.Id,
                c.CustomerId,
                c.Customer.GetFullName(),
                c.Amount,
                c.RemainingAmount,
                c.CreditDate,
                c.DueDate,
                c.IsPaid,
                c.IsOverdue(),
                c.PaidDate,
                c.Notes,
                c.Payments.Select(p => new CreditPaymentDto(
                    p.Id,
                    p.Amount,
                    p.PaymentDate,
                    p.Notes
                )).ToList(),
                c.CreatedAt
            ))
            .ToListAsync();
    }

    public async Task<CreditDto?> GetCreditByIdAsync(Guid id)
    {
        var credit = await _context.Credits
            .Include(c => c.Customer)
            .Include(c => c.Payments)
            .FirstOrDefaultAsync(c => c.Id == id);

        return credit == null ? null : new CreditDto(
            credit.Id,
            credit.CustomerId,
            credit.Customer.GetFullName(),
            credit.Amount,
            credit.RemainingAmount,
            credit.CreditDate,
            credit.DueDate,
            credit.IsPaid,
            credit.IsOverdue(),
            credit.PaidDate,
            credit.Notes,
            credit.Payments.Select(p => new CreditPaymentDto(
                p.Id,
                p.Amount,
                p.PaymentDate,
                p.Notes
            )).ToList(),
            credit.CreatedAt
        );
    }

    public async Task<CreditDto> CreateCreditAsync(CreateCreditRequest request, Guid userId)
    {
        var customer = await _context.Customers.FindAsync(request.CustomerId);
        if (customer == null)
            throw new InvalidOperationException("Customer not found");

        if (!customer.HasAvailableCredit(request.Amount))
            throw new InvalidOperationException("Customer does not have enough available credit");

        var credit = new Credit(customer.TenantId, request.CustomerId, request.StoreId, request.Amount, request.DueDate, request.Notes);
        _context.Credits.Add(credit);

        customer.AddDebt(request.Amount);
        await _context.SaveChangesAsync();

        return await GetCreditByIdAsync(credit.Id)
            ?? throw new InvalidOperationException("Failed to retrieve created credit");
    }

    public async Task<CreditDto> AddCreditPaymentAsync(Guid creditId, AddCreditPaymentRequest request, Guid userId)
    {
        using var transaction = await _context.Database.BeginTransactionAsync();
        
        try
        {

            var credit = await _context.Credits
                .AsNoTracking()
                .FirstOrDefaultAsync(c => c.Id == creditId);

            if (credit == null)
                throw new InvalidOperationException("No se encontró el crédito especificado");

            if (credit.IsPaid)
                throw new InvalidOperationException("Este crédito ya está completamente pagado");

            if (request.Amount <= 0)
                throw new InvalidOperationException("El monto del pago debe ser mayor a cero");

            if (request.Amount > credit.RemainingAmount)
                throw new InvalidOperationException($"El monto del pago (S/ {request.Amount:F2}) excede la deuda restante (S/ {credit.RemainingAmount:F2})");

            var newRemainingAmount = credit.RemainingAmount - request.Amount;
            var isPaid = newRemainingAmount == 0;
            

            var payment = new CreditPayment(credit.TenantId, creditId, request.StoreId, request.Amount, request.Notes);
            _context.CreditPayments.Add(payment);
            await _context.SaveChangesAsync();
            

            await _context.Database.ExecuteSqlRawAsync(
                @"UPDATE customer.""Credits"" 
                  SET ""RemainingAmount"" = {0}, 
                      ""IsPaid"" = {1}, 
                      ""PaidDate"" = {2},
                      ""UpdatedAt"" = {3}
                  WHERE ""Id"" = {4}",
                newRemainingAmount,
                isPaid,
                isPaid ? DateTime.UtcNow : (DateTime?)null,
                DateTime.UtcNow,
                creditId);
            

            await _context.Database.ExecuteSqlRawAsync(
                @"UPDATE customer.""Customers"" 
                  SET ""CurrentDebt"" = ""CurrentDebt"" - {0},
                      ""UpdatedAt"" = {1}
                  WHERE ""Id"" = {2}",
                request.Amount,
                DateTime.UtcNow,
                credit.CustomerId);

            await transaction.CommitAsync();

            return await GetCreditByIdAsync(creditId)
                ?? throw new InvalidOperationException("No se pudo recuperar el crédito actualizado");
        }
        catch (InvalidOperationException)
        {
            await transaction.RollbackAsync();
            throw;
        }
        catch (Exception ex)
        {
            await transaction.RollbackAsync();
            throw new InvalidOperationException($"Error al procesar el pago: {ex.Message}", ex);
        }
    }

    public async Task RefundCreditAsync(Guid customerId, string reference, Guid userId)
    {
        using var transaction = await _context.Database.BeginTransactionAsync();
        
        try
        {

            var searchRef = reference.Replace("#", "");
            

            var credit = await _context.Credits
                .AsNoTracking()
                .Where(c => c.CustomerId == customerId && c.Notes != null && c.Notes.Contains(searchRef))
                .OrderByDescending(c => c.CreatedAt)
                .FirstOrDefaultAsync();

            if (credit == null)
            {
                await transaction.RollbackAsync();
                throw new InvalidOperationException($"No se encontró el crédito para la referencia '{reference}'");
            }

            if (credit.IsPaid || credit.RemainingAmount == 0)
            {

                await transaction.CommitAsync();
                return;
            }

            var amountToReverse = credit.RemainingAmount;
            if (amountToReverse > 0)
            {

                var payment = new CreditPayment(credit.TenantId, credit.Id, credit.StoreId, amountToReverse, $"Devolución / Refund: {reference}");
                _context.CreditPayments.Add(payment);
                await _context.SaveChangesAsync();
                

                await _context.Database.ExecuteSqlRawAsync(
                    @"UPDATE customer.""Credits"" 
                      SET ""RemainingAmount"" = 0, 
                          ""IsPaid"" = true, 
                          ""PaidDate"" = {0},
                          ""UpdatedAt"" = {1}
                      WHERE ""Id"" = {2}",
                    DateTime.UtcNow,
                    DateTime.UtcNow,
                    credit.Id);
                

                await _context.Database.ExecuteSqlRawAsync(
                    @"UPDATE customer.""Customers"" 
                      SET ""CurrentDebt"" = ""CurrentDebt"" - {0},
                          ""UpdatedAt"" = {1}
                      WHERE ""Id"" = {2}",
                    amountToReverse,
                    DateTime.UtcNow,
                    customerId);
            }

            await transaction.CommitAsync();
        }
        catch (Exception ex)
        {
            await transaction.RollbackAsync();
            throw new InvalidOperationException($"Error al revertir el crédito: {ex.Message}", ex);
        }
    }

    public async Task<IEnumerable<CreditDto>> GetOverdueCreditsAsync(string tenantId)
    {
        return await _context.Credits
            .Include(c => c.Customer)
            .Include(c => c.Payments)
            .Where(c => c.Customer.TenantId == tenantId && !c.IsPaid && c.DueDate.HasValue && c.DueDate.Value < DateTime.UtcNow)
            .OrderBy(c => c.DueDate)
            .Select(c => MapToCreditDto(c))
            .ToListAsync();
    }

    public async Task<IEnumerable<CreditDto>> GetPendingCreditsAsync(string tenantId)
    {
        return await _context.Credits
            .Include(c => c.Customer)
            .Include(c => c.Payments)
            .Where(c => c.Customer.TenantId == tenantId && !c.IsPaid)
            .OrderBy(c => c.DueDate)
            .Select(c => MapToCreditDto(c))
            .ToListAsync();
    }

    public async Task<IEnumerable<CreditPaymentDetailDto>> GetCreditPaymentsAsync(string tenantId, Guid? storeId = null, DateTime? fromDate = null, DateTime? toDate = null)
    {
        var query = _context.CreditPayments
            .Include(p => p.Credit)
                .ThenInclude(c => c.Customer)
            .Where(p => p.TenantId == tenantId);

        if (storeId.HasValue)
            query = query.Where(p => p.StoreId == storeId.Value);

        if (fromDate.HasValue)
            query = query.Where(p => p.PaymentDate >= fromDate.Value);

        if (toDate.HasValue)
            query = query.Where(p => p.PaymentDate <= toDate.Value);

        var payments = await query
            .OrderByDescending(p => p.PaymentDate)
            .ToListAsync();

        return payments.Select(p => new CreditPaymentDetailDto(
            p.Id,
            p.CreditId,
            p.Credit.CustomerId,
            p.Credit.Customer.GetFullName(),
            p.StoreId,
            p.Amount,
            p.PaymentDate,
            p.Notes
        ));
    }

    private static CreditDto MapToCreditDto(Credit c)
    {
        return new CreditDto(
            c.Id,
            c.CustomerId,
            c.Customer.GetFullName(),
            c.Amount,
            c.RemainingAmount,
            c.CreditDate,
            c.DueDate,
            c.IsPaid,
            c.IsOverdue(),
            c.PaidDate,
            c.Notes,
            c.Payments.Select(p => new CreditPaymentDto(
                p.Id,
                p.Amount,
                p.PaymentDate,
                p.Notes
            )).ToList(),
            c.CreatedAt
        );
    }

    public async Task<IEnumerable<CustomerDto>> GetTopCustomersAsync(string tenantId, int count = 10)
    {
        return await _context.Customers
            .Where(c => c.TenantId == tenantId && c.IsActive)
            .Include(c => c.Purchases)
            .OrderByDescending(c => c.Purchases.Sum(p => p.TotalAmount))
            .Take(count)
            .Select(c => new CustomerDto(
                c.Id,
                c.DocumentType,
                c.DocumentNumber,
                c.FirstName,
                c.LastName,
                c.GetFullName(),
                c.Email,
                c.Phone,
                c.Address,
                c.CreditLimit,
                c.CurrentDebt,
                c.GetAvailableCredit(),
                c.Purchases.Count,
                c.Purchases.Sum(p => p.TotalAmount),
                c.IsActive,
                c.CreatedAt
            ))
            .ToListAsync();
    }
}
