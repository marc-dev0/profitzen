using Microsoft.EntityFrameworkCore;
using Profitzen.Configuration.Application.DTOs;
using Profitzen.Configuration.Infrastructure;
using System.Linq;

namespace Profitzen.Configuration.Application.Services;

public class MasterDataService : IMasterDataService
{
    private readonly ConfigurationDbContext _context;

    public MasterDataService(ConfigurationDbContext context)
    {
        _context = context;
    }

    public async Task<IEnumerable<MasterDataTypeDto>> GetMasterDataTypesAsync()
    {
        return await _context.MasterDataTypes
            .Where(t => t.IsActive)
            .Select(t => new MasterDataTypeDto
            {
                Id = t.Id,
                Code = t.Code,
                Name = t.Name,
                Description = t.Description,
                AllowHierarchy = t.AllowHierarchy,
                IsActive = t.IsActive
            })
            .ToListAsync();
    }

    public async Task<IEnumerable<MasterDataValueDto>> GetMasterDataValuesByTypeAsync(string typeCode, string tenantId, bool includeInactive = false)
    {
        var query = _context.MasterDataValues
            .Include(v => v.Parent)
            .Include(v => v.Children)
            .Where(v => v.TypeCode == typeCode && (v.TenantId == tenantId || v.TenantId == "system"));

        if (!includeInactive)
        {
            query = query.Where(v => v.IsActive);
        }

        var values = await query
            .OrderBy(v => v.DisplayOrder)
            .ThenBy(v => v.Name)
            .ToListAsync();

        return values.Select(v => MapToDto(v));
    }

    public async Task<MasterDataValueDto?> GetMasterDataValueByIdAsync(Guid id)
    {
        var value = await _context.MasterDataValues
            .Include(v => v.Parent)
            .Include(v => v.Children)
            .FirstOrDefaultAsync(v => v.Id == id);

        return value != null ? MapToDto(value) : null;
    }

    public async Task<MasterDataValueDto> CreateMasterDataValueAsync(CreateMasterDataValueRequest request, string tenantId, Guid userId)
    {
        var type = await _context.MasterDataTypes.FirstOrDefaultAsync(t => t.Code == request.TypeCode);
        if (type == null)
            throw new InvalidOperationException($"Master data type '{request.TypeCode}' not found");

        if (request.ParentId.HasValue && !type.AllowHierarchy)
            throw new InvalidOperationException($"Master data type '{request.TypeCode}' does not allow hierarchy");

        string code;
        if (string.IsNullOrWhiteSpace(request.Code))
        {
            code = await GenerateCodeAsync(request.Name, request.TypeCode, tenantId);
        }
        else
        {
            code = request.Code.ToUpper();
            var existing = await _context.MasterDataValues
                .FirstOrDefaultAsync(v => v.TypeCode == request.TypeCode && v.Code == code && v.TenantId == tenantId);

            if (existing != null)
                throw new InvalidOperationException($"Master data value with code '{code}' already exists for type '{request.TypeCode}'");
        }

        var value = new Domain.Entities.MasterDataValue(
            request.TypeCode,
            code,
            request.Name,
            request.Description,
            tenantId,
            request.ParentId,
            request.Metadata,
            request.DisplayOrder
        );

        _context.MasterDataValues.Add(value);
        await _context.SaveChangesAsync();

        return (await GetMasterDataValueByIdAsync(value.Id))!;
    }

    private async Task<string> GenerateCodeAsync(string name, string typeCode, string tenantId)
    {
        var cleanName = new string(name.Where(c => char.IsLetterOrDigit(c) || char.IsWhiteSpace(c)).ToArray());
        var words = cleanName.Split(' ', StringSplitOptions.RemoveEmptyEntries);

        string baseCode;
        if (words.Length >= 2)
        {
            baseCode = string.Concat(words.Take(3).Select(w => w.Length > 0 ? char.ToUpper(w[0]) : ' ')).Replace(" ", "");
        }
        else if (words.Length == 1 && words[0].Length >= 3)
        {
            baseCode = words[0].Substring(0, 3).ToUpper();
        }
        else if (words.Length == 1)
        {
            baseCode = words[0].ToUpper().PadRight(3, 'X');
        }
        else
        {
            baseCode = "XXX";
        }

        if (baseCode.Length > 10)
            baseCode = baseCode.Substring(0, 10);

        var code = baseCode;
        var counter = 1;

        while (await _context.MasterDataValues.AnyAsync(v =>
            v.TypeCode == typeCode && v.Code == code && v.TenantId == tenantId))
        {
            var suffix = counter.ToString();
            var maxBaseLength = 10 - suffix.Length;
            code = baseCode.Substring(0, Math.Min(baseCode.Length, maxBaseLength)) + suffix;
            counter++;
        }

        return code;
    }

    public async Task<MasterDataValueDto> UpdateMasterDataValueAsync(Guid id, UpdateMasterDataValueRequest request, Guid userId)
    {
        var value = await _context.MasterDataValues.FindAsync(id);
        if (value == null)
            throw new InvalidOperationException("Master data value not found");

        value.UpdateDetails(request.Name, request.Description, request.Metadata, request.DisplayOrder);

        if (request.IsActive && !value.IsActive)
        {
            value.Activate();
        }
        else if (!request.IsActive && value.IsActive)
        {
            value.Deactivate();
        }

        await _context.SaveChangesAsync();

        return (await GetMasterDataValueByIdAsync(id))!;
    }

    public async Task<bool> DeleteMasterDataValueAsync(Guid id, Guid userId)
    {
        var value = await _context.MasterDataValues.FindAsync(id);
        if (value == null)
            return false;

        value.Deactivate();
        await _context.SaveChangesAsync();

        return true;
    }

    private MasterDataValueDto MapToDto(Domain.Entities.MasterDataValue value)
    {
        return new MasterDataValueDto
        {
            Id = value.Id,
            TypeCode = value.TypeCode,
            Code = value.Code,
            Name = value.Name,
            Description = value.Description,
            ParentId = value.ParentId,
            ParentName = value.Parent?.Name,
            Metadata = value.Metadata,
            DisplayOrder = value.DisplayOrder,
            IsActive = value.IsActive,
            Children = value.Children.Select(c => MapToDto(c)).ToList()
        };
    }
}
