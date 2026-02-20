using System.Text.Json;
using Profitzen.PaymentMethods.DTOs;
using StackExchange.Redis;

namespace Profitzen.PaymentMethods.Application.Services;

public class SaleCalculationService
{
    private readonly IConnectionMultiplexer _redis;
    private readonly ILogger<SaleCalculationService> _logger;
    private const int CacheExpirationMinutes = 30;

    public SaleCalculationService(
        IConnectionMultiplexer redis,
        ILogger<SaleCalculationService> logger)
    {
        _redis = redis;
        _logger = logger;
    }

    public async Task<CalculateSaleResponse> CalculateAndCacheAsync(CalculateSaleRequest request)
    {
        _logger.LogInformation("Calculating sale with {ItemCount} items, AmountReceived: {Amount}", 
            request.Items.Count, request.AmountReceived);

        // Calculate item subtotals with proper rounding (banker's rounding to match JavaScript)
        var calculatedItems = request.Items.Select(item =>
        {
            var rawSubtotal = (item.UnitPrice * item.Quantity) - item.DiscountAmount;
            var roundedSubtotal = Math.Round(rawSubtotal, 2, MidpointRounding.ToEven);

            return new CalculatedItemDto
            {
                ProductId = item.ProductId,
                ProductName = item.ProductName,
                ProductCode = item.ProductCode,
                Quantity = item.Quantity,
                UnitPrice = item.UnitPrice,
                DiscountAmount = item.DiscountAmount,
                Subtotal = roundedSubtotal,
                ConversionToBase = item.ConversionToBase,
                UOMId = item.UOMId,
                UOMCode = item.UOMCode
            };
        }).ToList();

        // Calculate totals
        var total = calculatedItems.Sum(i => i.Subtotal);
        
        // Back-calculate Subtotal and Tax assuming Total includes 18% IGV
        // Total = Subtotal * 1.18
        var subtotal = Math.Round(total / 1.18m, 2, MidpointRounding.ToEven);
        var taxAmount = total - subtotal;

        // Calculate BCRP rounding
        var roundingAdjustment = CalculateBCRPRounding(total);
        var finalTotal = total + roundingAdjustment;

        // Calculate change
        var changeAmount = Math.Max(0, request.AmountReceived - finalTotal);
        var isPaymentSufficient = request.AmountReceived >= finalTotal - 0.01m; // Small tolerance

        var response = new CalculateSaleResponse
        {
            CacheKey = Guid.NewGuid().ToString(),
            Items = calculatedItems,
            Subtotal = subtotal,
            TaxAmount = taxAmount,
            Total = total,
            RoundingAdjustment = roundingAdjustment,
            FinalTotal = finalTotal,
            AmountReceived = request.AmountReceived,
            ChangeAmount = changeAmount,
            IsPaymentSufficient = isPaymentSufficient
        };

        // Cache the calculation
        await CacheCalculationAsync(response);

        _logger.LogInformation("Sale calculated - Subtotal: {Subtotal}, Tax: {Tax}, Total: {Total}, Rounding: {Rounding}, Final: {Final}, Change: {Change}",
            response.Subtotal, response.TaxAmount, response.Total, response.RoundingAdjustment, response.FinalTotal, response.ChangeAmount);

        return response;
    }

    public async Task<CalculateSaleResponse?> GetCachedCalculationAsync(string cacheKey)
    {
        try
        {
            var db = _redis.GetDatabase();
            var cached = await db.StringGetAsync($"sale:calc:{cacheKey}");
            
            if (cached.IsNullOrEmpty)
            {
                _logger.LogWarning("Calculation not found in cache: {CacheKey}", cacheKey);
                return null;
            }

            var response = JsonSerializer.Deserialize<CalculateSaleResponse>(cached!);
            _logger.LogInformation("Retrieved cached calculation: {CacheKey}", cacheKey);
            return response;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving cached calculation: {CacheKey}", cacheKey);
            return null;
        }
    }

    private async Task CacheCalculationAsync(CalculateSaleResponse response)
    {
        try
        {
            var db = _redis.GetDatabase();
            var json = JsonSerializer.Serialize(response);
            await db.StringSetAsync(
                $"sale:calc:{response.CacheKey}", 
                json, 
                TimeSpan.FromMinutes(CacheExpirationMinutes));
            
            _logger.LogInformation("Cached calculation: {CacheKey}, expires in {Minutes} minutes", 
                response.CacheKey, CacheExpirationMinutes);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error caching calculation: {CacheKey}", response.CacheKey);
            // Don't throw - caching is not critical
        }
    }

    private decimal CalculateBCRPRounding(decimal amount)
    {
        // BCRP rounding rules for Peru
        // Round to nearest 0.05 (5 centavos)
        var cents = amount * 100;
        var lastDigit = (int)cents % 10;

        return lastDigit switch
        {
            1 or 2 => -0.01m * lastDigit,
            3 or 4 => 0.01m * (5 - lastDigit),
            6 or 7 => -0.01m * (lastDigit - 5),
            8 or 9 => 0.01m * (10 - lastDigit),
            _ => 0m
        };
    }
}
