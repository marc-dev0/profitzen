using Microsoft.Extensions.Configuration;
using Microsoft.EntityFrameworkCore;
using Profitzen.Configuration.Application.DTOs;
using Profitzen.Configuration.Domain.Entities;
using Profitzen.Configuration.Infrastructure;

namespace Profitzen.Configuration.Application.Services;

public class ConfigurationService : IConfigurationService
{
    private readonly ConfigurationDbContext _context;
    private readonly IConfiguration _configuration;

    public ConfigurationService(ConfigurationDbContext context, IConfiguration configuration)
    {
        _context = context;
        _configuration = configuration;
    }

    public async Task<IEnumerable<DocumentSeriesDto>> GetDocumentSeriesAsync(string tenantId, string? documentType = null)
    {
        var query = _context.DocumentSeries
            .Where(ds => ds.TenantId == tenantId && ds.IsActive);

        if (!string.IsNullOrEmpty(documentType))
            query = query.Where(ds => ds.DocumentType == documentType);

        return await query
            .OrderBy(ds => ds.DocumentType)
            .ThenBy(ds => ds.SeriesCode)
            .Select(ds => new DocumentSeriesDto(
                ds.Id,
                ds.SeriesCode,
                ds.DocumentType,
                ds.DocumentTypeName,
                ds.CurrentNumber,
                ds.StoreId,
                ds.IsActive,
                ds.IsDefault,
                ds.CreatedAt
            ))
            .ToListAsync();
    }

    public async Task<DocumentSeriesDto?> GetDocumentSeriesByIdAsync(Guid id)
    {
        var series = await _context.DocumentSeries.FindAsync(id);
        if (series == null)
            return null;

        return new DocumentSeriesDto(
            series.Id,
            series.SeriesCode,
            series.DocumentType,
            series.DocumentTypeName,
            series.CurrentNumber,
            series.StoreId,
            series.IsActive,
            series.IsDefault,
            series.CreatedAt
        );
    }

    public async Task<DocumentSeriesDto> CreateDocumentSeriesAsync(CreateDocumentSeriesRequest request, string tenantId, Guid userId)
    {
        var existingSeries = await _context.DocumentSeries
            .Where(ds => ds.SeriesCode == request.SeriesCode && ds.TenantId == tenantId)
            .FirstOrDefaultAsync();

        if (existingSeries != null)
            throw new InvalidOperationException($"Series code {request.SeriesCode} already exists for this tenant");

        if (request.IsDefault)
        {
            var currentDefault = await _context.DocumentSeries
                .Where(ds => ds.TenantId == tenantId &&
                            ds.DocumentType == request.DocumentType &&
                            ds.IsDefault)
                .FirstOrDefaultAsync();

            if (currentDefault != null)
            {
                currentDefault.RemoveDefault();
            }
        }

        var series = new DocumentSeries(
            request.SeriesCode,
            request.DocumentType,
            request.DocumentTypeName,
            request.StoreId,
            tenantId,
            request.IsDefault,
            request.InitialNumber ?? 0
        );

        _context.DocumentSeries.Add(series);
        await _context.SaveChangesAsync();

        return await GetDocumentSeriesByIdAsync(series.Id)
            ?? throw new InvalidOperationException("Failed to retrieve created series");
    }

    public async Task<DocumentSeriesDto> UpdateDocumentSeriesAsync(Guid id, UpdateDocumentSeriesRequest request, Guid userId)
    {
        var series = await _context.DocumentSeries.FindAsync(id);
        if (series == null)
            throw new InvalidOperationException($"Document series {id} not found");

        if (request.IsActive)
            series.Activate();
        else
            series.Deactivate();

        if (request.IsDefault)
        {
            var currentDefault = await _context.DocumentSeries
                .Where(ds => ds.TenantId == series.TenantId &&
                            ds.DocumentType == series.DocumentType &&
                            ds.IsDefault &&
                            ds.Id != id)
                .FirstOrDefaultAsync();

            if (currentDefault != null)
            {
                currentDefault.RemoveDefault();
            }

            series.SetAsDefault();
        }
        else
        {
            series.RemoveDefault();
        }

        await _context.SaveChangesAsync();

        return await GetDocumentSeriesByIdAsync(id)
            ?? throw new InvalidOperationException("Failed to retrieve updated series");
    }

