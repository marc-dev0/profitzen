namespace Profitzen.Identity.Domain.Enums;

[Flags]
public enum UserRole
{
    None = 0,
    Admin = 1,
    Manager = 2,
    Cashier = 4,
    Logistics = 8
}