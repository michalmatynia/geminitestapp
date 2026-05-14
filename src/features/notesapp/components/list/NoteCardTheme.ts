import type { ThemeRecord } from '@/shared/contracts/notes';

export const FALLBACK_THEME: Omit<ThemeRecord, 'id' | 'createdAt' | 'updatedAt' | 'name' | 'notebookId'> = {
  description: 'Default dark theme',
  isDefault: true,
  textColor: '#e5e7eb',
  backgroundColor: '#111827',
  markdownHeadingColor: '#ffffff',
  markdownLinkColor: '#60a5fa',
  markdownCodeBackground: '#1f2937',
  markdownCodeText: '#e5e7eb',
  relatedNoteBorderWidth: 1,
  relatedNoteBorderColor: '#374151',
  relatedNoteBackgroundColor: '#1f2937',
  relatedNoteTextColor: '#e5e7eb',
};

export const getReadableTextColor = (hexColor: string): string => {
  const normalized = hexColor.replace('#', '');
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) {
    return '#111827';
  }
  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return luminance > 0.7 ? '#111827' : '#f8fafc';
};
