import {
  KANGUR_TTS_DEFAULT_VOICE,
  KANGUR_TTS_VOICE_OPTIONS,
  type KangurLessonTtsVoice,
} from '@/features/kangur/tts/contracts';
import {
  DEFAULT_KANGUR_AGE_GROUP,
  DEFAULT_KANGUR_SUBJECT,
  KANGUR_LESSON_COMPONENT_ORDER,
  KANGUR_LESSON_LIBRARY,
} from '@/features/kangur/lessons/lesson-catalog';
import type { KangurLessonTemplate } from '@/features/kangur/lessons/lesson-types';
import type { LabeledOptionDto, LabeledOptionWithDescriptionDto } from '@/shared/contracts/base';
import {
  KANGUR_LESSONS_SETTING_KEY,
  KANGUR_LESSON_DOCUMENTS_SETTING_KEY,
  kangurLessonAgeGroupSchema,
  kangurLessonContentModeSchema,
  kangurLessonComponentIdSchema,
  kangurLessonSubjectSchema,
  type KangurLesson,
  type KangurLessonAgeGroup,
  type KangurLessonComponentId,
  type KangurLessonContentMode,
  type KangurLessonSubject,
} from '@/features/kangur/shared/contracts/kangur';
import { parseJsonSetting } from '@/features/kangur/utils/settings-json';

export { KANGUR_LESSONS_SETTING_KEY, KANGUR_LESSON_DOCUMENTS_SETTING_KEY };
export { KANGUR_LESSON_COMPONENT_ORDER, KANGUR_LESSON_LIBRARY };
export * from './help-settings';

export const KANGUR_LESSON_SORT_ORDER_GAP = 1000;
export const KANGUR_NARRATOR_SETTINGS_KEY = 'kangur_narrator_settings_v1';
export const KANGUR_PARENT_VERIFICATION_SETTINGS_KEY = 'kangur_parent_verification_email_settings_v1';
export const KANGUR_PARENT_VERIFICATION_DEFAULT_RESEND_COOLDOWN_SECONDS = 60;
export const KANGUR_PARENT_VERIFICATION_DEFAULT_RESEND_COOLDOWN_MS =
  KANGUR_PARENT_VERIFICATION_DEFAULT_RESEND_COOLDOWN_SECONDS * 1000;
export const KANGUR_PARENT_VERIFICATION_DEFAULT_NOTIFICATIONS_ENABLED = true;
export const KANGUR_PARENT_VERIFICATION_DEFAULT_REQUIRE_EMAIL_VERIFICATION = true;
export const KANGUR_PARENT_VERIFICATION_DEFAULT_REQUIRE_CAPTCHA = true;

export type KangurNarratorEngine = 'server' | 'client';
export type KangurParentVerificationEmailSettings = {
  resendCooldownSeconds: number;
  notificationsEnabled: boolean;
  notificationsDisabledUntil: string | null;
  requireEmailVerification: boolean;
  requireCaptcha: boolean;
};

export type KangurNarratorSettings = {
  engine: KangurNarratorEngine;
  voice: KangurLessonTtsVoice;
};

export const KANGUR_NARRATOR_ENGINE_OPTIONS = [
  {
    value: 'server',
    label: 'Server narrator',
    description: 'Use the cached neural narration generated on the server.',
  },
  {
    value: 'client',
    label: 'Client narrator',
    description: 'Use the browser speech engine on each learner device.',
  },
] as const satisfies ReadonlyArray<LabeledOptionWithDescriptionDto<KangurNarratorEngine>>;

export const KANGUR_PARENT_VERIFICATION_RESEND_COOLDOWN_SECONDS_MIN = 1;
export const KANGUR_PARENT_VERIFICATION_RESEND_COOLDOWN_SECONDS_MAX = 3600;
const KANGUR_PARENT_VERIFICATION_COOLDOWN_FALLBACK_SECONDS =
  KANGUR_PARENT_VERIFICATION_DEFAULT_RESEND_COOLDOWN_SECONDS;

