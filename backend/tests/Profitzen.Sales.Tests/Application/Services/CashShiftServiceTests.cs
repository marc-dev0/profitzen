using System;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Moq;
using Profitzen.Sales.Application.Services;
using Profitzen.Sales.Domain.Entities;
using Profitzen.Sales.Domain.Enums;
using Profitzen.Sales.Infrastructure;
using Xunit;
using Xunit.Abstractions;

namespace Profitzen.Sales.Tests.Application.Services
{
    public class CashShiftServiceTests
    {
        private readonly Mock<ILogger<CashShiftService>> _mockLogger;
        private readonly DbContextOptions<SalesDbContext> _dbOptions;
        private readonly ITestOutputHelper _output;

        public CashShiftServiceTests(ITestOutputHelper output)
        {
            _output = output;
            _mockLogger = new Mock<ILogger<CashShiftService>>();
            _dbOptions = new DbContextOptionsBuilder<SalesDbContext>()
                .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString()) // Unique DB per test class/run
                .EnableSensitiveDataLogging()
                .Options;
        }

        private SalesDbContext CreateContext()
        {
            return new SalesDbContext(_dbOptions);
        }

        [Fact]
        public async Task OpenShiftAsync_ShouldCreateShift_WhenNoOpenShiftExists()
        {
            // Arrange
            using var context = CreateContext();
            var service = new CashShiftService(context, _mockLogger.Object);
            var tenantId = "tenant-1";
            var storeId = Guid.NewGuid();
            var userId = "user-1";
            var startAmount = 100m;

            // Act
            var result = await service.OpenShiftAsync(tenantId, storeId, userId, "User Name", startAmount);

            // Assert
            Assert.NotNull(result);
            Assert.Equal(storeId, result.StoreId);
            Assert.Equal("Open", result.Status);
            Assert.Equal(startAmount, result.StartAmount);
            Assert.Equal(startAmount, result.ExpectedCashEndAmount);
            
            var savedShift = await context.CashShifts.FindAsync(result.Id);
            Assert.NotNull(savedShift);
        }

        [Fact]
        public async Task OpenShiftAsync_ShouldThrow_WhenOpenShiftExists()
        {
            // Arrange
            using var context = CreateContext();
            var service = new CashShiftService(context, _mockLogger.Object);
            var tenantId = "tenant-1";
            var storeId = Guid.NewGuid();
            
            // Seed existing open shift
            var existingShift = new CashShift
            {
                Id = Guid.NewGuid(),
                TenantId = tenantId,
                StoreId = storeId,
                Status = "Open",
                StartTime = DateTime.UtcNow,
                UserId = "existing-user",
                UserName = "Existing User"
            };
            context.CashShifts.Add(existingShift);
            await context.SaveChangesAsync();
            _output.WriteLine($"Seeded Shift: {existingShift.Id}, Tenant: {existingShift.TenantId}, Store: {existingShift.StoreId}, Status: {existingShift.Status}");

            // Verify it exists
            var count = await context.CashShifts.CountAsync();
            _output.WriteLine($"Total Shifts in DB: {count}");

            // Act & Assert
            await Assert.ThrowsAsync<InvalidOperationException>(() => 
                service.OpenShiftAsync(tenantId, storeId, "new-user", "User Name", 100m));
        }

        [Fact]
        public async Task AddMovementAsync_ShouldAddIncome_AndRecalculate()
        {
            // Arrange
            using var context = CreateContext();
            var service = new CashShiftService(context, _mockLogger.Object);
            var shiftId = Guid.NewGuid();
            var startAmount = 1000m;

            // Seed shift
            var shift = new CashShift
            {
                Id = shiftId,
                TenantId = "tenant-1",
                StoreId = Guid.NewGuid(),
                Status = "Open",
                StartAmount = startAmount,
                ExpectedCashEndAmount = startAmount,
                StartTime = DateTime.UtcNow,
                UserId = "user-1",
                UserName = "Test User"
            };
            context.CashShifts.Add(shift);
            await context.SaveChangesAsync();

            // Act
            var amount = 500m;
            try 
            {
                await service.AddMovementAsync(shiftId, "IN", amount, "Test Income", "user-1");
            }
            catch(Exception ex)
            {
                _output.WriteLine($"AddMovementAsync threw: {ex}");
                throw;
            }

            // Assert
            var updatedShift = await context.CashShifts.FindAsync(shiftId);
            _output.WriteLine($"Shift TotalCashIn: {updatedShift.TotalCashIn}");
            Assert.Equal(amount, updatedShift.TotalCashIn);
        }

        [Fact]
        public async Task CloseShiftAsync_ShouldCalculateDifference_Correctly()
        {
            // Arrange
            using var context = CreateContext();
            var service = new CashShiftService(context, _mockLogger.Object);
            var shiftId = Guid.NewGuid();
            var storeId = Guid.NewGuid();
            var startAmount = 1000m;

            // Seed shift
            var shift = new CashShift
            {
                Id = shiftId,
                TenantId = "tenant-1",
                StoreId = storeId,
                Status = "Open",
                StartAmount = startAmount,
                StartTime = DateTime.UtcNow.AddHours(-4),
                UserId = "user-1",
                UserName = "Test User",
                ExpectedCashEndAmount = startAmount // Initially
            };
            context.CashShifts.Add(shift);
            
            // Seed Sale: 500 Cash
            var sale = new Sale("tenant-1", storeId, Guid.NewGuid(), "Cashier");
            sale.AddItem(Guid.NewGuid(), "Prod", "P01", 1, 500m);
            sale.AddPayment(PaymentMethod.Cash, 500m);
            sale.Complete(); 
            // Note: SaleDate is UTC Now check logic in Service (StartTime <= SaleDate <= EndTime). 
            // Shift StartTime is -4h, SaleDate is Now. Matches.
            context.Sales.Add(sale);

            // Seed Expense: 200 Cash
            // public Expense(string tenantId, Guid storeId, string description, string category, decimal amount, DateTime date, PaymentMethod paymentMethod, ...)
            var expense = new Expense(
                "tenant-1", 
                storeId, 
                "Restocking", 
                "General", 
                200m, 
                DateTime.UtcNow.AddHours(-2), 
                PaymentMethod.Cash
            );
            context.Expenses.Add(expense);

            await context.SaveChangesAsync();

            // Expected Calculation:
            // Start (1000) + SalesCash (500) - ExpenseCash (200) = 1300.
            
            // Act: Close with actual amount 1300
            var actualAmount = 1300m;
            var result = await service.CloseShiftAsync(shiftId, actualAmount, "All good");

            // Assert
            Assert.Equal("Closed", result.Status);
            Assert.Equal(1300m, result.ExpectedCashEndAmount);
            Assert.Equal(0m, result.Difference);
            Assert.Equal(500m, result.TotalSalesCash);
            
            // Check totals in persisted entity
            var savedShift = await context.CashShifts.FindAsync(shiftId);
            Assert.Equal("Closed", savedShift.Status);
        }
    }
}
