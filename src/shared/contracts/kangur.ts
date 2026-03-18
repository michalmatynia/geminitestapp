import { z } from 'zod';

import {
  createDefaultKangurAiTutorLearnerMood,
  kangurAiTutorLearnerMoodSchema,
} from './kangur-ai-tutor-mood';
import { activityLogSchema } from './system';

const nonEmptyTrimmedString = z.string().trim().min(1);

export const KANGUR_LEARNER_PASSWORD_MIN_LENGTH = 6;
export const KANGUR_LEARNER_PASSWORD_MAX_LENGTH = 160;
export const KANGUR_LEARNER_PASSWORD_PATTERN = /^[A-Za-z0-9]+$/;

const kangurLearnerPasswordSchema = z
  .string()
  .trim()
  .min(KANGUR_LEARNER_PASSWORD_MIN_LENGTH, {
    message: `Password must be at least ${KANGUR_LEARNER_PASSWORD_MIN_LENGTH} characters.`,
  })
  .max(KANGUR_LEARNER_PASSWORD_MAX_LENGTH)
  .regex(KANGUR_LEARNER_PASSWORD_PATTERN, {
    message: 'Password must contain only letters and numbers.',
  });

export const KANGUR_LESSONS_SETTING_KEY = 'kangur_lessons_v1';
export const KANGUR_LESSON_DOCUMENTS_SETTING_KEY = 'kangur_lesson_documents_v1';
export const KANGUR_THEME_SETTINGS_KEY = 'kangur_cms_theme_v1';
export const KANGUR_DAILY_THEME_SETTINGS_KEY = 'kangur_cms_theme_daily_v1';
export const KANGUR_DAWN_THEME_SETTINGS_KEY = 'kangur_cms_theme_dawn_v1';
export const KANGUR_SUNSET_THEME_SETTINGS_KEY = 'kangur_cms_theme_sunset_v1';
export const KANGUR_NIGHTLY_THEME_SETTINGS_KEY = 'kangur_cms_theme_nightly_v1';
export const KANGUR_CLASS_OVERRIDES_SETTING_KEY = 'kangur_class_overrides_v1';
export const KANGUR_STOREFRONT_DEFAULT_MODE_SETTING_KEY =
  'kangur_storefront_default_mode_v1';

export const kangurLessonComponentIdSchema = z.enum([
  'alphabet_basics',
  'alphabet_copy',
  'alphabet_syllables',
  'alphabet_words',
  'alphabet_matching',
  'alphabet_sequence',
  'geometry_shape_recognition',
  'clock',
  'calendar',
  'adding',
  'subtracting',
  'multiplication',
  'division',
  'geometry_basics',
  'geometry_shapes',
  'geometry_symmetry',
  'geometry_perimeter',
  'logical_thinking',
  'logical_patterns',
  'logical_classification',
  'logical_reasoning',
  'logical_analogies',
  'english_basics',
  'english_parts_of_speech',
  'english_sentence_structure',
  'english_subject_verb_agreement',
  'english_articles',
  'english_prepositions_time_place',
  'webdev_react_components',
  'webdev_react_hooks',
  'webdev_react_apis',
  'webdev_react_dom_hooks',
  'webdev_react_dom_components',
  'webdev_react_dom_apis',
  'webdev_react_dom_client_apis',
  'webdev_react_dom_server_apis',
  'webdev_react_dom_static_apis',
  'webdev_react_compiler_config',
  'webdev_react_compiler_directives',
  'webdev_react_compiler_libraries',
  'webdev_react_performance_tracks',
  'webdev_react_lints',
  'webdev_react_rules',
  'webdev_react_server_components',
  'webdev_react_server_functions',
  'webdev_react_server_directives',
  'webdev_react_router',
  'webdev_react_setup',
  'webdev_react_state_management',
  'agentic_coding_codex_5_4',
  'agentic_coding_codex_5_4_fit',
  'agentic_coding_codex_5_4_surfaces',
  'agentic_coding_codex_5_4_operating_model',
  'agentic_coding_codex_5_4_prompting',
  'agentic_coding_codex_5_4_responses',
  'agentic_coding_codex_5_4_agents_md',
  'agentic_coding_codex_5_4_approvals',
  'agentic_coding_codex_5_4_safety',
  'agentic_coding_codex_5_4_config_layers',
  'agentic_coding_codex_5_4_rules',
  'agentic_coding_codex_5_4_web_citations',
  'agentic_coding_codex_5_4_tooling',
  'agentic_coding_codex_5_4_response_contract',
  'agentic_coding_codex_5_4_ai_documentation',
  'agentic_coding_codex_5_4_delegation',
  'agentic_coding_codex_5_4_models',
  'agentic_coding_codex_5_4_cli_ide',
  'agentic_coding_codex_5_4_app_workflows',
  'agentic_coding_codex_5_4_skills',
  'agentic_coding_codex_5_4_mcp_integrations',
  'agentic_coding_codex_5_4_automations',
  'agentic_coding_codex_5_4_state_scale',
  'agentic_coding_codex_5_4_review',
  'agentic_coding_codex_5_4_long_horizon',
  'agentic_coding_codex_5_4_dos_donts',
  'agentic_coding_codex_5_4_non_engineers',
  'agentic_coding_codex_5_4_prompt_patterns',
  'agentic_coding_codex_5_4_rollout',
]);
export type KangurLessonComponentId = z.infer<typeof kangurLessonComponentIdSchema>;

export const kangurLessonContentModeSchema = z.enum(['component', 'document']);
export type KangurLessonContentMode = z.infer<typeof kangurLessonContentModeSchema>;

export const kangurLessonSubjectSchema = z.enum([
  'alphabet',
  'geometry',
  'maths',
  'english',
  'web_development',
  'agentic_coding',
]);
export type KangurLessonSubject = z.infer<typeof kangurLessonSubjectSchema>;

export const kangurLessonAgeGroupSchema = z.enum(['six_year_old', 'ten_year_old', 'grown_ups']);
export type KangurLessonAgeGroup = z.infer<typeof kangurLessonAgeGroupSchema>;

export const kangurSubjectFocusSchema = z.object({
  subject: kangurLessonSubjectSchema,
});
export type KangurSubjectFocus = z.infer<typeof kangurSubjectFocusSchema>;

