using Profitzen.Common.Domain;

namespace Profitzen.Analytics.Domain.Entities;

public class ProductPerformance : BaseEntity
{
    public string TenantId { get; private set; } = string.Empty;
    public Guid ProductId { get; private set; }
    public string ProductCode { get; private set; } = string.Empty;
    public string ProductName { get; private set; } = string.Empty;
    public int TotalSold { get; private set; }
    public decimal TotalRevenue { get; private set; }
    public decimal TotalCost { get; private set; }
    public decimal TotalProfit { get; private set; }
    public DateTime LastSaleDate { get; private set; }
    public int DaysSinceLastSale { get; private set; }

    private ProductPerformance() { }

    public ProductPerformance(
        string tenantId,
        Guid productId,
        string productCode,
        string productName,
        int totalSold,
        decimal totalRevenue,
        decimal totalCost,
        DateTime lastSaleDate)
    {
        TenantId = tenantId;
        ProductId = productId;
        ProductCode = productCode;
        ProductName = productName;
        TotalSold = totalSold;
        TotalRevenue = totalRevenue;
        TotalCost = totalCost;
        TotalProfit = totalRevenue - totalCost;
        LastSaleDate = lastSaleDate;
        DaysSinceLastSale = (DateTime.UtcNow - lastSaleDate).Days;
    }

    public void UpdateSales(int totalSold, decimal totalRevenue, decimal totalCost, DateTime lastSaleDate)
    {
        TotalSold = totalSold;
        TotalRevenue = totalRevenue;
        TotalCost = totalCost;
        TotalProfit = totalRevenue - totalCost;
        LastSaleDate = lastSaleDate;
        DaysSinceLastSale = (DateTime.UtcNow - lastSaleDate).Days;
    }
}