export const KANGUR_GEOMETRY_LESSON_COMPONENT_IDS = [
  'geometry_basics',
  'geometry_shapes',
  'geometry_symmetry',
  'geometry_perimeter',
] as const satisfies readonly KangurLessonComponentId[];

const KANGUR_LEGACY_COMPONENT_ID_BY_ID: Record<string, KangurLessonComponentId> = {
  alphabet_basics: 'alphabet_basics',
  alphabet_copy: 'alphabet_copy',
  alphabet_syllables: 'alphabet_syllables',
  alphabet_words: 'alphabet_words',
  alphabet_matching: 'alphabet_matching',
  alphabet_sequence: 'alphabet_sequence',
  clock: 'clock',
  calendar: 'calendar',
  adding: 'adding',
  subtracting: 'subtracting',
  multiplication: 'multiplication',
  division: 'division',
  geometry_basics: 'geometry_basics',
  geometry_shapes: 'geometry_shapes',
  geometry_symmetry: 'geometry_symmetry',
  geometry_perimeter: 'geometry_perimeter',
  logical_thinking: 'logical_thinking',
  logical_patterns: 'logical_patterns',
  logical_classification: 'logical_classification',
  logical_reasoning: 'logical_reasoning',
  logical_analogies: 'logical_analogies',
  english_basics: 'english_basics',
  english_parts_of_speech: 'english_parts_of_speech',
  english_sentence_structure: 'english_sentence_structure',
  english_subject_verb_agreement: 'english_subject_verb_agreement',
  english_articles: 'english_articles',
  english_prepositions_time_place: 'english_prepositions_time_place',
  webdev_react_components: 'webdev_react_components',
};

export const KANGUR_LESSON_COMPONENT_OPTIONS: Array<
  LabeledOptionDto<KangurLessonComponentId>
> = KANGUR_LESSON_COMPONENT_ORDER.reduce<LabeledOptionDto<KangurLessonComponentId>[]>(
  (acc, componentId) => {
    const lesson = KANGUR_LESSON_LIBRARY[componentId];
    if (!lesson) {
      return acc;
    }
    acc.push({
      value: componentId,
      label: lesson.label,
    });
    return acc;
  },
  []
);

export type KangurLessonDraft = Pick<
  KangurLesson,
  | 'componentId'
  | 'contentMode'
  | 'subject'
  | 'ageGroup'
  | 'title'
  | 'description'
  | 'emoji'
  | 'color'
  | 'activeBg'
  | 'enabled'
>;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const normalizeText = (value: unknown, fallback: string, maxLength: number): string => {
  if (typeof value !== 'string') return fallback;
  const trimmed = value.trim();
  if (!trimmed) return fallback;
  return trimmed.slice(0, maxLength);
};

const normalizeSortOrder = (value: unknown, fallback: number): number => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.max(0, Math.floor(value));
};

const resolveKangurParentVerificationResendCooldownSeconds = (
  value: unknown,
  fallback: number
): number => {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return fallback;
  }
  const rounded = Math.floor(value);
  if (!Number.isFinite(rounded)) {
    return fallback;
  }

  return Math.min(
    Math.max(rounded, KANGUR_PARENT_VERIFICATION_RESEND_COOLDOWN_SECONDS_MIN),
    KANGUR_PARENT_VERIFICATION_RESEND_COOLDOWN_SECONDS_MAX
  );
};

const resolveKangurParentVerificationNotificationsEnabled = (
  value: unknown,
  fallback: boolean
): boolean => (typeof value === 'boolean' ? value : fallback);

const resolveKangurParentVerificationRequireEmailVerification = (
  value: unknown,
  fallback: boolean
): boolean => (typeof value === 'boolean' ? value : fallback);

const resolveKangurParentVerificationRequireCaptcha = (
  value: unknown,
  fallback: boolean
): boolean => (typeof value === 'boolean' ? value : fallback);

const resolveKangurParentVerificationNotificationsDisabledUntil = (
  value: unknown
): string | null => {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const parsed = new Date(trimmed);
    if (Number.isNaN(parsed.getTime())) return null;
    return parsed.toISOString();
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return null;
    return parsed.toISOString();
  }

  if (value instanceof Date && Number.isFinite(value.getTime())) {
    return value.toISOString();
  }

  return null;
};

