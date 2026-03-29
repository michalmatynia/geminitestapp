import 'server-only';

import { createHash } from 'node:crypto';

import type {
  KangurLesson,
  KangurLessonDocumentStore,
} from '@kangur/contracts';
import type {
  KangurLessonDocument,
  KangurLessonRootBlock,
} from '@/shared/contracts/kangur-lesson-document-contract';
import type { KangurLessonSection } from '@/shared/contracts/kangur-lesson-sections';
import type { KangurLessonTemplate } from '@/shared/contracts/kangur-lesson-templates';
import { createStarterKangurLessonDocument } from '@/features/kangur/lesson-documents';
import { normalizeKangurLessonDocument } from '@/features/kangur/lesson-documents/normalization';
import { createDefaultKangurSections } from '@/features/kangur/lessons/lesson-section-defaults';
import { createDefaultKangurLessonTemplates } from '@/features/kangur/lessons/lesson-template-defaults';
import { createDefaultKangurLessons } from '@/features/kangur/settings';

export const KANGUR_LESSON_DOCUMENT_SYNC_LOCALES = ['pl'] as const;

export type KangurLessonContentExactDiff = {
  actualCount: number;
  changedIds: string[];
  extraIds: string[];
  expectedCount: number;
  matches: boolean;
  missingIds: string[];
};

export type KangurLocalLessonContentSnapshot = {
  lessonContentRevision: string;
  lessonDocumentsByLocale: Record<string, KangurLessonDocumentStore>;
  lessonTemplatesByLocale: Record<string, KangurLessonTemplate[]>;
  lessons: KangurLesson[];
  sections: KangurLessonSection[];
};

const stableCompare = (left: string, right: string): number => left.localeCompare(right);

const sortObjectKeys = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map((entry) => sortObjectKeys(entry));
  }

  if (!value || typeof value !== 'object') {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => stableCompare(left, right))
      .map(([key, entry]) => [key, sortObjectKeys(entry)])
  );
};

const stableStringify = (value: unknown): string => JSON.stringify(sortObjectKeys(value));

const canonicalizeKangurLessonRootBlockForComparison = (
  block: KangurLessonRootBlock
): Record<string, unknown> => {
  switch (block.type) {
    case 'activity':
      return {
        type: block.type,
        activityId: block.activityId,
        title: block.title,
        description: block.description,
        ttsDescription: block.ttsDescription,
      };
    case 'callout':
      return {
        type: block.type,
        variant: block.variant,
        title: block.title,
        html: block.html,
        ttsText: block.ttsText,
      };
    case 'grid':
      return {
        type: block.type,
        columns: block.columns,
        gap: block.gap,
        rowHeight: block.rowHeight,
        denseFill: block.denseFill,
        stackOnMobile: block.stackOnMobile,
        items: block.items.map((item) => ({
          colSpan: item.colSpan,
          rowSpan: item.rowSpan,
          columnStart: item.columnStart,
          rowStart: item.rowStart,
          block: canonicalizeKangurLessonRootBlockForComparison(item.block),
        })),
      };
    case 'image':
      return {
        type: block.type,
        title: block.title,
        altText: block.altText,
        caption: block.caption,
        ttsDescription: block.ttsDescription,
        src: block.src,
        align: block.align,
        fit: block.fit,
        maxWidth: block.maxWidth,
      };
    case 'quiz': {
      const correctChoiceIndex = block.choices.findIndex(
        (choice) => choice.id === block.correctChoiceId
      );
      return {
        type: block.type,
        question: block.question,
        choices: block.choices.map((choice) => choice.text),
        correctChoiceIndex: correctChoiceIndex >= 0 ? correctChoiceIndex : null,
        explanation: block.explanation ?? null,
        ttsText: block.ttsText,
      };
    }
    case 'svg':
      return {
        type: block.type,
        title: block.title,
        ttsDescription: block.ttsDescription,
        markup: block.markup,
        viewBox: block.viewBox,
        align: block.align,
        fit: block.fit,
        maxWidth: block.maxWidth,
      };
    case 'text':
    default:
      return {
        type: 'text',
        html: block.html,
        ttsText: block.ttsText,
        align: block.align,
      };
  }
};

