import type { KangurLessonComponentId } from '@/features/kangur/shared/contracts/kangur';

export type InteractionFilter = 'all' | 'opened_task' | 'lesson_panel' | 'session';

export type InteractionView = {
  description: string;
  durationSeconds: number | null;
  id: string;
  kind: InteractionFilter | 'other';
  label: string;
  timestamp: string | null;
  timestampMs: number | null;
};

export const formatDuration = ({
  seconds,
  translate,
}: {
  seconds: number;
  translate: (key: string, values?: Record<string, string | number>) => string;
}): string => {
  const normalized = Math.max(0, Math.round(seconds));
  const minutes = Math.floor(normalized / 60);
  const remainingSeconds = normalized % 60;
  if (minutes === 0) {
    return translate('widgets.monitoring.duration.seconds', {
      seconds: remainingSeconds,
    });
  }
  return translate('widgets.monitoring.duration.minutesSeconds', {
    minutes,
    seconds: `${remainingSeconds}`.padStart(2, '0'),
  });
};

export const formatProgressTimestamp = ({
  value,
  locale,
  fallback,
}: {
  value: string | null | undefined;
  locale: string;
  fallback: string;
}): string => {
  if (!value) {
    return fallback;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return fallback;
  }
  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
};

export const normalizePanelLabel = (value: string | null | undefined, fallback: string): string => {
  const trimmed = value?.trim();
  if (trimmed) {
    return trimmed;
  }
  return fallback.replace(/_/g, ' ').trim();
};

export const parsePanelIndex = (panelId: string): number => {
  const match = panelId.match(/\d+/u);
  if (!match) {
    return Number.MAX_SAFE_INTEGER;
  }
  const parsed = Number.parseInt(match[0], 10);
  return Number.isNaN(parsed) ? Number.MAX_SAFE_INTEGER : parsed;
};

export const parseTimestamp = (value: string | null | undefined): number => {
  if (!value) {
    return 0;
  }
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
};

export const parseTimestampStrict = (value: string | null | undefined): number | null => {
  if (!value) {
    return null;
  }
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? null : parsed;
};

export const parseDateFilterValue = (value: string): number | null => {
  if (!value) {
    return null;
  }
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed.getTime();
};

export const asRecord = (value: unknown): Record<string, unknown> | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
};

export const readString = (value: unknown): string | null => {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

export const readNumber = (value: unknown): number | null => {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return null;
  }
  return value;
};

export const isLessonComponentId = (
  value: string,
  lessonsMap: Map<KangurLessonComponentId, unknown>
): value is KangurLessonComponentId => lessonsMap.has(value as KangurLessonComponentId);