const resolveKangurLessonComponentId = (value: unknown): KangurLessonComponentId | null => {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().toLowerCase();
  const parsed = kangurLessonComponentIdSchema.safeParse(normalized);
  if (parsed.success) return parsed.data;
  return KANGUR_LEGACY_COMPONENT_ID_BY_ID[normalized] ?? null;
};

const resolveKangurLessonContentMode = (value: unknown): KangurLessonContentMode => {
  if (typeof value !== 'string') return 'component';
  const parsed = kangurLessonContentModeSchema.safeParse(value.trim().toLowerCase());
  return parsed.success ? parsed.data : 'component';
};

const resolveKangurLessonSubject = (
  value: unknown,
  fallback: KangurLessonSubject
): KangurLessonSubject => {
  if (typeof value !== 'string') return fallback;
  const parsed = kangurLessonSubjectSchema.safeParse(value.trim().toLowerCase());
  return parsed.success ? parsed.data : fallback;
};

const resolveKangurLessonAgeGroup = (
  value: unknown,
  fallback: KangurLessonAgeGroup
): KangurLessonAgeGroup => {
  if (typeof value !== 'string') return fallback;
  const parsed = kangurLessonAgeGroupSchema.safeParse(value.trim().toLowerCase());
  return parsed.success ? parsed.data : fallback;
};

const resolveKangurLessonTemplateSubject = (template: KangurLessonTemplate): KangurLessonSubject =>
  template.subject ?? DEFAULT_KANGUR_SUBJECT;

const resolveKangurLessonTemplateAgeGroup = (
  template: KangurLessonTemplate
): KangurLessonAgeGroup => template.ageGroup ?? DEFAULT_KANGUR_AGE_GROUP;

const resolveKangurNarratorEngine = (value: unknown): KangurNarratorEngine => {
  if (typeof value !== 'string') return 'server';
  return value.trim().toLowerCase() === 'client' ? 'client' : 'server';
};

const resolveKangurNarratorVoice = (value: unknown): KangurLessonTtsVoice => {
  if (typeof value !== 'string' || !value.trim()) {
    return KANGUR_TTS_DEFAULT_VOICE;
  }
  const normalized = value.trim().toLowerCase() as KangurLessonTtsVoice;
  const supportedValues = KANGUR_TTS_VOICE_OPTIONS.map((option) => option.value);
  return supportedValues.includes(normalized) ? normalized : KANGUR_TTS_DEFAULT_VOICE;
};

const ensureUniqueLessonId = (requestedId: string, usedIds: Set<string>): string => {
  let nextId = requestedId;
  let suffix = 1;
  while (usedIds.has(nextId)) {
    suffix += 1;
    nextId = `${requestedId}-${suffix}`;
  }
  usedIds.add(nextId);
  return nextId;
};

const shouldPreferNormalizedKangurLesson = (
  candidate: KangurLesson,
  candidateIndex: number,
  current: KangurLesson,
  currentIndex: number
): boolean => {
  if (candidate.enabled !== current.enabled) {
    return candidate.enabled;
  }

  if (candidate.sortOrder !== current.sortOrder) {
    return candidate.sortOrder < current.sortOrder;
  }

  return candidateIndex < currentIndex;
};

export const createKangurLessonId = (seed?: string): string => {
  const normalizedSeed =
    (seed ?? 'lesson')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+/, '')
      .replace(/-+$/, '') || 'lesson';

  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `kangur-lesson-${normalizedSeed}-${crypto.randomUUID()}`;
  }

  return `kangur-lesson-${normalizedSeed}-${Math.random().toString(36).slice(2, 10)}`;
};

export const getKangurLessonTemplate = (
  componentId: KangurLessonComponentId
): KangurLessonTemplate => KANGUR_LESSON_LIBRARY[componentId];