export const KANGUR_TTS_DEFAULT_LOCALE = 'pl-PL';
export const KANGUR_TTS_DEFAULT_VOICE = 'coral';

export const KANGUR_LESSON_ACTIVITY_IDS = [
  'adding-ball',
  'adding-synthesis',
  'subtracting-game',
  'multiplication-array',
  'multiplication-quiz',
  'division-game',
  'geometry-drawing',
  'calendar-interactive',
  'clock-training',
] as const;
export const kangurLessonActivityIdSchema = z.enum(KANGUR_LESSON_ACTIVITY_IDS);
export type KangurLessonActivityId = z.infer<typeof kangurLessonActivityIdSchema>;

export const KANGUR_LESSON_ACTIVITY_TYPES = [
  'practice-drag-drop',
  'practice-rhythm',
  'practice-multiple-choice',
  'practice-tap-select',
  'practice-calendar-interactive',
  'training-drawing',
  'training-clock',
] as const;
export const kangurLessonActivityTypeSchema = z.enum(KANGUR_LESSON_ACTIVITY_TYPES);
export type KangurLessonActivityType = z.infer<typeof kangurLessonActivityTypeSchema>;

export const kangurLessonNarrationVoiceSchema = z.enum([
  'alloy',
  'ash',
  'ballad',
  'coral',
  'echo',
  'sage',
  'shimmer',
  'verse',
  'marin',
  'cedar',
]);
export type KangurLessonNarrationVoice = z.infer<typeof kangurLessonNarrationVoiceSchema>;

export const kangurQuestionChoiceSchema = z.union([z.number(), z.string()]);
export type KangurQuestionChoice = z.infer<typeof kangurQuestionChoiceSchema>;

export const kangurExamQuestionSchema = z.object({
  id: nonEmptyTrimmedString.max(120),
  question: z.string().max(10_000),
  choices: z.array(kangurQuestionChoiceSchema).min(1).max(10),
  answer: kangurQuestionChoiceSchema,
  explanation: z.string().max(5_000).optional(),
  image: z.string().nullable().optional(),
  choiceDescriptions: z.array(z.string()).max(10).optional(),
});
export type KangurExamQuestion = z.infer<typeof kangurExamQuestionSchema>;

export const kangurLessonSchema = z.object({
  id: nonEmptyTrimmedString.max(120),
  componentId: kangurLessonComponentIdSchema,
  contentMode: kangurLessonContentModeSchema.default('component'),
  subject: kangurLessonSubjectSchema.default('maths'),
  ageGroup: kangurLessonAgeGroupSchema.default('six_year_old'),
  title: nonEmptyTrimmedString.max(120),
  description: nonEmptyTrimmedString.max(240),
  emoji: nonEmptyTrimmedString.max(12),
  color: nonEmptyTrimmedString.max(80),
  activeBg: nonEmptyTrimmedString.max(80),
  sortOrder: z.number().int(),
  enabled: z.boolean(),
});
export type KangurLesson = z.infer<typeof kangurLessonSchema>;

export const kangurLessonsSchema = z.array(kangurLessonSchema);
export type KangurLessons = z.infer<typeof kangurLessonsSchema>;

