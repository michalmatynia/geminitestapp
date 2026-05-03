const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;

export function formatAssetDate(date: Date | string): string {
  const resolvedDate = date instanceof Date ? date : new Date(date);

  if (Number.isNaN(resolvedDate.getTime())) {
    return typeof date === 'string' ? date : '';
  }

  const month = MONTH_LABELS[resolvedDate.getUTCMonth()] ?? '';
  const day = resolvedDate.getUTCDate();
  const year = resolvedDate.getUTCFullYear();

  return `${month} ${day}, ${year}`;
}
