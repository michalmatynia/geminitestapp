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
// import {
//   HUB_SECTIONS as CALENDAR_HUB_SECTIONS,
//   SECTION_SLIDES as CALENDAR_SECTION_SLIDES,
// } from './ui/components/CalendarLesson';
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
import {
  HUB_SECTIONS as LOGICAL_THINKING_HUB_SECTIONS,
  SECTION_SLIDES as LOGICAL_THINKING_SLIDES,
} from './ui/components/LogicalThinkingLesson';
import {
  HUB_SECTIONS as MULTIPLICATION_HUB_SECTIONS,
  SLIDES as MULTIPLICATION_SLIDES,
} from './ui/components/MultiplicationLesson';
import {
  HUB_SECTIONS as SUBTRACTING_HUB_SECTIONS,
  SLIDES as SUBTRACTING_SLIDES,
} from './ui/components/SubtractingLesson';
import { KANGUR_STACK_RELAXED_CLASSNAME } from '@/features/kangur/ui/design/tokens';

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
    <div class="${KANGUR_STACK_RELAXED_CLASSNAME}">
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
  calendar: { kind: 'flat', slides: [] },
  // createSectionedDefinition(CALENDAR_HUB_SECTIONS, CALENDAR_SECTION_SLIDES, {
  //   game: 'calendar-interactive',
  // }),
  clock: createClockDefinition(),
  geometry_basics: createSectionedDefinition(GEOMETRY_BASICS_HUB_SECTIONS, GEOMETRY_BASICS_SLIDES),
  geometry_shapes: createSectionedDefinition(GEOMETRY_SHAPES_HUB_SECTIONS, GEOMETRY_SHAPES_SLIDES, {
    game: 'geometry-drawing',
  }),
  geometry_shape_recognition: {
    kind: 'flat',
    slides: [],
  },
  geometry_symmetry: createSectionedDefinition(
    GEOMETRY_SYMMETRY_HUB_SECTIONS,
    GEOMETRY_SYMMETRY_SLIDES
  ),
  geometry_perimeter: createSectionedDefinition(
    GEOMETRY_PERIMETER_HUB_SECTIONS,
    GEOMETRY_PERIMETER_SLIDES
  ),
  logical_thinking: createSectionedDefinition(
    LOGICAL_THINKING_HUB_SECTIONS,
    LOGICAL_THINKING_SLIDES
  ),
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
  alphabet_basics: {
    kind: 'flat',
    slides: [],
  },
  alphabet_copy: {
    kind: 'flat',
    slides: [],
  },
  alphabet_syllables: {
    kind: 'flat',
    slides: [],
  },
  alphabet_words: {
    kind: 'flat',
    slides: [],
  },
  alphabet_matching: {
    kind: 'flat',
    slides: [],
  },
  alphabet_sequence: {
    kind: 'flat',
    slides: [],
  },
  english_basics: {
    kind: 'flat',
    slides: [],
  },
  english_parts_of_speech: {
    kind: 'flat',
    slides: [],
  },
  english_sentence_structure: {
    kind: 'flat',
    slides: [],
  },
  english_subject_verb_agreement: {
    kind: 'flat',
    slides: [],
  },
  english_articles: {
    kind: 'flat',
    slides: [],
  },
  english_prepositions_time_place: {
    kind: 'flat',
    slides: [],
  },
  webdev_react_components: {
    kind: 'flat',
    slides: [],
  },
  webdev_react_dom_components: {
    kind: 'flat',
    slides: [],
  },
  webdev_react_hooks: {
    kind: 'flat',
    slides: [],
  },
  webdev_react_apis: {
    kind: 'flat',
    slides: [],
  },
  webdev_react_dom_hooks: {
    kind: 'flat',
    slides: [],
  },
  webdev_react_dom_apis: {
    kind: 'flat',
    slides: [],
  },
  webdev_react_dom_client_apis: {
    kind: 'flat',
    slides: [],
  },
  webdev_react_dom_server_apis: {
    kind: 'flat',
    slides: [],
  },
  webdev_react_dom_static_apis: {
    kind: 'flat',
    slides: [],
  },
  webdev_react_compiler_config: {
    kind: 'flat',
    slides: [],
  },
  webdev_react_compiler_directives: {
    kind: 'flat',
    slides: [],
  },
  webdev_react_compiler_libraries: {
    kind: 'flat',
    slides: [],
  },
  webdev_react_performance_tracks: {
    kind: 'flat',
    slides: [],
  },
  webdev_react_lints: {
    kind: 'flat',
    slides: [],
  },
  webdev_react_rules: {
    kind: 'flat',
    slides: [],
  },
  webdev_react_server_components: {
    kind: 'flat',
    slides: [],
  },
  webdev_react_server_functions: {
    kind: 'flat',
    slides: [],
  },
  webdev_react_server_directives: {
    kind: 'flat',
    slides: [],
  },
  webdev_react_router: {
    kind: 'flat',
    slides: [],
  },
  webdev_react_setup: {
    kind: 'flat',
    slides: [],
  },
  webdev_react_state_management: {
    kind: 'flat',
    slides: [],
  },
  agentic_coding_codex_5_4: {
    kind: 'flat',
    slides: [],
  },
  agentic_coding_codex_5_4_fit: {
    kind: 'flat',
    slides: [],
  },
  agentic_coding_codex_5_4_surfaces: {
    kind: 'flat',
    slides: [],
  },
  agentic_coding_codex_5_4_operating_model: {
    kind: 'flat',
    slides: [],
  },
  agentic_coding_codex_5_4_prompting: {
    kind: 'flat',
    slides: [],
  },
  agentic_coding_codex_5_4_responses: {
    kind: 'flat',
    slides: [],
  },
  agentic_coding_codex_5_4_agents_md: {
    kind: 'flat',
    slides: [],
  },
  agentic_coding_codex_5_4_approvals: {
    kind: 'flat',
    slides: [],
  },
  agentic_coding_codex_5_4_safety: {
    kind: 'flat',
    slides: [],
  },
  agentic_coding_codex_5_4_config_layers: {
    kind: 'flat',
    slides: [],
  },
  agentic_coding_codex_5_4_rules: {
    kind: 'flat',
    slides: [],
  },
  agentic_coding_codex_5_4_web_citations: {
    kind: 'flat',
    slides: [],
  },
  agentic_coding_codex_5_4_tooling: {
    kind: 'flat',
    slides: [],
  },
  agentic_coding_codex_5_4_response_contract: {
    kind: 'flat',
    slides: [],
  },
  agentic_coding_codex_5_4_ai_documentation: {
    kind: 'flat',
    slides: [],
  },
  agentic_coding_codex_5_4_delegation: {
    kind: 'flat',
    slides: [],
  },
  agentic_coding_codex_5_4_models: {
    kind: 'flat',
    slides: [],
  },
  agentic_coding_codex_5_4_cli_ide: {
    kind: 'flat',
    slides: [],
  },
  agentic_coding_codex_5_4_app_workflows: {
    kind: 'flat',
    slides: [],
  },
  agentic_coding_codex_5_4_skills: {
    kind: 'flat',
    slides: [],
  },
  agentic_coding_codex_5_4_mcp_integrations: {
    kind: 'flat',
    slides: [],
  },
  agentic_coding_codex_5_4_automations: {
    kind: 'flat',
    slides: [],
  },
  agentic_coding_codex_5_4_state_scale: {
    kind: 'flat',
    slides: [],
  },
  agentic_coding_codex_5_4_review: {
    kind: 'flat',
    slides: [],
  },
  agentic_coding_codex_5_4_long_horizon: {
    kind: 'flat',
    slides: [],
  },
  agentic_coding_codex_5_4_dos_donts: {
    kind: 'flat',
    slides: [],
  },
  agentic_coding_codex_5_4_non_engineers: {
    kind: 'flat',
    slides: [],
  },
  agentic_coding_codex_5_4_prompt_patterns: {
    kind: 'flat',
    slides: [],
  },
  agentic_coding_codex_5_4_rollout: {
    kind: 'flat',
    slides: [],
  },
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