const kangurLessonBlockIdSchema = nonEmptyTrimmedString.max(120);
const kangurLessonBlockAlignSchema = z.enum(['left', 'center', 'right']);
const kangurLessonMediaFitSchema = z.enum(['contain', 'cover', 'none']);
const kangurLessonSvgImageSourcePattern = /\.svg(?:$|[?#])/i;
const kangurLessonGridColumnsSchema = z.number().int().min(1).max(4);
const kangurLessonGridGapSchema = z.number().int().min(0).max(48);
const kangurLessonGridSpanSchema = z.number().int().min(1).max(4);
const kangurLessonGridRowHeightSchema = z.number().int().min(120).max(480);
const kangurLessonGridRowIndexSchema = z.number().int().min(1).max(12);

export const kangurLessonTextBlockSchema = z.object({
  id: kangurLessonBlockIdSchema,
  type: z.literal('text'),
  html: z.string().max(100_000).default(''),
  ttsText: z.string().trim().max(10_000).optional(),
  align: kangurLessonBlockAlignSchema.default('left'),
});
export type KangurLessonTextBlock = z.infer<typeof kangurLessonTextBlockSchema>;

export const kangurLessonSvgBlockSchema = z.object({
  id: kangurLessonBlockIdSchema,
  type: z.literal('svg'),
  title: z.string().trim().max(120).default(''),
  ttsDescription: z.string().trim().max(2_000).optional(),
  markup: z.string().max(200_000).default(''),
  viewBox: z.string().trim().max(80).default('0 0 100 100'),
  align: kangurLessonBlockAlignSchema.default('center'),
  fit: kangurLessonMediaFitSchema.default('contain'),
  maxWidth: z.number().int().min(120).max(1_200).default(420),
});
export type KangurLessonSvgBlock = z.infer<typeof kangurLessonSvgBlockSchema>;

export const kangurLessonImageBlockSchema = z.object({
  id: kangurLessonBlockIdSchema,
  type: z.literal('image'),
  title: z.string().trim().max(120).default(''),
  altText: z.string().trim().max(300).optional(),
  caption: z.string().trim().max(300).optional(),
  ttsDescription: z.string().trim().max(2_000).optional(),
  src: z
    .string()
    .trim()
    .max(2_000)
    .refine(
      (value) =>
        value.length === 0 ||
        (!/^javascript:/i.test(value) && kangurLessonSvgImageSourcePattern.test(value)),
      {
        message: 'Kangur lesson image sources must use SVG files.',
      }
    )
    .default(''),
  align: kangurLessonBlockAlignSchema.default('center'),
  fit: kangurLessonMediaFitSchema.default('contain'),
  maxWidth: z.number().int().min(120).max(1_200).default(480),
});
export type KangurLessonImageBlock = z.infer<typeof kangurLessonImageBlockSchema>;

export const kangurLessonActivityBlockSchema = z.object({
  id: kangurLessonBlockIdSchema,
  type: z.literal('activity'),
  activityId: kangurLessonActivityIdSchema,
  title: z.string().trim().max(120).default(''),
  description: z.string().trim().max(500).optional(),
  ttsDescription: z.string().trim().max(2_000).optional(),
});
export type KangurLessonActivityBlock = z.infer<typeof kangurLessonActivityBlockSchema>;

export const kangurLessonInlineBlockSchema = z.discriminatedUnion('type', [
  kangurLessonTextBlockSchema,
  kangurLessonSvgBlockSchema,
  kangurLessonImageBlockSchema,
]);
export type KangurLessonInlineBlock = z.infer<typeof kangurLessonInlineBlockSchema>;

export const kangurLessonGridItemSchema = z.object({
  id: kangurLessonBlockIdSchema,
  colSpan: kangurLessonGridSpanSchema.default(1),
  rowSpan: kangurLessonGridSpanSchema.default(1),
  columnStart: kangurLessonGridColumnsSchema.nullable().default(null),
  rowStart: kangurLessonGridRowIndexSchema.nullable().default(null),
  block: kangurLessonInlineBlockSchema,
});
export type KangurLessonGridItem = z.infer<typeof kangurLessonGridItemSchema>;

export const kangurLessonGridBlockSchema = z.object({
  id: kangurLessonBlockIdSchema,
  type: z.literal('grid'),
  columns: kangurLessonGridColumnsSchema.default(2),
  gap: kangurLessonGridGapSchema.default(16),
  rowHeight: kangurLessonGridRowHeightSchema.default(220),
  denseFill: z.boolean().default(false),
  stackOnMobile: z.boolean().default(true),
  items: z.array(kangurLessonGridItemSchema).max(24).default([]),
});
export type KangurLessonGridBlock = z.infer<typeof kangurLessonGridBlockSchema>;

export const kangurLessonCalloutVariantSchema = z.enum(['info', 'tip', 'warning', 'success']);
export type KangurLessonCalloutVariant = z.infer<typeof kangurLessonCalloutVariantSchema>;

export const kangurLessonCalloutBlockSchema = z.object({
  id: kangurLessonBlockIdSchema,
  type: z.literal('callout'),
  variant: kangurLessonCalloutVariantSchema.default('info'),
  title: z.string().trim().max(120).optional(),
  html: z.string().max(10_000).default(''),
  ttsText: z.string().trim().max(2_000).optional(),
});
export type KangurLessonCalloutBlock = z.infer<typeof kangurLessonCalloutBlockSchema>;

export const kangurLessonQuizChoiceSchema = z.object({
  id: kangurLessonBlockIdSchema,
  text: z.string().trim().max(500).default(''),
});
export type KangurLessonQuizChoice = z.infer<typeof kangurLessonQuizChoiceSchema>;

export const kangurLessonQuizBlockSchema = z.object({
  id: kangurLessonBlockIdSchema,
  type: z.literal('quiz'),
  question: z.string().max(10_000).default(''),
  choices: z.array(kangurLessonQuizChoiceSchema).min(2).max(4).default([]),
  correctChoiceId: z.string().max(120).default(''),
  explanation: z.string().max(10_000).optional(),
  ttsText: z.string().trim().max(2_000).optional(),
});
export type KangurLessonQuizBlock = z.infer<typeof kangurLessonQuizBlockSchema>;

export const kangurLessonRootBlockSchema = z.discriminatedUnion('type', [
  kangurLessonTextBlockSchema,
  kangurLessonSvgBlockSchema,
  kangurLessonImageBlockSchema,
  kangurLessonActivityBlockSchema,
  kangurLessonGridBlockSchema,
  kangurLessonCalloutBlockSchema,
  kangurLessonQuizBlockSchema,
]);
export type KangurLessonRootBlock = z.infer<typeof kangurLessonRootBlockSchema>;

export const kangurLessonPageSchema = z.object({
  id: kangurLessonBlockIdSchema,
  sectionKey: z.string().trim().max(120).optional(),
  sectionTitle: z.string().trim().max(120).optional(),
  sectionDescription: z.string().trim().max(240).optional(),
  title: z.string().trim().max(120).optional(),
  description: z.string().trim().max(240).optional(),
  blocks: z.array(kangurLessonRootBlockSchema).max(48).default([]),
});
export type KangurLessonPage = z.infer<typeof kangurLessonPageSchema>;

export const kangurLessonDocumentNarrationSchema = z
  .object({
    voice: kangurLessonNarrationVoiceSchema.optional(),
    locale: z.string().trim().min(2).max(16).optional(),
    previewSourceSignature: z.string().trim().min(1).max(128).optional(),
    lastPreviewedAt: z.string().datetime({ offset: true }).optional(),
  })
  .optional();
export type KangurLessonDocumentNarration = z.infer<typeof kangurLessonDocumentNarrationSchema>;

export const kangurLessonDocumentSchema = z.object({
  version: z.literal(1).default(1),
  blocks: z.array(kangurLessonRootBlockSchema).max(256).default([]),
  pages: z.array(kangurLessonPageSchema).max(24).optional(),
  narration: kangurLessonDocumentNarrationSchema,
  updatedAt: z.string().datetime({ offset: true }).optional(),
});
export type KangurLessonDocument = z.infer<typeof kangurLessonDocumentSchema>;

export const kangurLessonDocumentStoreSchema = z.record(
  z.string().trim().min(1).max(120),
  kangurLessonDocumentSchema
);
export type KangurLessonDocumentStore = z.infer<typeof kangurLessonDocumentStoreSchema>;

const kangurProgressCounterSchema = z.number().int().min(0).max(1_000_000);
const kangurProgressListSchema = z.array(nonEmptyTrimmedString.max(64)).max(256);
const kangurLessonMasteryPercentSchema = z.number().int().min(0).max(100);

export const kangurLessonMasteryEntrySchema = z.object({
  attempts: kangurProgressCounterSchema,
  completions: kangurProgressCounterSchema,
  masteryPercent: kangurLessonMasteryPercentSchema,
  bestScorePercent: kangurLessonMasteryPercentSchema,
  lastScorePercent: kangurLessonMasteryPercentSchema,
  lastCompletedAt: z.string().datetime({ offset: true }).nullable(),
});
export type KangurLessonMasteryEntry = z.infer<typeof kangurLessonMasteryEntrySchema>;

export const kangurLessonMasterySchema = z.record(
  z.string().trim().min(1).max(80),
  kangurLessonMasteryEntrySchema
);
export type KangurLessonMastery = z.infer<typeof kangurLessonMasterySchema>;

export const kangurProgressTaskOpenKindSchema = z.enum(['game', 'lesson', 'test']);
export type KangurProgressTaskOpenKind = z.infer<typeof kangurProgressTaskOpenKindSchema>;

export const kangurProgressTaskOpenEntrySchema = z.object({
  kind: kangurProgressTaskOpenKindSchema,
  title: nonEmptyTrimmedString.max(160),
  href: nonEmptyTrimmedString.max(420),
  openedAt: z.string().datetime({ offset: true }),
});
export type KangurProgressTaskOpenEntry = z.infer<typeof kangurProgressTaskOpenEntrySchema>;

export const kangurProgressTaskOpenListSchema = z
  .array(kangurProgressTaskOpenEntrySchema)
  .max(120);
export type KangurProgressTaskOpenList = z.infer<typeof kangurProgressTaskOpenListSchema>;

export const kangurLessonPanelProgressEntrySchema = z.object({
  viewedCount: kangurProgressCounterSchema,
  totalCount: kangurProgressCounterSchema,
  lastViewedAt: z.string().datetime({ offset: true }).nullable().optional(),
  label: z.string().trim().min(1).max(160).optional(),
  sessionId: z.string().trim().min(1).max(80).optional(),
  sessionStartedAt: z.string().datetime({ offset: true }).nullable().optional(),
  sessionUpdatedAt: z.string().datetime({ offset: true }).nullable().optional(),
  panelTimes: z
    .record(
      z.string().trim().min(1).max(80),
      z.object({
        seconds: kangurProgressCounterSchema,
        title: z.string().trim().min(1).max(160).optional(),
      })
    )
    .optional(),
});
export type KangurLessonPanelProgressEntry = z.infer<typeof kangurLessonPanelProgressEntrySchema>;

export const kangurLessonPanelProgressSchema = z.record(
  z.string().trim().min(1).max(80),
  kangurLessonPanelProgressEntrySchema
);
export type KangurLessonPanelProgress = z.infer<typeof kangurLessonPanelProgressSchema>;

export const kangurLessonPanelProgressStoreSchema = z.record(
  z.string().trim().min(1).max(80),
  kangurLessonPanelProgressSchema
);
export type KangurLessonPanelProgressStore = z.infer<
  typeof kangurLessonPanelProgressStoreSchema
>;

const normalizeKangurLessonMasteryEntry = (value: unknown): KangurLessonMasteryEntry | null => {
  const parsed = kangurLessonMasteryEntrySchema.safeParse(value);
  if (!parsed.success) {
    return null;
  }

  return {
    ...parsed.data,
    lastCompletedAt: parsed.data.lastCompletedAt ?? null,
  };
};

export const normalizeKangurLessonMastery = (value: unknown): KangurLessonMastery => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  const normalized: KangurLessonMastery = {};
  for (const [rawKey, rawEntry] of Object.entries(value as Record<string, unknown>)) {
    const key = rawKey.trim();
    if (!key || key.length > 80) {
      continue;
    }

    const entry = normalizeKangurLessonMasteryEntry(rawEntry);
    if (entry) {
      normalized[key] = entry;
    }
  }

  return normalized;
};

const normalizeKangurProgressTaskOpenEntry = (
  value: unknown
): KangurProgressTaskOpenEntry | null => {
  const parsed = kangurProgressTaskOpenEntrySchema.safeParse(value);
  if (!parsed.success) {
    return null;
  }

  return parsed.data;
};

export const normalizeKangurProgressTaskOpenList = (
  value: unknown
): KangurProgressTaskOpenList => {
  if (!Array.isArray(value)) {
    return [];
  }

  const normalized: KangurProgressTaskOpenList = [];
  value.forEach((entry) => {
    const normalizedEntry = normalizeKangurProgressTaskOpenEntry(entry);
    if (normalizedEntry) {
      normalized.push(normalizedEntry);
    }
  });

  return normalized;
};

const normalizeKangurLessonPanelProgressEntry = (
  value: unknown
): KangurLessonPanelProgressEntry | null => {
  const parsed = kangurLessonPanelProgressEntrySchema.safeParse(value);
  if (!parsed.success) {
    return null;
  }

  return {
    ...parsed.data,
    lastViewedAt: parsed.data.lastViewedAt ?? null,
    sessionStartedAt: parsed.data.sessionStartedAt ?? null,
    sessionUpdatedAt: parsed.data.sessionUpdatedAt ?? null,
  };
};

export const normalizeKangurLessonPanelProgress = (
  value: unknown
): KangurLessonPanelProgress => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  const normalized: KangurLessonPanelProgress = {};
  for (const [rawKey, rawEntry] of Object.entries(value as Record<string, unknown>)) {
    const key = rawKey.trim();
    if (!key || key.length > 80) {
      continue;
    }

    const entry = normalizeKangurLessonPanelProgressEntry(rawEntry);
    if (entry) {
      normalized[key] = entry;
    }
  }

  return normalized;
};

