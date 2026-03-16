import { renderToStaticMarkup } from 'react-dom/server.browser';

import type {
  KangurLessonActivityId,
  KangurLessonComponentId,
  KangurLessonDocument,
} from '@/features/kangur/shared/contracts/kangur';
import { sanitizeHtml } from '@/features/kangur/shared/utils';

import { getKangurLessonActivityDefinition } from './lesson-activities';
import {
  createKangurLessonActivityBlock,
  createDefaultKangurLessonDocument,
  createKangurLessonPage,
  createKangurLessonTextBlock,
  updateKangurLessonDocumentPages,
  updateKangurLessonDocumentTimestamp,
} from './lesson-documents';
import { KANGUR_LESSON_LIBRARY } from './settings';
import {
  HUB_SECTIONS as ADDING_HUB_SECTIONS,
  SLIDES as ADDING_SLIDES,
} from './ui/components/AddingLesson';
import {
  HUB_SECTIONS as CALENDAR_HUB_SECTIONS,
  SECTION_SLIDES as CALENDAR_SECTION_SLIDES,
} from './ui/components/CalendarLesson';
import { LESSON_SECTIONS as CLOCK_LESSON_SECTIONS } from './ui/components/ClockLesson';
import {
  HUB_SECTIONS as DIVISION_HUB_SECTIONS,
  SLIDES as DIVISION_SLIDES,
} from './ui/components/DivisionLesson';
import {
  HUB_SECTIONS as GEOMETRY_BASICS_HUB_SECTIONS,
  SLIDES as GEOMETRY_BASICS_SLIDES,
} from './ui/components/GeometryBasicsLesson';
import {
  HUB_SECTIONS as GEOMETRY_PERIMETER_HUB_SECTIONS,
  SLIDES as GEOMETRY_PERIMETER_SLIDES,
} from './ui/components/GeometryPerimeterLesson';
import {
  HUB_SECTIONS as GEOMETRY_SHAPES_HUB_SECTIONS,
  SLIDES as GEOMETRY_SHAPES_SLIDES,
} from './ui/components/GeometryShapesLesson';
import {
  HUB_SECTIONS as GEOMETRY_SYMMETRY_HUB_SECTIONS,
  SLIDES as GEOMETRY_SYMMETRY_SLIDES,
} from './ui/components/GeometrySymmetryLesson';
import {
  HUB_SECTIONS as LOGICAL_ANALOGIES_HUB_SECTIONS,
  SLIDES as LOGICAL_ANALOGIES_SLIDES,
} from './ui/components/LogicalAnalogiesLesson';
import {
  HUB_SECTIONS as LOGICAL_CLASSIFICATION_HUB_SECTIONS,
  SLIDES as LOGICAL_CLASSIFICATION_SLIDES,
} from './ui/components/LogicalClassificationLesson';
import {
  HUB_SECTIONS as LOGICAL_PATTERNS_HUB_SECTIONS,
  SLIDES as LOGICAL_PATTERNS_SLIDES,
} from './ui/components/LogicalPatternsLesson';
import {
  HUB_SECTIONS as LOGICAL_REASONING_HUB_SECTIONS,
  SLIDES as LOGICAL_REASONING_SLIDES,
} from './ui/components/LogicalReasoningLesson';
import { SLIDES as LOGICAL_THINKING_SLIDES } from './ui/components/LogicalThinkingLesson';
import {
  HUB_SECTIONS as MULTIPLICATION_HUB_SECTIONS,
  SLIDES as MULTIPLICATION_SLIDES,
} from './ui/components/MultiplicationLesson';
import {
  HUB_SECTIONS as SUBTRACTING_HUB_SECTIONS,
  SLIDES as SUBTRACTING_SLIDES,
} from './ui/components/SubtractingLesson';

import type { JSX } from 'react';

type LegacyImportSlide = {
  title: string;
  content: JSX.Element;
  tts?: string;
};

type LegacyImportHubSection = {
  id: string;
  emoji: string;
  title: string;
  description: string;
  isGame?: boolean;
};

type LegacyImportSection = {
  id: string;
  title: string;
  description: string;
  slides: readonly LegacyImportSlide[];
  activityId?: KangurLessonActivityId;
};

type LegacyImportDefinition =
  | {
      kind: 'sectioned';
      sections: readonly LegacyImportSection[];
    }
  | {
      kind: 'flat';
      slides: readonly LegacyImportSlide[];
    };

type LegacyImportDocumentOptions = {
  narration?: KangurLessonDocument['narration'];
};

export type KangurLegacyLessonImportResult = {
  document: KangurLessonDocument;
  importedPageCount: number;
  warnings: string[];
};

