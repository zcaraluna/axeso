/**
 * Utility functions for handling dates and times in the America/Asuncion timezone.
 */

const TIMEZONE = 'America/Asuncion';

/**
 * Returns the current date in Paraguay in DD/MM/YYYY format.
 */
export function getParaguayDate(): string {
    return new Intl.DateTimeFormat('es-PY', {
        timeZone: TIMEZONE,
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    }).format(new Date());
}

/**
 * Returns the current time in Paraguay in HH:mm format.
 */
export function getParaguayTime(): string {
    return new Intl.DateTimeFormat('es-PY', {
        timeZone: TIMEZONE,
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
    }).format(new Date());
}

/**
 * Returns the current date and time in Paraguay as a Date object.
 * Note: This returns a Date object representing the time in Paraguay, 
 * but because JS Dates are always UTC internally, use this carefully.
 */
export function getParaguayNow(): Date {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: TIMEZONE,
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        second: 'numeric',
        hour12: false,
    });

    const parts = formatter.formatToParts(now);
    const map: Record<string, number> = {};
    parts.forEach(p => {
        if (p.type !== 'literal') map[p.type] = parseInt(p.value);
    });

    return new Date(map.year, map.month - 1, map.day, map.hour, map.minute, map.second);
}

/**
 * Formats a Date object to a string in a specific timezone
 */
export function formatToParaguay(date: Date, options: Intl.DateTimeFormatOptions = {}): string {
    return new Intl.DateTimeFormat('es-PY', {
        timeZone: TIMEZONE,
        ...options
    }).format(date);
}
