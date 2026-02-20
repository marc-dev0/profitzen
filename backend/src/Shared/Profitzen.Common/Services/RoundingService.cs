namespace Profitzen.Common.Services;

/// <summary>
/// Servicio de redondeo monetario para tiendas que no manejan monedas menores a 10 céntimos.
/// Redondea el monto al múltiplo de S/ 0.10 más cercano.
/// 
/// IMPORTANTE: Este redondeo SOLO aplica a pagos en EFECTIVO.
/// Pagos digitales (tarjeta, transferencia, Yape/Plin) se cobran al céntimo exacto.
/// </summary>
public static class RoundingService
{
    /// <summary>
    /// Aplica el redondeo al monto dado.
    /// Redondeado al múltiplo de S/ 0.10 más cercano.
    /// </summary>
    public static decimal ApplyBCRPRounding(decimal amount)
    {
        // 1/0.10 = 10. Multiplicamos, redondeamos al entero, y dividimos.
        return Math.Round(amount * 10m, MidpointRounding.AwayFromZero) / 10m;
    }

    /// <summary>
    /// Calcula el ajuste de redondeo (positivo o negativo).
    /// </summary>
    public static decimal GetRoundingAdjustment(decimal originalAmount)
    {
        return ApplyBCRPRounding(originalAmount) - originalAmount;
    }

    /// <summary>
    /// Calcula el vuelto correcto considerando el redondeo BCRP.
    /// </summary>
    public static ChangeCalculation CalculateChange(decimal totalAmount, decimal amountReceived, bool appliesRounding)
    {
        var roundedTotal = appliesRounding ? ApplyBCRPRounding(totalAmount) : totalAmount;
        var roundingAdjustment = roundedTotal - totalAmount;
        var change = amountReceived - roundedTotal;

        return new ChangeCalculation
        {
            OriginalTotal = totalAmount,
            RoundedTotal = roundedTotal,
            RoundingAdjustment = roundingAdjustment,
            AmountReceived = amountReceived,
            Change = Math.Max(0, change),
            IsPaymentSufficient = amountReceived >= roundedTotal,
            Deficit = Math.Max(0, roundedTotal - amountReceived)
        };
    }
}

public class ChangeCalculation
{
    public decimal OriginalTotal { get; set; }
    public decimal RoundedTotal { get; set; }
    public decimal RoundingAdjustment { get; set; }
    public decimal AmountReceived { get; set; }
    public decimal Change { get; set; }
    public bool IsPaymentSufficient { get; set; }
    public decimal Deficit { get; set; }
}