const escapeHtml = (value: string): string =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll('\'', '&#39;');

const stripHtml = (value: string): string =>
  value
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const createTextBlockFromHtml = (
  html: string,
  options?: {
    ttsText?: string;
    align?: 'left' | 'center' | 'right';
  }
) => ({
  ...createKangurLessonTextBlock(),
  html: sanitizeHtml(html),
  ttsText: options?.ttsText?.trim() || stripHtml(html),
  align: options?.align ?? 'left',
});

const renderLegacySlideHtml = (slide: LegacyImportSlide): string =>
  sanitizeHtml(renderToStaticMarkup(slide.content));

const createLessonOverviewHtml = (
  lesson: (typeof KANGUR_LESSON_LIBRARY)[KangurLessonComponentId],
  sections: readonly LegacyImportSection[] | null,
  pageCount: number
): string => {
  const contentSections = sections?.filter((section) => !section.activityId) ?? [];
  const interactiveSections = sections?.filter((section) => Boolean(section.activityId)) ?? [];

  return sanitizeHtml(`
    <div class="flex flex-col gap-4">
      <div class="rounded-3xl border border-sky-200 bg-sky-50 px-5 py-4 text-center">
        <div class="text-4xl">${escapeHtml(lesson.emoji)}</div>
        <h2 class="mt-2 text-2xl font-extrabold text-slate-800">${escapeHtml(lesson.title)}</h2>
        <p class="mt-2 text-sm text-slate-600">${escapeHtml(lesson.description)}</p>
      </div>
      ${
  contentSections.length > 0
    ? `
            <div class="grid gap-3 md:grid-cols-2">
              ${contentSections
    .map(
      (section) => `
                    <div class="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                      <div class="text-sm font-bold text-slate-800">${escapeHtml(section.title)}</div>
                      <p class="mt-1 text-sm text-slate-600">${escapeHtml(section.description)}</p>
                      <p class="mt-2 text-xs uppercase tracking-wide text-slate-400">${section.slides.length} page${section.slides.length === 1 ? '' : 's'} imported</p>
                    </div>
                  `
    )
    .join('')}
            </div>
          `
    : `
            <div class="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
              <p class="text-sm text-slate-600">${pageCount} lesson page${pageCount === 1 ? '' : 's'} imported from the legacy flow.</p>
            </div>
          `
}
      ${
  interactiveSections.length > 0
    ? `
            <div class="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              <p class="font-semibold">Interactive activities were preserved as modular activity blocks.</p>
              <p class="mt-1">${escapeHtml(interactiveSections.map((section) => section.title).join(', '))}</p>
            </div>
          `
    : ''
}
    </div>
  `);
};

const createSectionedDefinition = (
  hubSections: readonly LegacyImportHubSection[],
  slidesBySection: Record<string, readonly LegacyImportSlide[]>,
  activityMap?: Partial<Record<string, KangurLessonActivityId>>
): LegacyImportDefinition => ({
  kind: 'sectioned',
  sections: hubSections.map((section) => ({
    id: section.id,
    title: section.title,
    description: section.description,
    slides: slidesBySection[section.id] ?? [],
    activityId: section.isGame === true ? activityMap?.[section.id] : undefined,
  })),
});

const createClockDefinition = (): LegacyImportDefinition => ({
  kind: 'sectioned',
  sections: [
    ...CLOCK_LESSON_SECTIONS.map((section) => ({
      id: section.id,
      title: section.title,
      description: section.subtitle,
      slides: section.slides,
    })),
    {
      id: 'clock-training',
      title: 'Ćwiczenie z zegarem',
      description: 'Legacy training game available after finishing the clock lesson.',
      slides: [],
      activityId: 'clock-training',
    },
  ],
});

