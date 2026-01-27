using MediatR;

namespace Profitzen.Common.Domain;

public interface IDomainEvent : INotification
{
    Guid Id { get; }
    DateTime Timestamp { get; }
    string EventType { get; }
    Guid CorrelationId { get; }
    Guid StoreId { get; }
    string? UserId { get; }
}