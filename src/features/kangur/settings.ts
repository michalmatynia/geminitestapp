import {
  KANGUR_LESSONS_SETTING_KEY,
  KANGUR_LESSON_DOCUMENTS_SETTING_KEY,
  kangurLessonContentModeSchema,
  kangurLessonComponentIdSchema,
  type KangurLesson,
  type KangurLessonComponentId,
  type KangurLessonContentMode,
} from '@/shared/contracts/kangur';
import {
  KANGUR_TTS_DEFAULT_VOICE,
  KANGUR_TTS_VOICE_OPTIONS,
  type KangurLessonTtsVoice,
} from '@/features/kangur/tts/contracts';
import { parseJsonSetting } from '@/shared/utils/settings-json';

export { KANGUR_LESSONS_SETTING_KEY, KANGUR_LESSON_DOCUMENTS_SETTING_KEY };
export * from './help-settings';

export const KANGUR_LESSON_SORT_ORDER_GAP = 1000;
export const KANGUR_NARRATOR_SETTINGS_KEY = 'kangur_narrator_settings_v1';

export type KangurNarratorEngine = 'server' | 'client';

export type KangurNarratorSettings = {
  engine: KangurNarratorEngine;
  voice: KangurLessonTtsVoice;
};

export const KANGUR_NARRATOR_ENGINE_OPTIONS: ReadonlyArray<{
  value: KangurNarratorEngine;
  label: string;
  description: string;
}> = [
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
] as const;

type KangurLessonTemplate = {
  componentId: KangurLessonComponentId;
  label: string;
  title: string;
  description: string;
  emoji: string;
  color: string;
  activeBg: string;
};

const KANGUR_LESSON_COMPONENT_ORDER: readonly KangurLessonComponentId[] = [
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
] as const;

export const KANGUR_GEOMETRY_LESSON_COMPONENT_IDS = [
  'geometry_basics',
  'geometry_shapes',
  'geometry_symmetry',
  'geometry_perimeter',
] as const satisfies readonly KangurLessonComponentId[];

const KANGUR_LEGACY_COMPONENT_ID_BY_ID: Record<string, KangurLessonComponentId> = {
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
};

