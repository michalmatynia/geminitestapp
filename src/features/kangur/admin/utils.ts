import type { KangurLessonInlineBlock } from '@/features/kangur/shared/contracts/kangur';
import type {
  KangurLesson,
  KangurLessonComponentId,
  KangurLessonDocumentStore,
  KangurLessonPage,
} from '@/features/kangur/shared/contracts/kangur';
import type { KangurLessonTemplate } from '@/shared/contracts/kangur-lesson-templates';

import {
  serializeKangurLessonTemplateComponentContent,
  supportsKangurLessonTemplateComponentContent,
} from '../lessons/lesson-template-component-content';
import { hasKangurLessonDocumentContent } from '../lesson-documents';
import { createKangurLessonDraft } from '../settings';
import { TREE_MODE_STORAGE_KEY } from './constants';

import type { LessonFormData, LessonTreeMode } from './types';
import { withKangurClientErrorSync } from '@/features/kangur/observability/client';

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

type LessonRecipeFamily = 'time' | 'arithmetic' | 'geometry' | 'logic';

const LESSON_RECIPE_FAMILY_BY_COMPONENT_ID = new Map<KangurLessonComponentId, LessonRecipeFamily>([
  ['clock', 'time'],
  ['calendar', 'time'],
  ['adding', 'arithmetic'],
  ['subtracting', 'arithmetic'],
  ['multiplication', 'arithmetic'],
  ['division', 'arithmetic'],
  ['geometry_basics', 'geometry'],
  ['geometry_shapes', 'geometry'],
  ['geometry_symmetry', 'geometry'],
  ['geometry_perimeter', 'geometry'],
]);

export const getLessonRecipeFamily = (
  componentId: KangurLessonComponentId | null | undefined
): LessonRecipeFamily => (componentId ? LESSON_RECIPE_FAMILY_BY_COMPONENT_ID.get(componentId) : null) ?? 'logic';

export const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

export const toLessonFormData = (lesson: KangurLesson): LessonFormData => ({
  componentId: lesson.componentId,
  contentMode: lesson.contentMode,
  subject: lesson.subject,
  ageGroup: lesson.ageGroup,
  title: lesson.title,
  description: lesson.description,
  emoji: lesson.emoji,
  color: lesson.color,
  activeBg: lesson.activeBg,
  enabled: lesson.enabled,
});

export const toLocalizedLessonFormData = (
  lesson: KangurLesson,
  template?: KangurLessonTemplate | null
): LessonFormData => ({
  ...toLessonFormData(lesson),
  subject: template?.subject ?? lesson.subject,
  ageGroup: template?.ageGroup ?? lesson.ageGroup,
  title: template?.title ?? lesson.title,
  description: template?.description ?? lesson.description,
  emoji: template?.emoji ?? lesson.emoji,
  color: template?.color ?? lesson.color,
  activeBg: template?.activeBg ?? lesson.activeBg,
});

export const applyLessonTemplateToFormData = (
  formData: LessonFormData,
  template?: KangurLessonTemplate | null
): LessonFormData => {
  if (!template) {
    return formData;
  }

  return {
    ...formData,
    componentId: template.componentId,
    subject: template.subject ?? formData.subject,
    ageGroup: template.ageGroup ?? formData.ageGroup,
    title: template.title,
    description: template.description,
    emoji: template.emoji,
    color: template.color,
    activeBg: template.activeBg,
  };
};

export const resolveLessonComponentContentJson = (
  componentId: KangurLessonComponentId,
  template?: KangurLessonTemplate | null,
): string => serializeKangurLessonTemplateComponentContent(componentId, template?.componentContent);

export const supportsLessonComponentContentAuthoring = (
  componentId: KangurLessonComponentId | null | undefined,
): boolean => supportsKangurLessonTemplateComponentContent(componentId);

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
  return withKangurClientErrorSync(
    {
      source: 'kangur.admin.utils',
      action: 'read-tree-mode',
      description: 'Reads the persisted lesson tree mode from local storage.',
    },
    () => {
      const storedValue = window.localStorage.getItem(TREE_MODE_STORAGE_KEY);
      if (storedValue === 'catalog' || storedValue === 'sections') return storedValue;
      return 'ordered';
    },
    { fallback: 'ordered' }
  );
};

export const countLessonsRequiringLegacyImport = (
  lessons: readonly KangurLesson[],
  lessonDocuments: KangurLessonDocumentStore
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
