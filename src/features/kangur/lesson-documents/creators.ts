import {
  KANGUR_TTS_DEFAULT_LOCALE,
  KANGUR_TTS_DEFAULT_VOICE,
  type KangurLessonActivityBlock,
  type KangurLessonCalloutBlock,
  type KangurLessonCalloutVariant,
  type KangurLessonComponentId,
  type KangurLessonDocument,
  type KangurLessonGridBlock,
  type KangurLessonGridItem,
  type KangurLessonImageBlock,
  type KangurLessonInlineBlock,
  type KangurLessonPage,
  type KangurLessonQuizBlock,
  type KangurLessonRootBlock,
  type KangurLessonSvgBlock,
  type KangurLessonTextBlock,
} from '@/features/kangur/shared/contracts/kangur';

import { applyKangurLessonActivityDefaults } from '../lessons/activities';
import {
  createRandomId,
  DEFAULT_IMAGE_SRC,
  type KangurLessonGridTemplateId,
  type KangurLessonDocumentTemplateId,
} from './utils';

export const createKangurLessonBlockId = (prefix: string): string => createRandomId(prefix);

export const createKangurLessonTextBlock = (): KangurLessonTextBlock => ({
  id: createKangurLessonBlockId('lesson-text'),
  type: 'text',
  html: '<p>Start writing your lesson content here.</p>',
  ttsText: '',
  align: 'left',
});

export const createKangurLessonSvgBlock = (): KangurLessonSvgBlock => ({
  id: createKangurLessonBlockId('lesson-svg'),
  type: 'svg',
  title: 'Vector illustration',
  ttsDescription: '',
  markup:
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 120"><rect x="16" y="16" width="168" height="88" rx="18" fill="#dbeafe" stroke="#2563eb" stroke-width="6"/><circle cx="64" cy="60" r="18" fill="#60a5fa"/><path d="M98 76 L126 44 L154 76" fill="none" stroke="#1d4ed8" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  viewBox: '0 0 200 120',
  align: 'center',
  fit: 'contain',
  maxWidth: 420,
});

type KangurLessonSvgPreset = {
  title: string;
  markup: string;
  viewBox?: string;
};

const GEOMETRY_SHAPE_SVG_PRESETS: KangurLessonSvgPreset[] = [
  {
    title: 'Koło',
    markup:
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><circle cx="60" cy="60" r="34" fill="#38bdf8" stroke="#0f172a" stroke-width="6"/></svg>',
    viewBox: '0 0 120 120',
  },
  {
    title: 'Kwadrat',
    markup:
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><rect x="26" y="26" width="68" height="68" rx="10" fill="#4ade80" stroke="#0f172a" stroke-width="6"/></svg>',
    viewBox: '0 0 120 120',
  },
  {
    title: 'Trójkąt',
    markup:
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><polygon points="60,18 104,102 16,102" fill="#fbbf24" stroke="#0f172a" stroke-width="6" stroke-linejoin="round"/></svg>',
    viewBox: '0 0 120 120',
  },
  {
    title: 'Prostokąt',
    markup:
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><rect x="20" y="38" width="80" height="44" rx="10" fill="#fb7185" stroke="#0f172a" stroke-width="6"/></svg>',
    viewBox: '0 0 120 120',
  },
  {
    title: 'Owal',
    markup:
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><ellipse cx="60" cy="60" rx="40" ry="26" fill="#a78bfa" stroke="#0f172a" stroke-width="6"/></svg>',
    viewBox: '0 0 120 120',
  },
  {
    title: 'Romb',
    markup:
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><polygon points="60,12 104,60 60,108 16,60" fill="#f97316" stroke="#0f172a" stroke-width="6" stroke-linejoin="round"/></svg>',
    viewBox: '0 0 120 120',
  },
];

const createKangurLessonSvgBlockFromPreset = (
  preset: KangurLessonSvgPreset
): KangurLessonSvgBlock => ({
  ...createKangurLessonSvgBlock(),
  title: preset.title,
  markup: preset.markup,
  viewBox: preset.viewBox ?? '0 0 120 120',
});

