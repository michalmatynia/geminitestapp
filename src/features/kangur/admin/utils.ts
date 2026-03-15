import type { KangurLessonInlineBlock } from '@/shared/contracts/kangur';
import type {
  KangurLesson,
  KangurLessonComponentId,
  KangurLessonPage,
} from '@/shared/contracts/kangur';

import {
  hasKangurLessonDocumentContent,
  parseKangurLessonDocumentStore,
} from '../lesson-documents';
import { createKangurLessonDraft } from '../settings';
import { TREE_MODE_STORAGE_KEY } from './constants';

import type { LessonFormData, LessonTreeMode } from './types';

export const resolvePageSectionOptions = (
  page: KangurLessonPage | null
): {
  sectionKey?: string;
  sectionTitle?: string;
  sectionDescription?: string;
} => ({
  sectionKey: page?.sectionKey?.trim() || '',
  sectionTitle: page?.sectionTitle?.trim() || '',
  sectionDescription: page?.sectionDescription?.trim() || '',
});

export const getLessonRecipeFamily = (
  componentId: KangurLessonComponentId | null | undefined
): 'time' | 'arithmetic' | 'geometry' | 'logic' => {
  if (componentId === 'clock' || componentId === 'calendar') {
    return 'time';
  }
  if (
    componentId === 'adding' ||
    componentId === 'subtracting' ||
    componentId === 'multiplication' ||
    componentId === 'division'
  ) {
    return 'arithmetic';
  }
  if (
    componentId === 'geometry_basics' ||
    componentId === 'geometry_shapes' ||
    componentId === 'geometry_symmetry' ||
    componentId === 'geometry_perimeter'
  ) {
    return 'geometry';
  }
  return 'logic';
};

export const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

export const toLessonFormData = (lesson: KangurLesson): LessonFormData => ({
  componentId: lesson.componentId,
  contentMode: lesson.contentMode,
  title: lesson.title,
  description: lesson.description,
  emoji: lesson.emoji,
  color: lesson.color,
  activeBg: lesson.activeBg,
  enabled: lesson.enabled,
});

export const createInitialLessonFormData = (): LessonFormData => createKangurLessonDraft('clock');

export const upsertLesson = (lessons: KangurLesson[], nextLesson: KangurLesson): KangurLesson[] => {
  const existingIndex = lessons.findIndex((lesson) => lesson.id === nextLesson.id);
  if (existingIndex === -1) {
    return [...lessons, nextLesson];
  }

  return lessons.map((lesson) => (lesson.id === nextLesson.id ? nextLesson : lesson));
};

export const readPersistedTreeMode = (): LessonTreeMode => {
  if (typeof window === 'undefined') return 'ordered';
  try {
    const storedValue = window.localStorage.getItem(TREE_MODE_STORAGE_KEY);
    return storedValue === 'catalog' ? 'catalog' : 'ordered';
  } catch {
    return 'ordered';
  }
};

export const countLessonsRequiringLegacyImport = (
  lessons: readonly KangurLesson[],
  lessonDocuments: ReturnType<typeof parseKangurLessonDocumentStore>
): number =>
  lessons.filter(
    (lesson) =>
      lesson.contentMode !== 'document' &&
      !hasKangurLessonDocumentContent(lessonDocuments[lesson.id])
  ).length;

export const moveItem = <T>(items: readonly T[], fromIndex: number, toIndex: number): T[] => {
  if (toIndex < 0 || toIndex >= items.length || fromIndex === toIndex) {
    return [...items];
  }

  const nextItems = [...items];
  const [movedItem] = nextItems.splice(fromIndex, 1);
  if (movedItem === undefined) {
    return [...items];
  }
  nextItems.splice(toIndex, 0, movedItem);
  return nextItems;
};

export const parseNumberInput = (value: string, fallback: number): number => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const readLessonGroupCount = (metadata: unknown): number | null => {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return null;
  const groupValue = (metadata as Record<string, unknown>)['kangurLessonGroup'];
  if (!groupValue || typeof groupValue !== 'object' || Array.isArray(groupValue)) return null;
  const rawCount = (groupValue as Record<string, unknown>)['lessonCount'];
  if (typeof rawCount !== 'number' || !Number.isFinite(rawCount)) return null;
  return rawCount;
};

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

export const parseOptionalNumberInput = (
  value: string,
  min: number,
  max: number
): number | null => {
  if (!value.trim()) {
    return null;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) {
    return null;
  }

  return clamp(parsed, min, max);
};

export const insertAfterIndex = <T>(items: readonly T[], index: number, value: T): T[] => {
  const nextItems = [...items];
  nextItems.splice(index + 1, 0, value);
  return nextItems;
};

export const resolveInlineAccent = (
  type: KangurLessonInlineBlock['type']
): 'text' | 'svg' | 'image' => {
  if (type === 'svg') return 'svg';
  if (type === 'image') return 'image';
  return 'text';
};

export const resolveInlineHeading = (block: KangurLessonInlineBlock): string => {
  if (block.type === 'svg') return 'SVG block';
  if (block.type === 'image') return 'Image block';
  return 'Text block';
};

// ── SVG sanitization ──────────────────────────────────────────────────────────

const DANGEROUS_SVG_TAGS = /<(script|foreignObject)\b[^>]*>[\s\S]*?<\/\1>/gi;
const DANGEROUS_SVG_ATTRS = /\bon\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi;
const DANGEROUS_SVG_HREF = /\b(?:href|xlink:href)\s*=\s*"(?:javascript:|data:)[^"]*"/gi;

/**
 * Strip dangerous constructs from admin-authored SVG before persisting.
 * Removes <script>, <foreignObject>, on* event attrs, and javascript:/data: hrefs.
 * Admin-only use; not a full sanitizer for untrusted input.
 */
export const sanitizeSvgMarkup = (raw: string): string =>
  raw
    .replace(DANGEROUS_SVG_TAGS, '')
    .replace(DANGEROUS_SVG_ATTRS, '')
    .replace(DANGEROUS_SVG_HREF, '');
