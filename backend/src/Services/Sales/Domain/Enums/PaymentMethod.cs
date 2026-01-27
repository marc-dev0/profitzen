namespace Profitzen.Sales.Domain.Enums;

public enum PaymentMethod
{
    Cash = 1,           // Efectivo
    Card = 2,           // Tarjeta
    Transfer = 3,       // Transferencia
    DigitalWallet = 4,  // Billetera digital (Yape, Plin)
    Credit = 5          // Crédito (fiado)
}