export const normalizeKangurLessonPanelProgressStore = (
  value: unknown
): KangurLessonPanelProgressStore => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  const normalized: KangurLessonPanelProgressStore = {};
  for (const [rawKey, rawEntry] of Object.entries(value as Record<string, unknown>)) {
    const key = rawKey.trim();
    if (!key || key.length > 80) {
      continue;
    }

    normalized[key] = normalizeKangurLessonPanelProgress(rawEntry);
  }

  return normalized;
};

export const kangurActivityStatsEntrySchema = z.object({
  sessionsPlayed: kangurProgressCounterSchema,
  perfectSessions: kangurProgressCounterSchema,
  totalCorrectAnswers: kangurProgressCounterSchema,
  totalQuestionsAnswered: kangurProgressCounterSchema,
  totalXpEarned: kangurProgressCounterSchema.default(0),
  bestScorePercent: kangurLessonMasteryPercentSchema,
  lastScorePercent: kangurLessonMasteryPercentSchema,
  currentStreak: kangurProgressCounterSchema,
  bestStreak: kangurProgressCounterSchema,
  lastPlayedAt: z.string().datetime({ offset: true }).nullable(),
});
export type KangurActivityStatsEntry = z.infer<typeof kangurActivityStatsEntrySchema>;

export const kangurActivityStatsSchema = z.record(
  z.string().trim().min(1).max(80),
  kangurActivityStatsEntrySchema
);
export type KangurActivityStats = z.infer<typeof kangurActivityStatsSchema>;