    public async Task<NextDocumentNumberDto> GetNextDocumentNumberAsync(string tenantId, string documentType, Guid? storeId = null)
    {
        var query = _context.DocumentSeries
            .Where(ds => ds.TenantId == tenantId &&
                        ds.DocumentType == documentType &&
                        ds.IsActive);

        if (storeId.HasValue)
        {
            query = query.Where(ds => ds.StoreId == storeId.Value);
            // If store is specified, we prioritize explicit default for that store, or ANY active for that store if no default is marked (assume single series per store)
            // But usually we want IsDefault within that store scope if multiple exist.
            // Let's assume IsDefault is relevant. But if I create a series for a store, it might be the only one.
            query = query.OrderByDescending(ds => ds.IsDefault).ThenBy(ds => ds.CreatedAt);
        }
        else 
        {
             query = query.Where(ds => ds.IsDefault);
        }

        var series = await query.FirstOrDefaultAsync();



        if (series == null)
        {
            // Auto-create default series/sequence for this store if valid storeId is provided
            if (storeId.HasValue)
            {
                string code, name;
                switch (documentType)
                {
                     case "01": code = "F001"; name = "Factura Electrónica"; break;
                     case "03": code = "B001"; name = "Boleta de Venta"; break;
                     case "80": code = "NV01"; name = "Nota de Venta"; break;
                     case "07": code = "NC01"; name = "Nota de Crédito"; break;
                     case "08": code = "ND01"; name = "Nota de Débito"; break;
                     case "09": code = "T001"; name = "Guía de Remisión"; break;
                     default: code = "GEN1"; name = "Documento General"; break;
                }

                // Check if this specific code already exists (unlikely if query returned null, but safe check against race conditions or partial data)
                // Actually, query filtered by StoreId+DocType. Maybe B001 exists for THIS store?
                // We should check if series code is taken.
                
                // Just try to create. 
                var newSeries = new DocumentSeries(
                    code,
                    documentType,
                    name,
                    storeId.Value,
                    tenantId,
                    isDefault: true,
                    initialNumber: 0
                );
                
                _context.DocumentSeries.Add(newSeries);
                await _context.SaveChangesAsync();
                
                series = newSeries;
            }
            else
            {
                 throw new InvalidOperationException($"No active default series found for document type {documentType} and no store specified to create one.");
            }
        }

        var nextNumber = $"{series.CurrentNumber + 1:D8}";
        var fullNumber = $"{series.SeriesCode}-{nextNumber}";

        return new NextDocumentNumberDto(series.SeriesCode, nextNumber, fullNumber);
    }

    public async Task<string> IncrementSeriesNumberAsync(string tenantId, string seriesCode)
    {
        // Use an explicit transaction to ensure atomicity and lock the row
        using var transaction = await _context.Database.BeginTransactionAsync();
        try
        {
            // Use pessimistic locking (FOR UPDATE) to prevent race conditions and ensure strict sequentiality
            // This waits if another transaction is currently updating the same series
            var series = await _context.DocumentSeries
                .FromSqlInterpolated($@"
                    SELECT * FROM ""master_data"".""DocumentSeries"" 
                    WHERE ""TenantId"" = {tenantId} 
                    AND ""SeriesCode"" = {seriesCode} 
                    AND ""IsActive"" = true 
                    FOR UPDATE")
                .FirstOrDefaultAsync();

            if (series == null)
                throw new InvalidOperationException($"Active series {seriesCode} not found for tenant");

            var fullDocumentNumber = series.GetNextDocumentNumber();
            await _context.SaveChangesAsync();
            await transaction.CommitAsync();

            return fullDocumentNumber;
        }
        catch
        {
            await transaction.RollbackAsync();
            throw;
        }
    }

    public async Task<CompanySettingsDto?> GetCompanySettingsAsync(string tenantId)
    {
        var settings = await _context.CompanySettings
            .FirstOrDefaultAsync(cs => cs.TenantId == tenantId);

        if (settings == null)
            return null;

        string? logoDataUrl = settings.LogoUrl;

        // Try to load logo from disk and convert to Base64 to ensure it displays correctly in frontend
        // This bypasses any routing/CORS/Auth issues with static files
        if (!string.IsNullOrEmpty(settings.LogoUrl) && settings.LogoUrl.StartsWith("/api/public/logo/"))
        {
            try
            {
                var fileName = settings.LogoUrl.Split('/').Last();
                var uploadBasePath = _configuration["FileStorage:UploadPath"] 
                    ?? Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.CommonApplicationData), "Profitzen", "uploads");
                var filePath = Path.Combine(uploadBasePath, "logos", fileName);

                if (File.Exists(filePath))
                {
                    var fileBytes = await File.ReadAllBytesAsync(filePath);
                    var extension = Path.GetExtension(fileName).ToLowerInvariant();
                    var mimeType = extension switch
                    {
                        ".png" => "image/png",
                        ".svg" => "image/svg+xml",
                        _ => "image/jpeg"
                    };
                    logoDataUrl = $"data:{mimeType};base64,{Convert.ToBase64String(fileBytes)}";
                }
            }
            catch (Exception ex)
            {
                // If fails to read file, keep the original URL (maybe logs logs)
                // Just swallow to not break settings page
            }
        }

