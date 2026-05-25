/**
 * Formats an ISO date string to DD/MM/YYYY format.
 * Returns empty string if input is invalid.
 */
export function formatDate(isoDate: string | undefined | null): string {
  if (!isoDate) return '';
  const date = new Date(isoDate);
  if (isNaN(date.getTime())) return '';
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}