const normalizeKangurActivityStatsEntry = (value: unknown): KangurActivityStatsEntry | null => {
  const parsed = kangurActivityStatsEntrySchema.safeParse(value);
  if (!parsed.success) {
    return null;
  }

  return {
    ...parsed.data,
    lastPlayedAt: parsed.data.lastPlayedAt ?? null,
  };
};

export const normalizeKangurActivityStats = (value: unknown): KangurActivityStats => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  const normalized: KangurActivityStats = {};
  for (const [rawKey, rawEntry] of Object.entries(value as Record<string, unknown>)) {
    const key = rawKey.trim();
    if (!key || key.length > 80) {
      continue;
    }

    const entry = normalizeKangurActivityStatsEntry(rawEntry);
    if (entry) {
      normalized[key] = entry;
    }
  }

  return normalized;
};

export const kangurProgressStateSchema = z.object({
  totalXp: kangurProgressCounterSchema,
  gamesPlayed: kangurProgressCounterSchema,
  perfectGames: kangurProgressCounterSchema,
  lessonsCompleted: kangurProgressCounterSchema,
  clockPerfect: kangurProgressCounterSchema,
  calendarPerfect: kangurProgressCounterSchema,
  geometryPerfect: kangurProgressCounterSchema,
  badges: kangurProgressListSchema,
  operationsPlayed: kangurProgressListSchema,
  lessonMastery: kangurLessonMasterySchema,
  openedTasks: kangurProgressTaskOpenListSchema.optional(),
  lessonPanelProgress: kangurLessonPanelProgressStoreSchema.optional(),
  totalCorrectAnswers: kangurProgressCounterSchema.optional(),
  totalQuestionsAnswered: kangurProgressCounterSchema.optional(),
  currentWinStreak: kangurProgressCounterSchema.optional(),
  bestWinStreak: kangurProgressCounterSchema.optional(),
  dailyQuestsCompleted: kangurProgressCounterSchema.optional(),
  recommendedSessionsCompleted: kangurProgressCounterSchema.optional(),
  currentActivityRepeatStreak: kangurProgressCounterSchema.optional(),
  lastRewardedActivityKey: z.string().trim().max(120).nullable().optional(),
  activityStats: kangurActivityStatsSchema.optional(),
});
export type KangurProgressState = z.infer<typeof kangurProgressStateSchema>;

export const kangurLearnerActivityKindSchema = z.enum(['game', 'lesson', 'test']);
export type KangurLearnerActivityKind = z.infer<typeof kangurLearnerActivityKindSchema>;

export const kangurLearnerActivitySnapshotSchema = z.object({
  learnerId: nonEmptyTrimmedString.max(120),
  kind: kangurLearnerActivityKindSchema,
  title: nonEmptyTrimmedString.max(160),
  href: nonEmptyTrimmedString.max(420),
  startedAt: z.string().datetime({ offset: true }),
  updatedAt: z.string().datetime({ offset: true }),
});
export type KangurLearnerActivitySnapshot = z.infer<typeof kangurLearnerActivitySnapshotSchema>;

export const kangurLearnerActivityUpdateInputSchema = z.object({
  kind: kangurLearnerActivityKindSchema,
  title: nonEmptyTrimmedString.max(160),
  href: nonEmptyTrimmedString.max(420),
});
export type KangurLearnerActivityUpdateInput = z.infer<
  typeof kangurLearnerActivityUpdateInputSchema
>;

export const kangurLearnerActivityStatusSchema = z.object({
  snapshot: kangurLearnerActivitySnapshotSchema.nullable(),
  isOnline: z.boolean(),
});
export type KangurLearnerActivityStatus = z.infer<typeof kangurLearnerActivityStatusSchema>;

export const kangurLearnerSessionEntrySchema = z.object({
  id: nonEmptyTrimmedString.max(120),
  startedAt: z.string().datetime({ offset: true }),
  endedAt: z.string().datetime({ offset: true }).nullable(),
  durationSeconds: z.number().int().min(0).nullable(),
});
export type KangurLearnerSessionEntry = z.infer<typeof kangurLearnerSessionEntrySchema>;

export const kangurLearnerSessionHistorySchema = z.object({
  sessions: z.array(kangurLearnerSessionEntrySchema),
  totalSessions: z.number().int().min(0),
  nextOffset: z.number().int().min(0).nullable().optional(),
  hasMore: z.boolean().optional(),
});
export type KangurLearnerSessionHistory = z.infer<typeof kangurLearnerSessionHistorySchema>;

export const kangurLearnerInteractionEntrySchema = activityLogSchema;
export type KangurLearnerInteractionEntry = z.infer<
  typeof kangurLearnerInteractionEntrySchema
>;

export const kangurLearnerInteractionHistorySchema = z.object({
  items: z.array(kangurLearnerInteractionEntrySchema),
  total: z.number().int().min(0),
  limit: z.number().int().min(1),
  offset: z.number().int().min(0),
});
export type KangurLearnerInteractionHistory = z.infer<
  typeof kangurLearnerInteractionHistorySchema
>;

export const kangurRoutePageSchema = z.enum([
  'Game',
  'Lessons',
  'ParentDashboard',
  'LearnerProfile',
  'Duels',
]);
export type KangurRoutePage = z.infer<typeof kangurRoutePageSchema>;

export const kangurRouteActionQuerySchema = z.record(
  z.string().trim().min(1).max(80),
  z.string().trim().max(240)
);
export type KangurRouteActionQuery = z.infer<typeof kangurRouteActionQuerySchema>;

export const kangurRouteActionSchema = z.object({
  label: nonEmptyTrimmedString.max(80),
  page: kangurRoutePageSchema,
  query: kangurRouteActionQuerySchema.optional(),
});
export type KangurRouteAction = z.infer<typeof kangurRouteActionSchema>;

export const kangurLearnerStatusSchema = z.enum(['active', 'disabled']);
export type KangurLearnerStatus = z.infer<typeof kangurLearnerStatusSchema>;

