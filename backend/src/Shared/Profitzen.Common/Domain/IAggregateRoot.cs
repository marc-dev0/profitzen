namespace Profitzen.Common.Domain;

public interface IAggregateRoot
{
    IReadOnlyList<IDomainEvent> DomainEvents { get; }
    void ClearDomainEvents();
    void AddDomainEvent(IDomainEvent domainEvent);
}