export const createKangurLessonDraft = (
  componentId: KangurLessonComponentId = 'clock'
): KangurLessonDraft => {
  const template = getKangurLessonTemplate(componentId);
  return {
    componentId,
    contentMode: 'component',
    subject: resolveKangurLessonTemplateSubject(template),
    ageGroup: resolveKangurLessonTemplateAgeGroup(template),
    title: template.title,
    description: template.description,
    emoji: template.emoji,
    color: template.color,
    activeBg: template.activeBg,
    enabled: true,
  };
};

export const createDefaultKangurLessons = (): KangurLesson[] =>
  KANGUR_LESSON_COMPONENT_ORDER.map((componentId, index) => {
    const template = getKangurLessonTemplate(componentId);
    const ageGroup = resolveKangurLessonTemplateAgeGroup(template);
    return {
      id: `kangur-lesson-${componentId}`,
      componentId,
      contentMode: 'component',
      subject: resolveKangurLessonTemplateSubject(template),
      ageGroup,
      title: template.title,
      description: template.description,
      emoji: template.emoji,
      color: template.color,
      activeBg: template.activeBg,
      sortOrder: (index + 1) * KANGUR_LESSON_SORT_ORDER_GAP,
      enabled: true,
    };
  });

export const createDefaultKangurNarratorSettings = (): KangurNarratorSettings => ({
  engine: 'server',
  voice: KANGUR_TTS_DEFAULT_VOICE,
});

export const normalizeKangurNarratorSettings = (value: unknown): KangurNarratorSettings => {
  if (!isRecord(value)) {
    return createDefaultKangurNarratorSettings();
  }

  return {
    engine: resolveKangurNarratorEngine(value['engine']),
    voice: resolveKangurNarratorVoice(value['voice']),
  };
};

export const createDefaultKangurParentVerificationEmailSettings = (): KangurParentVerificationEmailSettings => ({
  resendCooldownSeconds: KANGUR_PARENT_VERIFICATION_COOLDOWN_FALLBACK_SECONDS,
  notificationsEnabled: KANGUR_PARENT_VERIFICATION_DEFAULT_NOTIFICATIONS_ENABLED,
  notificationsDisabledUntil: null,
  requireEmailVerification: KANGUR_PARENT_VERIFICATION_DEFAULT_REQUIRE_EMAIL_VERIFICATION,
  requireCaptcha: KANGUR_PARENT_VERIFICATION_DEFAULT_REQUIRE_CAPTCHA,
});

export const normalizeKangurParentVerificationEmailSettings = (
  value: unknown
): KangurParentVerificationEmailSettings => {
  if (!isRecord(value)) {
    return createDefaultKangurParentVerificationEmailSettings();
  }

  const notificationsEnabled = resolveKangurParentVerificationNotificationsEnabled(
    value['notificationsEnabled'],
    KANGUR_PARENT_VERIFICATION_DEFAULT_NOTIFICATIONS_ENABLED
  );

  return {
    resendCooldownSeconds: resolveKangurParentVerificationResendCooldownSeconds(
      value['resendCooldownSeconds'],
      KANGUR_PARENT_VERIFICATION_COOLDOWN_FALLBACK_SECONDS
    ),
    notificationsEnabled,
    notificationsDisabledUntil: resolveKangurParentVerificationNotificationsDisabledUntil(
      value['notificationsDisabledUntil']
    ),
    requireEmailVerification: resolveKangurParentVerificationRequireEmailVerification(
      value['requireEmailVerification'],
      notificationsEnabled
    ),
    requireCaptcha: resolveKangurParentVerificationRequireCaptcha(
      value['requireCaptcha'],
      KANGUR_PARENT_VERIFICATION_DEFAULT_REQUIRE_CAPTCHA
    ),
  };
};

export const isKangurParentVerificationNotificationsSuppressed = (
  settings: KangurParentVerificationEmailSettings,
  now: number = Date.now()
): boolean => {
  if (!settings.notificationsEnabled) {
    return true;
  }
  if (!settings.notificationsDisabledUntil) {
    return false;
  }
  const untilMs = Date.parse(settings.notificationsDisabledUntil);
  return Number.isFinite(untilMs) && untilMs > now;
};

