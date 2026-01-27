using MediatR;
using Microsoft.Extensions.Logging;
using Profitzen.Common.Domain;

namespace Profitzen.Common.EventBus;

public class InMemoryEventBus : IEventBus
{
    private readonly IMediator _mediator;
    private readonly ILogger<InMemoryEventBus> _logger;

    public InMemoryEventBus(IMediator mediator, ILogger<InMemoryEventBus> logger)
    {
        _mediator = mediator;
        _logger = logger;
    }

    public async Task PublishAsync<T>(T @event) where T : IDomainEvent
    {
        await PublishAsync(@event, CancellationToken.None);
    }

    public async Task PublishAsync<T>(T @event, CancellationToken cancellationToken) where T : IDomainEvent
    {
        _logger.LogInformation("Publishing event {EventType} with ID {EventId} for Store {StoreId}",
            @event.EventType, @event.Id, @event.StoreId);

        try
        {
            await _mediator.Publish(@event, cancellationToken);

            _logger.LogInformation("Successfully published event {EventType} with ID {EventId}",
                @event.EventType, @event.Id);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to publish event {EventType} with ID {EventId}",
                @event.EventType, @event.Id);
            throw;
        }
    }
}