/**
 * Utility functions for date handling across the application.
 * Ensures consistent handling of local vs UTC dates to avoid "day shifting" issues.
 */

/**
 * Returns the current date in YYYY-MM-DD format based on local time.
 */
export const getLocalTodayString = (): string => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

/**
 * Formats a date string (ISO or YYYY-MM-DD) to DD/MM/YYYY using UTC to avoid timezone shifts.
 */
export const formatDateUTC = (dateString: string): string => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    const day = date.getUTCDate().toString().padStart(2, '0');
    const month = (date.getUTCMonth() + 1).toString().padStart(2, '0');
    const year = date.getUTCFullYear();
    return `${day}/${month}/${year}`;
};

/**
 * Converts a local date string (YYYY-MM-DD) to an ISO string at noon UTC.
 * This is the "Noon Trick" to ensure the date stays on the same day when processed by the backend.
 */
export const toNoonISO = (dateString: string): string => {
    if (!dateString) return new Date().toISOString();
    // Ensure we use the date parts without timezone conversion
    const [year, month, day] = dateString.split('-').map(Number);
    const date = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
    return date.toISOString();
};
