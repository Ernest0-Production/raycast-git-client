/**
 * Custom date formatter for Raycast accessories
 *
 * Formats dates based on their age relative to today:
 * - Today: only time (HH:MM)
 * - Older than today but same month: time day month
 * - Previous month: day month
 * - Previous year: month year
 */

/**
 * Formats a Date object to a string based on its age relative to today
 * Order: <time><day><month><year> using toLocaleDateString for components
 * @param date - The date to format
 * @returns Formatted date string
 */
function formatRelativeDate(date: Date): string {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const targetDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

    // Check if it's today
    if (targetDate.getTime() === today.getTime()) {
        // Today: display only time (HH:MM)
        return date.toLocaleTimeString(undefined, {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        });
    }

    // Check if it's same month and year
    if (date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()) {
        // Same month: display time day month
        const time = date.toLocaleTimeString(undefined, {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        });
        const day = date.toLocaleDateString(undefined, { day: 'numeric' });
        const month = date.toLocaleDateString(undefined, { month: 'short' });
        return `${time} ${day} ${month}`;
    }

    // Check if it's same year but different month
    if (date.getFullYear() === now.getFullYear()) {
        // Same year, different month: display day month
        const day = date.toLocaleDateString(undefined, { day: 'numeric' });
        const month = date.toLocaleDateString(undefined, { month: 'short' });
        return `${day} ${month}`;
    }

    // Previous year: display month year
    const month = date.toLocaleDateString(undefined, { month: 'short' });
    const year = date.toLocaleDateString(undefined, { year: 'numeric' });
    return `${month} ${year}`;
}

export { };
/**
 * Extend Date prototype with toRelativeDateString method
 */
declare global {
    interface Date {
        toRelativeDateString(): string;
    }
}

// Add the method to Date prototype
Date.prototype.toRelativeDateString = function (): string {
    return formatRelativeDate(this);
};