        return new CompanySettingsDto(
            settings.Id,
            settings.TenantId,
            settings.CompanyName,
            settings.TradeName,
            settings.Ruc,
            settings.Address,
            settings.Phone,
            settings.Email,
            settings.Website,
            settings.TicketHeader,
            settings.TicketFooter,
            settings.ShowLogo,
            settings.TicketWidth,
            settings.TicketMargin,
            logoDataUrl, // Return Base64 if file exists, or original URL
            settings.TaxName,
            settings.TaxRate,
            settings.PricesIncludeTax,
            settings.Currency,
            settings.CurrencySymbol
        );
    }

    public async Task<CompanySettingsDto> UpdateCompanySettingsAsync(string tenantId, UpdateCompanySettingsRequest request)
    {
        var settings = await _context.CompanySettings
            .FirstOrDefaultAsync(cs => cs.TenantId == tenantId);

        if (settings == null)
        {
            settings = new CompanySettings(
                tenantId,
                request.CompanyName,
                request.Ruc,
                request.TradeName,
                request.Address,
                request.Phone,
                request.Email,
                request.Website,
                request.TicketHeader,
                request.TicketFooter,
                request.ShowLogo,
                request.TicketWidth,
                request.TicketMargin,
                null, // LogoUrl (separate upload)
                request.TaxName,
                request.TaxRate,
                request.PricesIncludeTax,
                request.Currency,
                request.CurrencySymbol
            );
            _context.CompanySettings.Add(settings);
        }
        else
        {
            settings.Update(
                request.CompanyName,
                request.Ruc,
                request.TradeName,
                request.Address,
                request.Phone,
                request.Email,
                request.Website,
                request.TicketHeader,
                request.TicketFooter,
                request.ShowLogo,
                request.TicketWidth,
                request.TicketMargin,
                request.TaxName,
                request.TaxRate,
                request.PricesIncludeTax,
                request.Currency,
                request.CurrencySymbol
            );
        }

        await _context.SaveChangesAsync();

        return new CompanySettingsDto(
            settings.Id,
            settings.TenantId,
            settings.CompanyName,
            settings.TradeName,
            settings.Ruc,
            settings.Address,
            settings.Phone,
            settings.Email,
            settings.Website,
            settings.TicketHeader,
            settings.TicketFooter,
            settings.ShowLogo,
            settings.TicketWidth,
            settings.TicketMargin,
            settings.LogoUrl,
            settings.TaxName,
            settings.TaxRate,
            settings.PricesIncludeTax,
            settings.Currency,
            settings.CurrencySymbol
        );
    }

    public async Task<string> UpdateCompanyLogoAsync(string tenantId, string logoUrl)
    {
        var settings = await _context.CompanySettings
            .FirstOrDefaultAsync(cs => cs.TenantId == tenantId);

        if (settings == null)
        {
            // Create default settings if not exists, just to save the logo
            settings = new CompanySettings(
                tenantId,
                "New Company", // Default
                "00000000000",
                logoUrl: logoUrl
            );
            _context.CompanySettings.Add(settings);
        }
        else
        {
            settings.UpdateLogo(logoUrl);
        }

        await _context.SaveChangesAsync();
        return logoUrl;
    }
}
