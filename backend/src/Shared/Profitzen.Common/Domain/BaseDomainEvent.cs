namespace Profitzen.Common.Domain;

public abstract class BaseDomainEvent : IDomainEvent
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
    public string EventType { get; set; } = string.Empty;
    public Guid CorrelationId { get; set; } = Guid.NewGuid();
    public Guid StoreId { get; set; }
    public string? UserId { get; set; }

    protected BaseDomainEvent()
    {
        EventType = GetType().Name;
    }
}