const LEGACY_IMPORTERS: Record<KangurLessonComponentId, LegacyImportDefinition> = {
  adding: createSectionedDefinition(ADDING_HUB_SECTIONS, ADDING_SLIDES, {
    game: 'adding-ball',
    synthesis: 'adding-synthesis',
  }),
  subtracting: createSectionedDefinition(SUBTRACTING_HUB_SECTIONS, SUBTRACTING_SLIDES, {
    game: 'subtracting-game',
  }),
  multiplication: createSectionedDefinition(MULTIPLICATION_HUB_SECTIONS, MULTIPLICATION_SLIDES, {
    game_array: 'multiplication-array',
  }),
  division: createSectionedDefinition(DIVISION_HUB_SECTIONS, DIVISION_SLIDES, {
    game: 'division-game',
  }),
  calendar: createSectionedDefinition(CALENDAR_HUB_SECTIONS, CALENDAR_SECTION_SLIDES, {
    game: 'calendar-interactive',
  }),
  clock: createClockDefinition(),
  geometry_basics: createSectionedDefinition(GEOMETRY_BASICS_HUB_SECTIONS, GEOMETRY_BASICS_SLIDES),
  geometry_shapes: createSectionedDefinition(GEOMETRY_SHAPES_HUB_SECTIONS, GEOMETRY_SHAPES_SLIDES, {
    game: 'geometry-drawing',
  }),
  geometry_symmetry: createSectionedDefinition(
    GEOMETRY_SYMMETRY_HUB_SECTIONS,
    GEOMETRY_SYMMETRY_SLIDES
  ),
  geometry_perimeter: createSectionedDefinition(
    GEOMETRY_PERIMETER_HUB_SECTIONS,
    GEOMETRY_PERIMETER_SLIDES
  ),
  logical_thinking: {
    kind: 'flat',
    slides: LOGICAL_THINKING_SLIDES,
  },
  logical_patterns: createSectionedDefinition(
    LOGICAL_PATTERNS_HUB_SECTIONS,
    LOGICAL_PATTERNS_SLIDES
  ),
  logical_classification: createSectionedDefinition(
    LOGICAL_CLASSIFICATION_HUB_SECTIONS,
    LOGICAL_CLASSIFICATION_SLIDES
  ),
  logical_reasoning: createSectionedDefinition(
    LOGICAL_REASONING_HUB_SECTIONS,
    LOGICAL_REASONING_SLIDES
  ),
  logical_analogies: createSectionedDefinition(
    LOGICAL_ANALOGIES_HUB_SECTIONS,
    LOGICAL_ANALOGIES_SLIDES
  ),
};

const buildPagesFromDefinition = (
  componentId: KangurLessonComponentId,
  definition: LegacyImportDefinition
) => {
  const lesson = KANGUR_LESSON_LIBRARY[componentId];
  const warnings: string[] = [];

  if (definition.kind === 'flat') {
    const pages = definition.slides.map((slide) =>
      createKangurLessonPage(slide.title, [
        createTextBlockFromHtml(renderLegacySlideHtml(slide), {
          ttsText: slide.tts,
        }),
      ])
    );
    const overviewPage = createKangurLessonPage('Overview', [
      createTextBlockFromHtml(createLessonOverviewHtml(lesson, null, pages.length), {
        align: 'center',
      }),
    ]);

    return {
      pages: [overviewPage, ...pages],
      warnings,
    };
  }

  const pages = definition.sections.flatMap((section) => {
    if (section.activityId) {
      const activityDefinition = getKangurLessonActivityDefinition(section.activityId);
      return [
        createKangurLessonPage(
          section.title,
          [
            {
              ...createKangurLessonActivityBlock(section.activityId),
              title: section.title || activityDefinition.title,
              description: section.description || activityDefinition.description,
            },
          ],
          {
            sectionKey: section.id,
            sectionTitle: section.title,
            sectionDescription: section.description,
            description: section.description,
          }
        ),
      ];
    }

    return section.slides.map((slide) => {
      const slideHtml = renderLegacySlideHtml(slide);
      return createKangurLessonPage(
        slide.title,
        [
          createTextBlockFromHtml(slideHtml, {
            ttsText: slide.tts,
          }),
        ],
        {
          sectionKey: section.id,
          sectionTitle: section.title,
          sectionDescription: section.description,
          description: section.title === slide.title ? section.description : section.title,
        }
      );
    });
  });

  const overviewPage = createKangurLessonPage('Overview', [
    createTextBlockFromHtml(createLessonOverviewHtml(lesson, definition.sections, pages.length), {
      align: 'center',
    }),
  ]);

  return {
    pages: [overviewPage, ...pages],
    warnings,
  };
};

export const importLegacyKangurLessonDocument = (
  componentId: KangurLessonComponentId,
  options?: LegacyImportDocumentOptions
): KangurLegacyLessonImportResult | null => {
  const definition = LEGACY_IMPORTERS[componentId];
  if (!definition) {
    return null;
  }

  const { pages, warnings } = buildPagesFromDefinition(componentId, definition);
  const baseDocument = createDefaultKangurLessonDocument();
  const importedDocument = updateKangurLessonDocumentPages(
    {
      ...baseDocument,
      narration: options?.narration ?? baseDocument.narration,
    },
    pages
  );

  return {
    document: updateKangurLessonDocumentTimestamp(importedDocument),
    importedPageCount: pages.length,
    warnings,
  };
};