export const kangurLearnerProfileSchema = z.object({
  id: nonEmptyTrimmedString.max(120),
  ownerUserId: nonEmptyTrimmedString.max(120),
  displayName: nonEmptyTrimmedString.max(120),
  age: z.number().int().min(3).max(99).nullable().optional(),
  avatarId: z.string().trim().max(80).nullable().optional(),
  loginName: nonEmptyTrimmedString.max(80),
  status: kangurLearnerStatusSchema,
  legacyUserKey: z.string().trim().max(160).nullable().default(null),
  aiTutor: kangurAiTutorLearnerMoodSchema.default(createDefaultKangurAiTutorLearnerMood()),
  createdAt: z.string().datetime({ offset: true }),
  updatedAt: z.string().datetime({ offset: true }),
});
export type KangurLearnerProfile = z.infer<typeof kangurLearnerProfileSchema>;

export const kangurLearnerProfilesSchema = z.array(kangurLearnerProfileSchema);
export type KangurLearnerProfiles = z.infer<typeof kangurLearnerProfilesSchema>;

export const kangurLearnerCreateInputSchema = z.object({
  displayName: nonEmptyTrimmedString.max(120),
  age: z.number().int().min(3).max(99).optional(),
  loginName: nonEmptyTrimmedString.max(80),
  password: kangurLearnerPasswordSchema,
});
export type KangurLearnerCreateInput = z.infer<typeof kangurLearnerCreateInputSchema>;

export const kangurLearnerUpdateInputSchema = z
  .object({
    displayName: nonEmptyTrimmedString.max(120).optional(),
    age: z.number().int().min(3).max(99).optional(),
    loginName: nonEmptyTrimmedString.max(80).optional(),
    password: kangurLearnerPasswordSchema.optional(),
    status: kangurLearnerStatusSchema.optional(),
    avatarId: z.string().trim().max(80).nullable().optional(),
  })
  .refine(
    (value) =>
      value.displayName !== undefined ||
      value.loginName !== undefined ||
      value.password !== undefined ||
      value.status !== undefined ||
      value.avatarId !== undefined,
    {
      message: 'At least one learner update field is required.',
    }
  );
export type KangurLearnerUpdateInput = z.infer<typeof kangurLearnerUpdateInputSchema>;

export const kangurLearnerSignInInputSchema = z.object({
  loginName: nonEmptyTrimmedString.max(80),
  password: kangurLearnerPasswordSchema,
});
export type KangurLearnerSignInInput = z.infer<typeof kangurLearnerSignInInputSchema>;

export const kangurUserActorTypeSchema = z.enum(['parent', 'learner']);
export type KangurUserActorType = z.infer<typeof kangurUserActorTypeSchema>;

export const kangurUserRoleSchema = z.enum(['admin', 'user']);
export type KangurUserRole = z.infer<typeof kangurUserRoleSchema>;

export const kangurAuthUserSchema = z.object({
  id: nonEmptyTrimmedString.max(120),
  full_name: nonEmptyTrimmedString.max(120),
  email: z.string().trim().email().nullable(),
  role: kangurUserRoleSchema,
  actorType: kangurUserActorTypeSchema,
  canManageLearners: z.boolean(),
  ownerUserId: z.string().trim().max(120).nullable(),
  ownerEmailVerified: z.boolean(),
  activeLearner: kangurLearnerProfileSchema.nullable(),
  learners: kangurLearnerProfilesSchema,
});
export type KangurAuthUser = z.infer<typeof kangurAuthUserSchema>;

const kangurProgressStatePartialSchema = kangurProgressStateSchema.partial();

const mergeUniqueProgressValues = (values: string[]): string[] => Array.from(new Set(values));

export const createDefaultKangurProgressState = (): KangurProgressState => ({
  totalXp: 0,
  gamesPlayed: 0,
  perfectGames: 0,
  lessonsCompleted: 0,
  clockPerfect: 0,
  calendarPerfect: 0,
  geometryPerfect: 0,
  badges: [],
  operationsPlayed: [],
  lessonMastery: {},
  openedTasks: [],
  lessonPanelProgress: {},
  totalCorrectAnswers: 0,
  totalQuestionsAnswered: 0,
  currentWinStreak: 0,
  bestWinStreak: 0,
  dailyQuestsCompleted: 0,
  recommendedSessionsCompleted: 0,
  currentActivityRepeatStreak: 0,
  lastRewardedActivityKey: null,
  activityStats: {},
});