const createGeometryShapeRecognitionDocument = (): KangurLessonDocument => {
  const gridBlock: KangurLessonGridBlock = {
    id: createKangurLessonBlockId('lesson-grid'),
    type: 'grid',
    columns: 2,
    gap: 18,
    rowHeight: 220,
    denseFill: false,
    stackOnMobile: true,
    items: GEOMETRY_SHAPE_SVG_PRESETS.map((preset) =>
      createKangurLessonGridItem(createKangurLessonSvgBlockFromPreset(preset))
    ),
  };

  return createLessonDocument([
    createKangurLessonPage('', [createKangurLessonTextBlock(), gridBlock]),
  ]);
};

export const createKangurLessonImageBlock = (): KangurLessonImageBlock => ({
  id: createKangurLessonBlockId('lesson-image'),
  type: 'image',
  title: 'SVG illustration',
  altText: '',
  caption: '',
  ttsDescription: '',
  src: DEFAULT_IMAGE_SRC,
  align: 'center',
  fit: 'contain',
  maxWidth: 480,
});

export const createKangurLessonActivityBlock = (
  activityId: KangurLessonActivityBlock['activityId'] = 'clock-training'
): KangurLessonActivityBlock => ({
  id: createKangurLessonBlockId('lesson-activity'),
  type: 'activity',
  ...applyKangurLessonActivityDefaults(activityId),
  ttsDescription: '',
});

export const createKangurLessonCalloutBlock = (
  variant: KangurLessonCalloutVariant = 'info'
): KangurLessonCalloutBlock => ({
  id: createKangurLessonBlockId('lesson-callout'),
  type: 'callout',
  variant,
  title: '',
  html: '<p>Add your callout content here.</p>',
  ttsText: '',
});

export const createKangurLessonQuizBlock = (): KangurLessonQuizBlock => {
  const choiceA = createKangurLessonBlockId('quiz-choice');
  const choiceB = createKangurLessonBlockId('quiz-choice');
  return {
    id: createKangurLessonBlockId('lesson-quiz'),
    type: 'quiz',
    question: '<p>Enter your question here.</p>',
    choices: [
      { id: choiceA, text: 'Choice A' },
      { id: choiceB, text: 'Choice B' },
    ],
    correctChoiceId: '',
    explanation: '',
    ttsText: '',
  };
};

export const createKangurLessonGridItem = (
  block: KangurLessonInlineBlock = createKangurLessonTextBlock()
): KangurLessonGridItem => ({
  id: createKangurLessonBlockId('lesson-grid-item'),
  colSpan: 1,
  rowSpan: 1,
  columnStart: null,
  rowStart: null,
  block,
});

export const createKangurLessonPage = (
  title: string = '',
  blocks: KangurLessonRootBlock[] = [createKangurLessonTextBlock()],
  options?: {
    sectionKey?: string;
    sectionTitle?: string;
    sectionDescription?: string;
    description?: string;
  }
): KangurLessonPage => ({
  id: createKangurLessonBlockId('lesson-page'),
  sectionKey: options?.sectionKey?.trim() || '',
  sectionTitle: options?.sectionTitle?.trim() || '',
  sectionDescription: options?.sectionDescription?.trim() || '',
  title,
  description: options?.description?.trim() || '',
  blocks,
});

export const flattenKangurLessonDocumentPages = (
  pages: readonly KangurLessonPage[]
): KangurLessonRootBlock[] => pages.flatMap((page) => page.blocks).slice(0, 256);

export const createLessonDocument = (pages: KangurLessonPage[]): KangurLessonDocument => ({
  version: 1,
  narration: {
    voice: KANGUR_TTS_DEFAULT_VOICE,
    locale: KANGUR_TTS_DEFAULT_LOCALE,
  },
  updatedAt: new Date().toISOString(),
  pages,
  blocks: flattenKangurLessonDocumentPages(pages),
});