const canonicalizeKangurLessonDocumentForComparison = (
  document: KangurLessonDocument
): Record<string, unknown> => ({
  version: document.version,
  narration: {
    voice: document.narration.voice,
    locale: document.narration.locale,
  },
  pages: document.pages.map((page) => ({
    sectionKey: page.sectionKey,
    sectionTitle: page.sectionTitle,
    sectionDescription: page.sectionDescription,
    title: page.title,
    description: page.description,
    blocks: page.blocks.map((block) => canonicalizeKangurLessonRootBlockForComparison(block)),
  })),
});

export const serializeKangurLessonDocumentForComparison = (
  document: KangurLessonDocument
): string => stableStringify(canonicalizeKangurLessonDocumentForComparison(document));

export const normalizeKangurLessonForSnapshot = (lesson: KangurLesson): KangurLesson => ({
  id: lesson.id,
  componentId: lesson.componentId,
  contentMode: lesson.contentMode,
  subject: lesson.subject,
  ageGroup: lesson.ageGroup,
  title: lesson.title,
  description: lesson.description,
  emoji: lesson.emoji,
  color: lesson.color,
  activeBg: lesson.activeBg,
  sortOrder: lesson.sortOrder,
  enabled: lesson.enabled,
  ...(lesson.sectionId ? { sectionId: lesson.sectionId } : {}),
  ...(lesson.subsectionId ? { subsectionId: lesson.subsectionId } : {}),
});

export const normalizeKangurLessonSectionForSnapshot = (
  section: KangurLessonSection
): KangurLessonSection => ({
  id: section.id,
  subject: section.subject,
  ageGroup: section.ageGroup,
  label: section.label,
  shortLabel: section.shortLabel,
  typeLabel: section.typeLabel,
  emoji: section.emoji,
  sortOrder: section.sortOrder,
  enabled: section.enabled,
  componentIds: [...section.componentIds],
  subsections: [...section.subsections]
    .map((subsection) => ({
      id: subsection.id,
      label: subsection.label,
      typeLabel: subsection.typeLabel,
      emoji: subsection.emoji,
      enabled: subsection.enabled,
      componentIds: [...subsection.componentIds],
    }))
    .sort((left, right) => stableCompare(left.id, right.id)),
});

export const normalizeKangurLessonTemplateForSnapshot = (
  template: KangurLessonTemplate
): KangurLessonTemplate => ({
  componentId: template.componentId,
  subject: template.subject,
  ageGroup: template.ageGroup,
  label: template.label,
  title: template.title,
  description: template.description,
  emoji: template.emoji,
  color: template.color,
  activeBg: template.activeBg,
  sortOrder: template.sortOrder,
  ...(template.componentContent ? { componentContent: sortObjectKeys(template.componentContent) as NonNullable<KangurLessonTemplate['componentContent']> } : {}),
});

export const normalizeKangurLessonDocumentStoreForSnapshot = (
  store: KangurLessonDocumentStore
): KangurLessonDocumentStore =>
  Object.fromEntries(
    Object.entries(store)
      .sort(([left], [right]) => stableCompare(left, right))
      .map(([lessonId, document]) => [
        lessonId,
        normalizeKangurLessonDocument(document),
      ])
  );

const buildLocalLessonDocumentStore = async (
  lessons: readonly KangurLesson[]
): Promise<KangurLessonDocumentStore> => {
  const { importLegacyKangurLessonDocument } = await import('@/features/kangur/legacy-lesson-imports');

  const entries = lessons.map((lesson) => {
    const imported = importLegacyKangurLessonDocument(lesson.componentId)?.document;
    return [
      lesson.id,
      imported ?? createStarterKangurLessonDocument(lesson.componentId),
    ] as const;
  });

  return normalizeKangurLessonDocumentStoreForSnapshot(Object.fromEntries(entries));
};