export const KANGUR_LESSON_LIBRARY: Record<KangurLessonComponentId, KangurLessonTemplate> = {
  clock: {
    componentId: 'clock',
    label: 'Clock Lesson',
    title: 'Nauka zegara',
    description: 'Odczytuj godziny z zegara analogowego',
    emoji: '🕐',
    color: 'from-indigo-400 to-purple-500',
    activeBg: 'bg-indigo-500',
  },
  calendar: {
    componentId: 'calendar',
    label: 'Calendar Lesson',
    title: 'Nauka kalendarza',
    description: 'Dni, miesiące, daty i pory roku',
    emoji: '📅',
    color: 'from-green-400 to-teal-500',
    activeBg: 'bg-green-500',
  },
  adding: {
    componentId: 'adding',
    label: 'Adding Lesson',
    title: 'Dodawanie',
    description: 'Jednocyfrowe, dwucyfrowe i gra z piłkami!',
    emoji: '➕',
    color: 'from-orange-400 to-yellow-400',
    activeBg: 'bg-orange-400',
  },
  subtracting: {
    componentId: 'subtracting',
    label: 'Subtracting Lesson',
    title: 'Odejmowanie',
    description: 'Jednocyfrowe, dwucyfrowe i reszta',
    emoji: '➖',
    color: 'from-red-400 to-pink-400',
    activeBg: 'bg-red-400',
  },
  multiplication: {
    componentId: 'multiplication',
    label: 'Multiplication Lesson',
    title: 'Mnożenie',
    description: 'Tabliczka mnożenia i algorytmy',
    emoji: '✖️',
    color: 'from-purple-500 to-indigo-500',
    activeBg: 'bg-purple-500',
  },
  division: {
    componentId: 'division',
    label: 'Division Lesson',
    title: 'Dzielenie',
    description: 'Proste dzielenie i reszta z dzielenia',
    emoji: '➗',
    color: 'from-blue-500 to-teal-400',
    activeBg: 'bg-blue-500',
  },
  geometry_basics: {
    componentId: 'geometry_basics',
    label: 'Geometry Basics Lesson',
    title: 'Podstawy geometrii',
    description: 'Punkt, odcinek, bok i kąt',
    emoji: '📐',
    color: 'from-cyan-500 to-sky-500',
    activeBg: 'bg-cyan-500',
  },
  geometry_shapes: {
    componentId: 'geometry_shapes',
    label: 'Geometry Shapes Lesson',
    title: 'Figury geometryczne',
    description: 'Poznaj figury i narysuj je w grze',
    emoji: '🔷',
    color: 'from-fuchsia-500 to-violet-500',
    activeBg: 'bg-fuchsia-500',
  },
  geometry_symmetry: {
    componentId: 'geometry_symmetry',
    label: 'Geometry Symmetry Lesson',
    title: 'Symetria',
    description: 'Oś symetrii i odbicia lustrzane',
    emoji: '🪞',
    color: 'from-emerald-500 to-lime-500',
    activeBg: 'bg-emerald-500',
  },
  geometry_perimeter: {
    componentId: 'geometry_perimeter',
    label: 'Geometry Perimeter Lesson',
    title: 'Obwód figur',
    description: 'Liczenie długości boków krok po kroku',
    emoji: '📏',
    color: 'from-amber-500 to-orange-500',
    activeBg: 'bg-amber-500',
  },
  logical_thinking: {
    componentId: 'logical_thinking',
    label: 'Logical Thinking Lesson',
    title: 'Myślenie logiczne',
    description: 'Wprowadzenie do wzorców, klasyfikacji i analogii',
    emoji: '🧠',
    color: 'from-violet-500 to-blue-500',
    activeBg: 'bg-violet-500',
  },
  logical_patterns: {
    componentId: 'logical_patterns',
    label: 'Logical Patterns Lesson',
    title: 'Wzorce i ciągi',
    description: 'Odkryj zasady kryjące się w ciągach i wzorcach',
    emoji: '🔢',
    color: 'from-violet-500 to-purple-600',
    activeBg: 'bg-violet-500',
  },
  logical_classification: {
    componentId: 'logical_classification',
    label: 'Logical Classification Lesson',
    title: 'Klasyfikacja',
    description: 'Grupuj, sortuj i znajdź intruza',
    emoji: '📦',
    color: 'from-teal-500 to-cyan-500',
    activeBg: 'bg-teal-500',
  },
  logical_reasoning: {
    componentId: 'logical_reasoning',
    label: 'Logical Reasoning Lesson',
    title: 'Wnioskowanie',
    description: 'Jeśli... to... — myśl krok po kroku',
    emoji: '💡',
    color: 'from-indigo-500 to-blue-600',
    activeBg: 'bg-indigo-500',
  },
  logical_analogies: {
    componentId: 'logical_analogies',
    label: 'Logical Analogies Lesson',
    title: 'Analogie',
    description: 'Znajdź tę samą relację w nowym kontekście',
    emoji: '🔗',
    color: 'from-pink-500 to-rose-500',
    activeBg: 'bg-pink-500',
  },
};

export const KANGUR_LESSON_COMPONENT_OPTIONS: Array<{
  value: KangurLessonComponentId;
  label: string;
}> = KANGUR_LESSON_COMPONENT_ORDER.map((componentId) => ({
  value: componentId,
  label: KANGUR_LESSON_LIBRARY[componentId].label,
}));

export type KangurLessonDraft = Pick<
  KangurLesson,
  | 'componentId'
  | 'contentMode'
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
    return {
      id: `kangur-lesson-${componentId}`,
      componentId,
      contentMode: 'component',
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

  return normalized
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

export const appendMissingKangurLessonsByComponent = (
  lessons: KangurLesson[],
  componentIds: readonly KangurLessonComponentId[]
): AppendMissingKangurLessonsResult => {
  const existingComponentIds = new Set(lessons.map((lesson) => lesson.componentId));
  const usedIds = new Set(lessons.map((lesson) => lesson.id));
  let nextSortOrder =
    lessons.reduce((maxSortOrder, lesson) => Math.max(maxSortOrder, lesson.sortOrder), 0) +
    KANGUR_LESSON_SORT_ORDER_GAP;

  const additions: KangurLesson[] = [];

  for (const componentId of componentIds) {
    if (existingComponentIds.has(componentId)) continue;
    const template = getKangurLessonTemplate(componentId);
    const lessonId = ensureUniqueAppendedLessonId(`kangur-lesson-${componentId}`, usedIds);
    additions.push({
      id: lessonId,
      componentId,
      contentMode: 'component',
      title: template.title,
      description: template.description,
      emoji: template.emoji,
      color: template.color,
      activeBg: template.activeBg,
      enabled: true,
      sortOrder: nextSortOrder,
    });
    existingComponentIds.add(componentId);
    nextSortOrder += KANGUR_LESSON_SORT_ORDER_GAP;
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
  appendMissingKangurLessonsByComponent(lessons, KANGUR_GEOMETRY_LESSON_COMPONENT_IDS);

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
  appendMissingKangurLessonsByComponent(lessons, KANGUR_LOGICAL_THINKING_LESSON_COMPONENT_IDS);