export const createKangurLessonGridBlockFromTemplate = (
  templateId: KangurLessonGridTemplateId = 'two-column'
): KangurLessonGridBlock => {
  switch (templateId) {
    case 'three-column':
      return {
        id: createKangurLessonBlockId('lesson-grid'),
        type: 'grid',
        columns: 3,
        gap: 16,
        rowHeight: 220,
        denseFill: false,
        stackOnMobile: true,
        items: [
          createKangurLessonGridItem(createKangurLessonTextBlock()),
          createKangurLessonGridItem(createKangurLessonSvgBlock()),
          createKangurLessonGridItem(createKangurLessonTextBlock()),
        ],
      };
    case 'hero-left':
      return {
        id: createKangurLessonBlockId('lesson-grid'),
        type: 'grid',
        columns: 3,
        gap: 20,
        rowHeight: 220,
        denseFill: false,
        stackOnMobile: true,
        items: [
          {
            ...createKangurLessonGridItem(createKangurLessonTextBlock()),
            colSpan: 2,
          },
          createKangurLessonGridItem(createKangurLessonSvgBlock()),
        ],
      };
    case 'hero-right':
      return {
        id: createKangurLessonBlockId('lesson-grid'),
        type: 'grid',
        columns: 3,
        gap: 20,
        rowHeight: 220,
        denseFill: false,
        stackOnMobile: true,
        items: [
          createKangurLessonGridItem(createKangurLessonSvgBlock()),
          {
            ...createKangurLessonGridItem(createKangurLessonTextBlock()),
            colSpan: 2,
          },
        ],
      };
    case 'image-gallery':
      return {
        id: createKangurLessonBlockId('lesson-grid'),
        type: 'grid',
        columns: 2,
        gap: 18,
        rowHeight: 240,
        denseFill: false,
        stackOnMobile: true,
        items: [
          createKangurLessonGridItem(createKangurLessonImageBlock()),
          createKangurLessonGridItem(createKangurLessonImageBlock()),
          createKangurLessonGridItem(createKangurLessonImageBlock()),
          createKangurLessonGridItem(createKangurLessonImageBlock()),
        ],
      };
    case 'image-mosaic':
      return {
        id: createKangurLessonBlockId('lesson-grid'),
        type: 'grid',
        columns: 3,
        gap: 18,
        rowHeight: 200,
        denseFill: true,
        stackOnMobile: true,
        items: [
          {
            ...createKangurLessonGridItem(createKangurLessonImageBlock()),
            colSpan: 2,
            rowSpan: 2,
            columnStart: 1,
            rowStart: 1,
          },
          {
            ...createKangurLessonGridItem(createKangurLessonImageBlock()),
            columnStart: 3,
            rowStart: 1,
          },
          {
            ...createKangurLessonGridItem(createKangurLessonImageBlock()),
            columnStart: 3,
            rowStart: 2,
          },
          {
            ...createKangurLessonGridItem(createKangurLessonImageBlock()),
            columnStart: 1,
            rowStart: 3,
          },
        ],
      };
    case 'svg-duo':
      return {
        id: createKangurLessonBlockId('lesson-grid'),
        type: 'grid',
        columns: 2,
        gap: 16,
        rowHeight: 220,
        denseFill: false,
        stackOnMobile: true,
        items: [
          createKangurLessonGridItem(createKangurLessonSvgBlock()),
          createKangurLessonGridItem(createKangurLessonSvgBlock()),
        ],
      };
    case 'svg-trio':
      return {
        id: createKangurLessonBlockId('lesson-grid'),
        type: 'grid',
        columns: 3,
        gap: 16,
        rowHeight: 220,
        denseFill: false,
        stackOnMobile: true,
        items: [
          createKangurLessonGridItem(createKangurLessonSvgBlock()),
          createKangurLessonGridItem(createKangurLessonSvgBlock()),
          createKangurLessonGridItem(createKangurLessonSvgBlock()),
        ],
      };
    case 'svg-gallery':
      return {
        id: createKangurLessonBlockId('lesson-grid'),
        type: 'grid',
        columns: 2,
        gap: 18,
        rowHeight: 220,
        denseFill: false,
        stackOnMobile: true,
        items: [
          createKangurLessonGridItem(createKangurLessonSvgBlock()),
          createKangurLessonGridItem(createKangurLessonSvgBlock()),
          createKangurLessonGridItem(createKangurLessonSvgBlock()),
          createKangurLessonGridItem(createKangurLessonSvgBlock()),
        ],
      };
    case 'svg-mosaic':
      return {
        id: createKangurLessonBlockId('lesson-grid'),
        type: 'grid',
        columns: 3,
        gap: 18,
        rowHeight: 180,
        denseFill: true,
        stackOnMobile: true,
        items: [
          {
            ...createKangurLessonGridItem(createKangurLessonSvgBlock()),
            colSpan: 2,
            rowSpan: 2,
            columnStart: 1,
            rowStart: 1,
          },
          {
            ...createKangurLessonGridItem(createKangurLessonSvgBlock()),
            columnStart: 3,
            rowStart: 1,
          },
          {
            ...createKangurLessonGridItem(createKangurLessonSvgBlock()),
            columnStart: 3,
            rowStart: 2,
          },
          {
            ...createKangurLessonGridItem(createKangurLessonSvgBlock()),
            columnStart: 1,
            rowStart: 3,
          },
        ],
      };
    case 'two-column':
    default:
      return {
        id: createKangurLessonBlockId('lesson-grid'),
        type: 'grid',
        columns: 2,
        gap: 16,
        rowHeight: 220,
        denseFill: false,
        stackOnMobile: true,
        items: [
          createKangurLessonGridItem(createKangurLessonTextBlock()),
          createKangurLessonGridItem(createKangurLessonSvgBlock()),
        ],
      };
  }
};