export const normalizeKangurProgressState = (value: unknown): KangurProgressState => {
  const defaults = createDefaultKangurProgressState();

  const parsed = kangurProgressStateSchema.safeParse(value);
  if (parsed.success) {
    return {
      ...defaults,
      ...parsed.data,
      badges: mergeUniqueProgressValues(parsed.data.badges),
      operationsPlayed: mergeUniqueProgressValues(parsed.data.operationsPlayed),
      lessonMastery: normalizeKangurLessonMastery(parsed.data.lessonMastery),
      openedTasks: normalizeKangurProgressTaskOpenList(parsed.data.openedTasks),
      lessonPanelProgress: normalizeKangurLessonPanelProgressStore(
        parsed.data.lessonPanelProgress
      ),
      totalCorrectAnswers: parsed.data.totalCorrectAnswers ?? defaults.totalCorrectAnswers,
      totalQuestionsAnswered:
        parsed.data.totalQuestionsAnswered ?? defaults.totalQuestionsAnswered,
      currentWinStreak: parsed.data.currentWinStreak ?? defaults.currentWinStreak,
      bestWinStreak: parsed.data.bestWinStreak ?? defaults.bestWinStreak,
      dailyQuestsCompleted: parsed.data.dailyQuestsCompleted ?? defaults.dailyQuestsCompleted,
      recommendedSessionsCompleted:
        parsed.data.recommendedSessionsCompleted ?? defaults.recommendedSessionsCompleted,
      currentActivityRepeatStreak:
        parsed.data.currentActivityRepeatStreak ?? defaults.currentActivityRepeatStreak,
      lastRewardedActivityKey:
        parsed.data.lastRewardedActivityKey ?? defaults.lastRewardedActivityKey,
      activityStats: normalizeKangurActivityStats(parsed.data.activityStats),
    };
  }

  const partial = kangurProgressStatePartialSchema.safeParse(value);
  if (!partial.success) {
    return createDefaultKangurProgressState();
  }

  return {
    ...defaults,
    ...partial.data,
    badges: mergeUniqueProgressValues(partial.data.badges ?? defaults.badges),
    operationsPlayed: mergeUniqueProgressValues(
      partial.data.operationsPlayed ?? defaults.operationsPlayed
    ),
    lessonMastery: normalizeKangurLessonMastery(partial.data.lessonMastery),
    openedTasks: normalizeKangurProgressTaskOpenList(
      partial.data.openedTasks ?? defaults.openedTasks
    ),
    lessonPanelProgress: normalizeKangurLessonPanelProgressStore(
      partial.data.lessonPanelProgress ?? defaults.lessonPanelProgress
    ),
    totalCorrectAnswers: partial.data.totalCorrectAnswers ?? defaults.totalCorrectAnswers,
    totalQuestionsAnswered:
      partial.data.totalQuestionsAnswered ?? defaults.totalQuestionsAnswered,
    currentWinStreak: partial.data.currentWinStreak ?? defaults.currentWinStreak,
    bestWinStreak: partial.data.bestWinStreak ?? defaults.bestWinStreak,
    dailyQuestsCompleted: partial.data.dailyQuestsCompleted ?? defaults.dailyQuestsCompleted,
    recommendedSessionsCompleted:
      partial.data.recommendedSessionsCompleted ?? defaults.recommendedSessionsCompleted,
    currentActivityRepeatStreak:
      partial.data.currentActivityRepeatStreak ?? defaults.currentActivityRepeatStreak,
    lastRewardedActivityKey:
      partial.data.lastRewardedActivityKey ?? defaults.lastRewardedActivityKey,
    activityStats: normalizeKangurActivityStats(partial.data.activityStats),
  };
};

export const kangurScoreSortFieldSchema = z.enum([
  'created_date',
  'score',
  'time_taken',
  'correct_answers',
  'total_questions',
  'player_name',
  'operation',
]);
export type KangurScoreSortField = z.infer<typeof kangurScoreSortFieldSchema>;

export const kangurScoreSortSchema = z
  .string()
  .trim()
  .regex(/^-?[a-z_]+$/)
  .default('-created_date');
export type KangurScoreSort = z.infer<typeof kangurScoreSortSchema>;

export const kangurScoreLimitSchema = z.number().int().min(1).max(500).default(100);
export type KangurScoreLimit = z.infer<typeof kangurScoreLimitSchema>;

const isEnglishScoreOperation = (operation: string): boolean =>
  operation.trim().toLowerCase().startsWith('english_');
const isAlphabetScoreOperation = (operation: string): boolean =>
  operation.trim().toLowerCase().startsWith('alphabet_');

export const resolveKangurScoreSubject = (input: {
  operation: string;
  subject?: KangurLessonSubject | null;
}): KangurLessonSubject => {
  if (isEnglishScoreOperation(input.operation)) {
    return 'english';
  }
  if (isAlphabetScoreOperation(input.operation)) {
    return 'alphabet';
  }
  return input.subject ?? 'maths';
};

export const kangurScoreSchema = z.object({
  id: nonEmptyTrimmedString,
  player_name: nonEmptyTrimmedString.max(80),
  score: z.number().int().min(0).max(10_000),
  operation: nonEmptyTrimmedString.max(64),
  subject: kangurLessonSubjectSchema.default('maths'),
  total_questions: z.number().int().min(1).max(10_000),
  correct_answers: z.number().int().min(0).max(10_000),
  time_taken: z.number().int().min(0).max(86_400),
  xp_earned: z.number().int().min(0).max(100_000).nullable().optional(),
  created_date: z.string().datetime({ offset: true }),
  client_mutation_id: z.string().trim().max(120).nullable().optional(),
  created_by: z.string().trim().nullable().optional(),
  learner_id: z.string().trim().max(120).nullable().optional(),
  owner_user_id: z.string().trim().max(120).nullable().optional(),
});
export type KangurScore = z.infer<typeof kangurScoreSchema>;

export const kangurScoreCreateInputSchema = kangurScoreSchema.omit({
  id: true,
  created_date: true,
  created_by: true,
});
export type KangurScoreCreateInput = z.infer<typeof kangurScoreCreateInputSchema>;

export const kangurScoreRepositoryCreateInputSchema = kangurScoreCreateInputSchema.extend({
  created_by: z.string().trim().nullable().optional(),
  learner_id: z.string().trim().max(120).nullable().optional(),
  owner_user_id: z.string().trim().max(120).nullable().optional(),
});
export type KangurScoreRepositoryCreateInput = z.infer<
  typeof kangurScoreRepositoryCreateInputSchema
>;

export const kangurScoreFiltersSchema = z.object({
  player_name: z.string().trim().min(1).optional(),
  operation: z.string().trim().min(1).optional(),
  subject: kangurLessonSubjectSchema.optional(),
  created_by: z.string().trim().min(1).optional(),
  learner_id: z.string().trim().min(1).optional(),
});
export type KangurScoreFilters = z.infer<typeof kangurScoreFiltersSchema>;

export const kangurScoreListQuerySchema = z.object({
  sort: kangurScoreSortSchema.optional(),
  limit: kangurScoreLimitSchema.optional(),
  player_name: kangurScoreFiltersSchema.shape.player_name,
  operation: kangurScoreFiltersSchema.shape.operation,
  subject: kangurScoreFiltersSchema.shape.subject,
  created_by: kangurScoreFiltersSchema.shape.created_by,
  learner_id: kangurScoreFiltersSchema.shape.learner_id,
});
export type KangurScoreListQuery = z.infer<typeof kangurScoreListQuerySchema>;

export const kangurAssignmentPrioritySchema = z.enum(['high', 'medium', 'low']);
export type KangurAssignmentPriority = z.infer<typeof kangurAssignmentPrioritySchema>;

export const kangurPracticeAssignmentOperationSchema = z.enum([
  'addition',
  'subtraction',
  'multiplication',
  'division',
  'decimals',
  'powers',
  'roots',
  'clock',
  'mixed',
]);
export type KangurPracticeAssignmentOperation = z.infer<
  typeof kangurPracticeAssignmentOperationSchema
