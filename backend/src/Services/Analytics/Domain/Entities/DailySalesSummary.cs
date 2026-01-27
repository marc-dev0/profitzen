using Profitzen.Common.Domain;

namespace Profitzen.Analytics.Domain.Entities;

public class DailySalesSummary : BaseEntity
{
    public string TenantId { get; private set; } = string.Empty;
    public Guid StoreId { get; private set; }
    public DateTime Date { get; private set; }
    public int TotalSales { get; private set; }
    public decimal TotalRevenue { get; private set; }
    public decimal TotalCost { get; private set; }
    public decimal TotalProfit { get; private set; }
    public decimal AverageTicket { get; private set; }
    public int TotalItems { get; private set; }
    public int TotalCustomers { get; private set; }

    private DailySalesSummary() { }

    public DailySalesSummary(
        string tenantId,
        Guid storeId,
        DateTime date,
        int totalSales,
        decimal totalRevenue,
        decimal totalCost,
        int totalItems,
        int totalCustomers)
    {
        TenantId = tenantId;
        StoreId = storeId;
        Date = date.Date;
        TotalSales = totalSales;
        TotalRevenue = totalRevenue;
        TotalCost = totalCost;
        TotalProfit = totalRevenue - totalCost;
        AverageTicket = totalSales > 0 ? totalRevenue / totalSales : 0;
        TotalItems = totalItems;
        TotalCustomers = totalCustomers;
    }

    public void Update(int totalSales, decimal totalRevenue, decimal totalCost, int totalItems, int totalCustomers)
    {
        TotalSales = totalSales;
        TotalRevenue = totalRevenue;
        TotalCost = totalCost;
        TotalProfit = totalRevenue - totalCost;
        AverageTicket = totalSales > 0 ? totalRevenue / totalSales : 0;
        TotalItems = totalItems;
        TotalCustomers = totalCustomers;
    }
}