export const createKangurLessonGridBlock = (): KangurLessonGridBlock =>
  createKangurLessonGridBlockFromTemplate('two-column');

export const createDefaultKangurLessonDocument = (): KangurLessonDocument =>
  createLessonDocument([createKangurLessonPage('', [createKangurLessonTextBlock()])]);

export const createKangurLessonDocumentFromTemplate = (
  templateId: KangurLessonDocumentTemplateId = 'article'
): KangurLessonDocument => {
  switch (templateId) {
    case 'text-with-figure':
      return createLessonDocument([
        createKangurLessonPage('', [
          createKangurLessonTextBlock(),
          createKangurLessonGridBlockFromTemplate('hero-right'),
        ]),
      ]);
    case 'image-gallery-page':
      return createLessonDocument([
        createKangurLessonPage('', [
          createKangurLessonTextBlock(),
          createKangurLessonGridBlockFromTemplate('image-gallery'),
        ]),
      ]);
    case 'svg-gallery-page':
      return createLessonDocument([
        createKangurLessonPage('', [
          createKangurLessonTextBlock(),
          createKangurLessonGridBlockFromTemplate('svg-gallery'),
        ]),
      ]);
    case 'svg-mosaic-page':
      return createLessonDocument([
        createKangurLessonPage('', [
          createKangurLessonTextBlock(),
          createKangurLessonGridBlockFromTemplate('svg-mosaic'),
        ]),
      ]);
    case 'article':
    default:
      return createDefaultKangurLessonDocument();
  }
};

const STARTER_TEMPLATE_BY_COMPONENT_ID: Record<
  KangurLessonComponentId,
  KangurLessonDocumentTemplateId
