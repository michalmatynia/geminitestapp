import { type EcomLocale } from '@/lib/locales';

export function formatAdminOrderDate(value: string, locale: EcomLocale): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.length > 0 ? value : '-';
  return date.toLocaleDateString(locale === 'pl' ? 'pl-PL' : 'en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function formatAdminEventDate(value: string | undefined, locale: EcomLocale): string {
  if (value === undefined || value.length === 0) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(locale === 'pl' ? 'pl-PL' : 'en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