export const normalizeKangurLessons = (value: unknown): KangurLesson[] => {
  if (!Array.isArray(value)) {
    return createDefaultKangurLessons();
  }

  const usedIds = new Set<string>();
  const normalized = value
    .map((entry, index): KangurLesson | null => {
      if (!isRecord(entry)) return null;

      const componentId =
        resolveKangurLessonComponentId(entry['componentId']) ??
        resolveKangurLessonComponentId(entry['id']);
      if (!componentId) return null;

      const template = getKangurLessonTemplate(componentId);
      const requestedId = normalizeText(entry['id'], `kangur-lesson-${componentId}`, 120);
      const lessonId = ensureUniqueLessonId(requestedId, usedIds);

      return {
        id: lessonId,
        componentId,
        contentMode: resolveKangurLessonContentMode(entry['contentMode']),
        subject: resolveKangurLessonSubject(
          entry['subject'],
          resolveKangurLessonTemplateSubject(template)
        ),
        ageGroup: resolveKangurLessonAgeGroup(
          entry['ageGroup'],
          resolveKangurLessonTemplateAgeGroup(template)
        ),
        title: normalizeText(entry['title'], template.title, 120),
        description: normalizeText(entry['description'], template.description, 240),
        emoji: normalizeText(entry['emoji'], template.emoji, 12),
        color: normalizeText(entry['color'], template.color, 80),
        activeBg: normalizeText(entry['activeBg'], template.activeBg, 80),
        sortOrder: normalizeSortOrder(
          entry['sortOrder'],
          (index + 1) * KANGUR_LESSON_SORT_ORDER_GAP
        ),
        enabled: entry['enabled'] !== false,
      };
    })
    .filter((entry): entry is KangurLesson => Boolean(entry));

  if (normalized.length === 0) {
    return createDefaultKangurLessons();
  }

  const dedupedByComponent = new Map<string, { index: number; lesson: KangurLesson }>();

  normalized.forEach((lesson, index) => {
    const dedupeKey = `${lesson.componentId}:${lesson.ageGroup}`;
    const existing = dedupedByComponent.get(dedupeKey);
    if (!existing) {
      dedupedByComponent.set(dedupeKey, { index, lesson });
      return;
    }

    if (shouldPreferNormalizedKangurLesson(lesson, index, existing.lesson, existing.index)) {
      dedupedByComponent.set(dedupeKey, { index, lesson });
    }
  });

  const dedupedLessons = Array.from(dedupedByComponent.values()).map((entry) => entry.lesson);

  return dedupedLessons
    .sort((left, right) => {
      const orderDelta = left.sortOrder - right.sortOrder;
      if (orderDelta !== 0) return orderDelta;
      return left.id.localeCompare(right.id);
    })
    .map((lesson, index) => ({
      ...lesson,
      sortOrder: (index + 1) * KANGUR_LESSON_SORT_ORDER_GAP,
    }));
};

export const canonicalizeKangurLessons = (lessons: KangurLesson[]): KangurLesson[] =>
  normalizeKangurLessons(lessons);

export const parseKangurLessons = (raw: string | null | undefined): KangurLesson[] =>
  normalizeKangurLessons(parseJsonSetting<unknown>(raw, createDefaultKangurLessons()));

export const parseKangurNarratorSettings = (
  raw: string | null | undefined
): KangurNarratorSettings =>
  normalizeKangurNarratorSettings(
    parseJsonSetting<unknown>(raw, createDefaultKangurNarratorSettings())
  );

export const parseKangurParentVerificationEmailSettings = (
  raw: string | null | undefined
): KangurParentVerificationEmailSettings =>
  normalizeKangurParentVerificationEmailSettings(
    parseJsonSetting<unknown>(raw, createDefaultKangurParentVerificationEmailSettings())
  );

const ensureUniqueAppendedLessonId = (baseId: string, usedIds: Set<string>): string => {
  let nextId = baseId;
  let suffix = 1;
  while (usedIds.has(nextId)) {
    suffix += 1;
    nextId = `${baseId}-${suffix}`;
  }
  usedIds.add(nextId);
  return nextId;
};