> = {
  clock: 'text-with-figure',
  calendar: 'text-with-figure',
  adding: 'text-with-figure',
  subtracting: 'text-with-figure',
  multiplication: 'text-with-figure',
  division: 'text-with-figure',
  geometry_basics: 'svg-mosaic-page',
  geometry_shapes: 'svg-mosaic-page',
  geometry_symmetry: 'svg-mosaic-page',
  geometry_perimeter: 'svg-mosaic-page',
  logical_thinking: 'article',
  logical_patterns: 'article',
  logical_classification: 'article',
  logical_reasoning: 'article',
  logical_analogies: 'article',
  alphabet_basics: 'article',
  alphabet_copy: 'article',
  alphabet_syllables: 'article',
  alphabet_words: 'article',
  alphabet_matching: 'article',
  alphabet_sequence: 'article',
  art_colors_harmony: 'article',
  art_shapes_basic: 'article',
  music_diatonic_scale: 'article',
  geometry_shape_recognition: 'svg-gallery-page',
  english_basics: 'article',
  english_parts_of_speech: 'article',
  english_sentence_structure: 'article',
  english_going_to: 'article',
  english_subject_verb_agreement: 'article',
  english_adjectives: 'article',
  english_comparatives_superlatives: 'article',
  english_adverbs: 'article',
  english_adverbs_frequency: 'article',
  english_articles: 'article',
  english_prepositions_time_place: 'article',
  webdev_react_components: 'article',
  webdev_react_dom_components: 'article',
  webdev_react_hooks: 'article',
  webdev_react_apis: 'article',
  webdev_react_dom_hooks: 'article',
  webdev_react_dom_apis: 'article',
  webdev_react_dom_client_apis: 'article',
  webdev_react_dom_server_apis: 'article',
  webdev_react_dom_static_apis: 'article',
  webdev_react_compiler_config: 'article',
  webdev_react_compiler_directives: 'article',
  webdev_react_compiler_libraries: 'article',
  webdev_react_performance_tracks: 'article',
  webdev_react_lints: 'article',
  webdev_react_rules: 'article',
  webdev_react_server_components: 'article',
  webdev_react_server_functions: 'article',
  webdev_react_server_directives: 'article',
  webdev_react_router: 'article',
  webdev_react_setup: 'article',
  webdev_react_state_management: 'article',
  agentic_coding_codex_5_4: 'article',
  agentic_coding_codex_5_4_fit: 'article',
  agentic_coding_codex_5_4_surfaces: 'article',
  agentic_coding_codex_5_4_operating_model: 'article',
  agentic_coding_codex_5_4_prompting: 'article',
  agentic_coding_codex_5_4_responses: 'article',
  agentic_coding_codex_5_4_agents_md: 'article',
  agentic_coding_codex_5_4_approvals: 'article',
  agentic_coding_codex_5_4_safety: 'article',
  agentic_coding_codex_5_4_config_layers: 'article',
  agentic_coding_codex_5_4_rules: 'article',
  agentic_coding_codex_5_4_web_citations: 'article',
  agentic_coding_codex_5_4_tooling: 'article',
  agentic_coding_codex_5_4_response_contract: 'article',
  agentic_coding_codex_5_4_ai_documentation: 'article',
  agentic_coding_codex_5_4_delegation: 'article',
  agentic_coding_codex_5_4_models: 'article',
  agentic_coding_codex_5_4_cli_ide: 'article',
  agentic_coding_codex_5_4_app_workflows: 'article',
  agentic_coding_codex_5_4_skills: 'article',
  agentic_coding_codex_5_4_mcp_integrations: 'article',
  agentic_coding_codex_5_4_automations: 'article',
  agentic_coding_codex_5_4_state_scale: 'article',
  agentic_coding_codex_5_4_review: 'article',
  agentic_coding_codex_5_4_long_horizon: 'article',
  agentic_coding_codex_5_4_dos_donts: 'article',
  agentic_coding_codex_5_4_non_engineers: 'article',
  agentic_coding_codex_5_4_prompt_patterns: 'article',
  agentic_coding_codex_5_4_rollout: 'article',
};

export const resolveStarterKangurLessonDocumentTemplate = (
  componentId: KangurLessonComponentId
): KangurLessonDocumentTemplateId => STARTER_TEMPLATE_BY_COMPONENT_ID[componentId];

export const createStarterKangurLessonDocument = (
  componentId: KangurLessonComponentId
): KangurLessonDocument =>
  componentId === 'geometry_shape_recognition'
    ? createGeometryShapeRecognitionDocument()
    : createKangurLessonDocumentFromTemplate(resolveStarterKangurLessonDocumentTemplate(componentId));
