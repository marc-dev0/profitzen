namespace Profitzen.Common.Exceptions;

public abstract class DomainException : Exception
{
    protected DomainException(string message) : base(message)
    {
    }

    protected DomainException(string message, Exception innerException) : base(message, innerException)
    {
    }
}

public class EntityNotFoundException : DomainException
{
    public EntityNotFoundException(string entityName, object id)
        : base($"Entity {entityName} with ID {id} was not found")
    {
    }
}

public class BusinessRuleValidationException : DomainException
{
    public BusinessRuleValidationException(string rule)
        : base($"Business rule validation failed: {rule}")
    {
    }
}

public class InvalidOperationDomainException : DomainException
{
    public InvalidOperationDomainException(string operation)
        : base($"Invalid operation: {operation}")
    {
    }
}