>;

const kangurAssignmentIsoDateSchema = z.string().datetime({ offset: true });
const kangurAssignmentTimeLimitMinutesSchema = z.number().int().min(1).max(240).nullable();

export const kangurAssignmentCreateLessonTargetSchema = z.object({
  type: z.literal('lesson'),
  lessonComponentId: kangurLessonComponentIdSchema,
  requiredCompletions: z.number().int().min(1).max(20).default(1),
});
export type KangurAssignmentCreateLessonTarget = z.infer<
  typeof kangurAssignmentCreateLessonTargetSchema
>;

export const kangurAssignmentLessonTargetSchema = kangurAssignmentCreateLessonTargetSchema.extend({
  baselineCompletions: kangurProgressCounterSchema,
});
export type KangurAssignmentLessonTarget = z.infer<typeof kangurAssignmentLessonTargetSchema>;

export const kangurAssignmentCreatePracticeTargetSchema = z.object({
  type: z.literal('practice'),
  operation: kangurPracticeAssignmentOperationSchema,
  requiredAttempts: z.number().int().min(1).max(20).default(1),
  minAccuracyPercent: kangurLessonMasteryPercentSchema.nullable().default(null),
});
export type KangurAssignmentCreatePracticeTarget = z.infer<
  typeof kangurAssignmentCreatePracticeTargetSchema
>;

export const kangurAssignmentPracticeTargetSchema = kangurAssignmentCreatePracticeTargetSchema;
export type KangurAssignmentPracticeTarget = z.infer<typeof kangurAssignmentPracticeTargetSchema>;

export const kangurAssignmentCreateTargetSchema = z.discriminatedUnion('type', [
  kangurAssignmentCreateLessonTargetSchema,
  kangurAssignmentCreatePracticeTargetSchema,
]);
export type KangurAssignmentCreateTarget = z.infer<typeof kangurAssignmentCreateTargetSchema>;

export const kangurAssignmentTargetSchema = z.discriminatedUnion('type', [
  kangurAssignmentLessonTargetSchema,
  kangurAssignmentPracticeTargetSchema,
]);
export type KangurAssignmentTarget = z.infer<typeof kangurAssignmentTargetSchema>;

export const kangurAssignmentSchema = z.object({
  id: nonEmptyTrimmedString.max(120),
  learnerKey: nonEmptyTrimmedString.max(160),
  title: nonEmptyTrimmedString.max(160),
  description: nonEmptyTrimmedString.max(320),
  priority: kangurAssignmentPrioritySchema,
  archived: z.boolean().default(false),
  timeLimitMinutes: kangurAssignmentTimeLimitMinutesSchema.optional(),
  timeLimitStartsAt: kangurAssignmentIsoDateSchema.nullable().optional(),
  target: kangurAssignmentTargetSchema,
  assignedByName: z.string().trim().max(120).nullable().default(null),
  assignedByEmail: z.string().trim().max(160).nullable().default(null),
  createdAt: kangurAssignmentIsoDateSchema,
  updatedAt: kangurAssignmentIsoDateSchema,
});
export type KangurAssignment = z.infer<typeof kangurAssignmentSchema>;

export const kangurAssignmentsSchema = z.array(kangurAssignmentSchema);
export type KangurAssignments = z.infer<typeof kangurAssignmentsSchema>;

export const kangurAssignmentProgressStatusSchema = z.enum([
  'not_started',
  'in_progress',
  'completed',
]);
export type KangurAssignmentProgressStatus = z.infer<typeof kangurAssignmentProgressStatusSchema>;

export const kangurAssignmentProgressSchema = z.object({
  status: kangurAssignmentProgressStatusSchema,
  percent: z.number().int().min(0).max(100),
  summary: nonEmptyTrimmedString.max(240),
  attemptsCompleted: kangurProgressCounterSchema,
  attemptsRequired: z.number().int().min(1).max(100),
  lastActivityAt: kangurAssignmentIsoDateSchema.nullable(),
  completedAt: kangurAssignmentIsoDateSchema.nullable(),
});
export type KangurAssignmentProgress = z.infer<typeof kangurAssignmentProgressSchema>;

export const kangurAssignmentSnapshotSchema = kangurAssignmentSchema.extend({
  progress: kangurAssignmentProgressSchema,
});
export type KangurAssignmentSnapshot = z.infer<typeof kangurAssignmentSnapshotSchema>;

export const kangurAssignmentCreateInputSchema = z.object({
  title: nonEmptyTrimmedString.max(160),
  description: nonEmptyTrimmedString.max(320),
  priority: kangurAssignmentPrioritySchema,
  timeLimitMinutes: kangurAssignmentTimeLimitMinutesSchema.optional(),
  target: kangurAssignmentCreateTargetSchema,
});
export type KangurAssignmentCreateInput = z.infer<typeof kangurAssignmentCreateInputSchema>;

export const kangurAssignmentRepositoryCreateInputSchema = kangurAssignmentCreateInputSchema.extend(
  {
    learnerKey: nonEmptyTrimmedString.max(160),
    target: kangurAssignmentTargetSchema,
    assignedByName: z.string().trim().max(120).nullable().optional(),
    assignedByEmail: z.string().trim().max(160).nullable().optional(),
    archived: z.boolean().optional(),
  }
);
export type KangurAssignmentRepositoryCreateInput = z.infer<
  typeof kangurAssignmentRepositoryCreateInputSchema
>;

export const kangurAssignmentUpdateInputSchema = z
  .object({
    archived: z.boolean().optional(),
    priority: kangurAssignmentPrioritySchema.optional(),
    timeLimitMinutes: kangurAssignmentTimeLimitMinutesSchema.optional(),
  })
  .refine(
    (value) =>
      value.archived !== undefined ||
      value.priority !== undefined ||
      value.timeLimitMinutes !== undefined,
    {
      message: 'At least one assignment update field is required.',
    }
  );
export type KangurAssignmentUpdateInput = z.infer<typeof kangurAssignmentUpdateInputSchema>;

export const kangurAssignmentListQuerySchema = z.object({
  includeArchived: z.boolean().default(false),
});
export type KangurAssignmentListQuery = z.infer<typeof kangurAssignmentListQuerySchema>;