export type AppendMissingKangurLessonsResult = {
  lessons: KangurLesson[];
  addedCount: number;
};

const resolveAgeGroupsForComponents = (
  componentIds: readonly KangurLessonComponentId[]
): KangurLessonAgeGroup[] => {
  const groups = new Set<KangurLessonAgeGroup>();
  for (const componentId of componentIds) {
    const template = getKangurLessonTemplate(componentId);
    groups.add(resolveKangurLessonTemplateAgeGroup(template));
  }
  return Array.from(groups);
};

export const appendMissingKangurLessonsByComponent = (
  lessons: KangurLesson[],
  componentIds: readonly KangurLessonComponentId[],
  ageGroups: readonly KangurLessonAgeGroup[] = [DEFAULT_KANGUR_AGE_GROUP]
): AppendMissingKangurLessonsResult => {
  const existingLessonKeys = new Set(
    lessons.map(
      (lesson) => `${lesson.componentId}:${lesson.ageGroup ?? DEFAULT_KANGUR_AGE_GROUP}`
    )
  );
  const usedIds = new Set(lessons.map((lesson) => lesson.id));
  let nextSortOrder =
    lessons.reduce((maxSortOrder, lesson) => Math.max(maxSortOrder, lesson.sortOrder), 0) +
    KANGUR_LESSON_SORT_ORDER_GAP;

  const additions: KangurLesson[] = [];

  for (const ageGroup of ageGroups) {
    for (const componentId of componentIds) {
      const lessonKey = `${componentId}:${ageGroup}`;
      if (existingLessonKeys.has(lessonKey)) continue;
      const template = getKangurLessonTemplate(componentId);
      const baseId =
        ageGroup === DEFAULT_KANGUR_AGE_GROUP
          ? `kangur-lesson-${componentId}`
          : `kangur-lesson-${componentId}-${ageGroup}`;
      const lessonId = ensureUniqueAppendedLessonId(baseId, usedIds);
      additions.push({
        id: lessonId,
        componentId,
        contentMode: 'component',
        subject: resolveKangurLessonTemplateSubject(template),
        ageGroup,
        title: template.title,
        description: template.description,
        emoji: template.emoji,
        color: template.color,
        activeBg: template.activeBg,
        enabled: ageGroup === DEFAULT_KANGUR_AGE_GROUP,
        sortOrder: nextSortOrder,
      });
      existingLessonKeys.add(lessonKey);
      nextSortOrder += KANGUR_LESSON_SORT_ORDER_GAP;
    }
  }

  if (additions.length === 0) {
    return {
      lessons: canonicalizeKangurLessons(lessons),
      addedCount: 0,
    };
  }

  return {
    lessons: canonicalizeKangurLessons([...lessons, ...additions]),
    addedCount: additions.length,
  };
};

export const appendMissingGeometryKangurLessons = (
  lessons: KangurLesson[]
): AppendMissingKangurLessonsResult =>
  appendMissingKangurLessonsByComponent(
    lessons,
    KANGUR_GEOMETRY_LESSON_COMPONENT_IDS,
    resolveAgeGroupsForComponents(KANGUR_GEOMETRY_LESSON_COMPONENT_IDS)
  );

export const KANGUR_LOGICAL_THINKING_LESSON_COMPONENT_IDS = [
  'logical_thinking',
  'logical_patterns',
  'logical_classification',
  'logical_reasoning',
  'logical_analogies',
] as const satisfies readonly KangurLessonComponentId[];

export const appendMissingLogicalThinkingKangurLessons = (
  lessons: KangurLesson[]
): AppendMissingKangurLessonsResult =>
  appendMissingKangurLessonsByComponent(
    lessons,
    KANGUR_LOGICAL_THINKING_LESSON_COMPONENT_IDS,
    resolveAgeGroupsForComponents(KANGUR_LOGICAL_THINKING_LESSON_COMPONENT_IDS)
  );
