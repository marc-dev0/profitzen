# Database Scripts

## Applying Price Lists Migration

1. Start PostgreSQL
2. Apply migration:
```bash
cd c:\github\Profitzen\backend\src\Services\Product
dotnet ef database update
```

3. Run seed script:
```bash
psql -h localhost -p 5433 -U profitzen_user -d profitzen_product -f Infrastructure/Data/Scripts/SeedPriceLists.sql
```

Or connect to database and run the SQL directly:
```bash
psql -h localhost -p 5433 -U profitzen_user -d profitzen_product
```

Then paste the contents of `SeedPriceLists.sql`.

## Default Price Lists

The seed creates three price lists for DEMO tenant:

1. **Minorista (RETAIL)** - Default retail price list
2. **Mayorista (WHOLESALE)** - Wholesale price list
3. **Distribuidor (DISTRIBUTOR)** - Distributor price list

Each tenant can create their own custom price lists via the API.
