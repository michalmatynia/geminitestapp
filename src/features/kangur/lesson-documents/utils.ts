import {
  KANGUR_TTS_DEFAULT_LOCALE,
  KANGUR_TTS_DEFAULT_VOICE,
  type KangurLessonDocumentNarration,
} from '@/shared/contracts/kangur';

export const DEFAULT_SVG_VIEWBOX = '0 0 100 100';
export const DEFAULT_IMAGE_SRC = '';

export const KANGUR_LESSON_GRID_TEMPLATE_IDS = [
  'two-column',
  'three-column',
  'hero-left',
  'hero-right',
  'image-gallery',
  'image-mosaic',
  'svg-duo',
  'svg-trio',
  'svg-gallery',
  'svg-mosaic',
] as const;
export type KangurLessonGridTemplateId = (typeof KANGUR_LESSON_GRID_TEMPLATE_IDS)[number];

export const KANGUR_LESSON_DOCUMENT_TEMPLATE_IDS = [
  'article',
  'text-with-figure',
  'image-gallery-page',
  'svg-gallery-page',
  'svg-mosaic-page',
] as const;
export type KangurLessonDocumentTemplateId =
  (typeof KANGUR_LESSON_DOCUMENT_TEMPLATE_IDS)[number];

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

export const normalizeText = (value: unknown, fallback: string, maxLength: number): string => {
  if (typeof value !== 'string') return fallback;
  const trimmed = value.trim();
  if (!trimmed) return fallback;
  return trimmed.slice(0, maxLength);
};

export const stripHtmlToText = (value: string): string =>
  value
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

export const escapeHtmlText = (value: string): string =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll('\'', '&#39;');

export const normalizeInteger = (value: unknown, fallback: number): number => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.trunc(value);
};

export const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

export const clampGridColumnStart = (
  columnStart: number | null,
  colSpan: number,
  columns: number
): number | null => {
  if (columnStart === null) {
    return null;
  }

  const maxColumnStart = Math.max(1, columns - colSpan + 1);
  return clamp(columnStart, 1, maxColumnStart);
};

export const createRandomId = (prefix: string): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
};

export const normalizeNarrationVoice = (value: unknown): NonNullable<KangurLessonDocumentNarration>['voice'] => {
  if (
    value === 'alloy' ||
    value === 'ash' ||
    value === 'ballad' ||
    value === 'coral' ||
    value === 'echo' ||
    value === 'sage' ||
    value === 'shimmer' ||
    value === 'verse' ||
    value === 'marin' ||
    value === 'cedar'
  ) {
    return value;
  }

  return KANGUR_TTS_DEFAULT_VOICE;
};

export const normalizeDocumentNarration = (value: unknown): NonNullable<KangurLessonDocumentNarration> => {
  const raw = isRecord(value) ? value : {};

  return {
    voice: normalizeNarrationVoice(raw['voice']),
    locale: normalizeText(raw['locale'], KANGUR_TTS_DEFAULT_LOCALE, 16),
  };
};