export const buildKangurLessonContentRevision = (input: {
  lessonDocumentsByLocale: Record<string, KangurLessonDocumentStore>;
  lessonTemplatesByLocale: Record<string, KangurLessonTemplate[]>;
  lessons: KangurLesson[];
  sections: KangurLessonSection[];
}): string =>
  createHash('sha256')
    .update(
      stableStringify({
        lessonDocumentsByLocale: Object.fromEntries(
          Object.entries(input.lessonDocumentsByLocale).map(([locale, store]) => [
            locale,
            Object.fromEntries(
              Object.entries(store).map(([lessonId, document]) => [
                lessonId,
                canonicalizeKangurLessonDocumentForComparison(document),
              ])
            ),
          ])
        ),
        lessonTemplatesByLocale: input.lessonTemplatesByLocale,
        lessons: input.lessons,
        sections: input.sections,
      })
    )
    .digest('hex')
    .slice(0, 16);

export const buildLocalKangurLessonContentSnapshot = async (
  locales: readonly string[]
): Promise<KangurLocalLessonContentSnapshot> => {
  const lessons = createDefaultKangurLessons()
    .map(normalizeKangurLessonForSnapshot)
    .sort((left, right) =>
      left.sortOrder === right.sortOrder
        ? stableCompare(left.id, right.id)
        : left.sortOrder - right.sortOrder
    );
  const sections = createDefaultKangurSections()
    .map(normalizeKangurLessonSectionForSnapshot)
    .sort((left, right) =>
      left.sortOrder === right.sortOrder
        ? stableCompare(left.id, right.id)
        : left.sortOrder - right.sortOrder
    );
  const lessonTemplatesByLocale = Object.fromEntries(
    [...new Set(locales)].map((locale) => [
      locale,
      createDefaultKangurLessonTemplates(locale)
        .map(normalizeKangurLessonTemplateForSnapshot)
        .sort((left, right) =>
          left.sortOrder === right.sortOrder
            ? stableCompare(left.componentId, right.componentId)
            : left.sortOrder - right.sortOrder
        ),
    ])
  );
  const lessonDocumentsByLocale = Object.fromEntries(
    await Promise.all(
      KANGUR_LESSON_DOCUMENT_SYNC_LOCALES.map(async (locale) => [
        locale,
        await buildLocalLessonDocumentStore(lessons),
      ])
    )
  );
  const lessonContentRevision = buildKangurLessonContentRevision({
    lessons,
    sections,
    lessonTemplatesByLocale,
    lessonDocumentsByLocale,
  });

  return {
    lessonContentRevision,
    lessonDocumentsByLocale,
    lessonTemplatesByLocale,
    lessons,
    sections,
  };
};

export const buildKangurLessonContentExactDiff = <T>(
  expected: Record<string, T>,
  actual: Record<string, T>,
  serialize: (value: T) => string
): KangurLessonContentExactDiff => {
  const expectedIds = new Set(Object.keys(expected));
  const actualIds = new Set(Object.keys(actual));
  const missingIds = [...expectedIds].filter((id) => !actualIds.has(id)).sort(stableCompare);
  const extraIds = [...actualIds].filter((id) => !expectedIds.has(id)).sort(stableCompare);
  const changedIds = [...expectedIds]
    .filter((id) => actualIds.has(id) && serialize(expected[id] as T) !== serialize(actual[id] as T))
    .sort(stableCompare);

  return {
    actualCount: actualIds.size,
    changedIds,
    extraIds,
    expectedCount: expectedIds.size,
    matches: missingIds.length === 0 && extraIds.length === 0 && changedIds.length === 0,
    missingIds,
  };
};
