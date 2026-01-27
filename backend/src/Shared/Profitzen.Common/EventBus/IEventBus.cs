using Profitzen.Common.Domain;

namespace Profitzen.Common.EventBus;

public interface IEventBus
{
    Task PublishAsync<T>(T @event) where T : IDomainEvent;
    Task PublishAsync<T>(T @event, CancellationToken cancellationToken) where T : IDomainEvent;
}