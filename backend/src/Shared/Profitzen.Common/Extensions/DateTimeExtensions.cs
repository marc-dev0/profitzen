using System;

namespace Profitzen.Common.Extensions;

public static class DateTimeExtensions
{
    /// <summary>
    /// Applies the "Business Date" convention: Sets the time to 12:00 PM UTC
    /// to avoid day shifting when moving between timezones.
    /// </summary>
    public static DateTime ToBusinessDate(this DateTime date)
    {
        return new DateTime(date.Year, date.Month, date.Day, 12, 0, 0, DateTimeKind.Utc);
    }

    /// <summary>
    /// Checks if a date falls within the "Peru Day" in UTC.
    /// Peru (UTC-5): Business day starts at 05:00 UTC and ends at 05:00 UTC next day.
    /// </summary>
    public static bool IsInPeruDay(this DateTime utcDate, DateTime dayUtc)
    {
        // dayUtc should be the UTC date at 05:00 (Peru 00:00)
        var start = dayUtc.Date.AddHours(5);
        var end = start.AddDays(1);
        return utcDate >= start && utcDate < end;
    }
}
