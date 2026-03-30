import type { KangurLessonComponentId } from '@/features/kangur/shared/contracts/kangur';
import {
  SUBTRACTING_LESSON_COMPONENT_CONTENT as SUBTRACTING_LESSON_COMPONENT_CONTENT_SEED,
} from '@/features/kangur/ui/components/subtracting-lesson-content';
import {
  ADDING_LESSON_COMPONENT_CONTENT as ADDING_LESSON_COMPONENT_CONTENT_SEED,
} from '@/features/kangur/ui/components/adding-lesson-content';
import {
  LOGICAL_ANALOGIES_LESSON_COMPONENT_CONTENT as LOGICAL_ANALOGIES_LESSON_COMPONENT_CONTENT_SEED,
} from '@/features/kangur/ui/components/logical-analogies-lesson-content';
import {
  LOGICAL_REASONING_LESSON_COMPONENT_CONTENT as LOGICAL_REASONING_LESSON_COMPONENT_CONTENT_SEED,
} from '@/features/kangur/ui/components/logical-reasoning-lesson-content';
import {
  LOGICAL_PATTERNS_LESSON_COMPONENT_CONTENT as LOGICAL_PATTERNS_LESSON_COMPONENT_CONTENT_SEED,
} from '@/features/kangur/ui/components/logical-patterns-lesson-content';
import {
  LOGICAL_THINKING_LESSON_COMPONENT_CONTENT as LOGICAL_THINKING_LESSON_COMPONENT_CONTENT_SEED,
} from '@/features/kangur/ui/components/logical-thinking-lesson-content';
import {
  DIVISION_LESSON_COMPONENT_CONTENT as DIVISION_LESSON_COMPONENT_CONTENT_SEED,
} from '@/features/kangur/ui/components/division-lesson-content';
import {
  MULTIPLICATION_LESSON_COMPONENT_CONTENT as MULTIPLICATION_LESSON_COMPONENT_CONTENT_SEED,
} from '@/features/kangur/ui/components/multiplication-lesson-content';
import {
  kangurLessonTemplateComponentContentSchema,
  type KangurAddingLessonTemplateContent,
  type KangurDivisionLessonTemplateContent,
  type KangurLessonTemplateComponentContent,
  type KangurLogicalAnalogiesLessonTemplateContent,
  type KangurLogicalPatternsLessonTemplateContent,
  type KangurLogicalReasoningLessonTemplateContent,
  type KangurLogicalThinkingLessonTemplateContent,
  type KangurMultiplicationLessonTemplateContent,
  type KangurSubtractingLessonTemplateContent,
  type LegacyCompatibleLessonShellTitle,
  normalizeLegacyCompatibleLessonSectionGameCopy,
  normalizeLegacyCompatibleLessonShellTitle,
} from '@/shared/contracts/kangur-lesson-templates';

import {
  ALPHABET_MATCHING_LESSON_COMPONENT_CONTENT,
  ALPHABET_SEQUENCE_LESSON_COMPONENT_CONTENT,
  ALPHABET_SYLLABLES_LESSON_COMPONENT_CONTENT,
  ALPHABET_UNIFIED_COMPONENT_IDS,
  ALPHABET_WORDS_LESSON_COMPONENT_CONTENT,
  ART_SHAPES_BASIC_LESSON_COMPONENT_CONTENT,
  MUSIC_DIATONIC_SCALE_LESSON_COMPONENT_CONTENT,
} from './lesson-template-component-content.foundations';
import {
  GEOMETRY_BASICS_LESSON_COMPONENT_CONTENT,
  GEOMETRY_SHAPE_RECOGNITION_LESSON_COMPONENT_CONTENT,
  GEOMETRY_SHAPES_LESSON_COMPONENT_CONTENT,
  GEOMETRY_SYMMETRY_LESSON_COMPONENT_CONTENT,
} from './lesson-template-component-content.geometry';
import { LOGICAL_CLASSIFICATION_LESSON_COMPONENT_CONTENT } from './lesson-template-component-content.logical-classification';

const cloneComponentContent = <T extends KangurLessonTemplateComponentContent | null>(
  value: T,
): T => (value ? structuredClone(value) : value);

const normalizeGameShellLessonTemplateContent = <
  T extends KangurLessonTemplateComponentContent & {
    game: LegacyCompatibleLessonShellTitle;
  },
>(
  content: T,
): T =>
  ({
    ...content,
    game: normalizeLegacyCompatibleLessonShellTitle(content.game),
  }) as T;

const normalizeDrawShellLessonTemplateContent = <
  T extends KangurLessonTemplateComponentContent & {
    draw: LegacyCompatibleLessonShellTitle;
  },
>(
  content: T,
): T =>
  ({
    ...content,
    draw: normalizeLegacyCompatibleLessonShellTitle(content.draw),
  }) as T;

const normalizeAddingLessonTemplateContent = <
  T extends KangurLessonTemplateComponentContent & {
    game: LegacyCompatibleLessonShellTitle;
    synthesis: LegacyCompatibleLessonShellTitle;
  },
>(
  content: T,
): T =>
  ({
    ...content,
    game: normalizeLegacyCompatibleLessonShellTitle(content.game),
    synthesis: normalizeLegacyCompatibleLessonShellTitle(content.synthesis),
  }) as T;

const normalizeKangurLessonTemplateComponentContent = <
  T extends KangurLessonTemplateComponentContent,
>(
  content: T,
): T => {
  switch (content.kind) {
    case 'alphabet_unified':
      return {
        ...content,
        sections: content.sections.map(normalizeLegacyCompatibleLessonSectionGameCopy),
      } as T;
    case 'music_diatonic_scale':
      return {
        ...content,
        gameFreeplaySection: normalizeLegacyCompatibleLessonSectionGameCopy(
          content.gameFreeplaySection
        ),
        gameRepeatSection: normalizeLegacyCompatibleLessonSectionGameCopy(
          content.gameRepeatSection
        ),
      } as T;
    case 'geometry_shape_recognition':
      return normalizeDrawShellLessonTemplateContent(content) as T;
    case 'adding':
      return normalizeAddingLessonTemplateContent(content) as T;
    case 'art_shapes_basic':
    case 'geometry_basics':
    case 'geometry_shapes':
    case 'geometry_symmetry':
    case 'logical_classification':
    case 'logical_patterns':
    case 'logical_analogies':
    case 'multiplication':
    case 'subtracting':
    case 'division':
      return normalizeGameShellLessonTemplateContent(content) as T;
    default:
      return content;
  }
};

export {
  ALPHABET_MATCHING_LESSON_COMPONENT_CONTENT,
  ALPHABET_SEQUENCE_LESSON_COMPONENT_CONTENT,
  ALPHABET_SYLLABLES_LESSON_COMPONENT_CONTENT,
  ALPHABET_UNIFIED_COMPONENT_IDS,
  ALPHABET_WORDS_LESSON_COMPONENT_CONTENT,
  ART_SHAPES_BASIC_LESSON_COMPONENT_CONTENT,
  GEOMETRY_BASICS_LESSON_COMPONENT_CONTENT,
  GEOMETRY_SHAPE_RECOGNITION_LESSON_COMPONENT_CONTENT,
  GEOMETRY_SHAPES_LESSON_COMPONENT_CONTENT,
  GEOMETRY_SYMMETRY_LESSON_COMPONENT_CONTENT,
  LOGICAL_CLASSIFICATION_LESSON_COMPONENT_CONTENT,
  MUSIC_DIATONIC_SCALE_LESSON_COMPONENT_CONTENT,
};

export const LOGICAL_PATTERNS_LESSON_COMPONENT_CONTENT: KangurLogicalPatternsLessonTemplateContent =
  LOGICAL_PATTERNS_LESSON_COMPONENT_CONTENT_SEED;
export const LOGICAL_ANALOGIES_LESSON_COMPONENT_CONTENT: KangurLogicalAnalogiesLessonTemplateContent =
  LOGICAL_ANALOGIES_LESSON_COMPONENT_CONTENT_SEED;
export const LOGICAL_REASONING_LESSON_COMPONENT_CONTENT: KangurLogicalReasoningLessonTemplateContent =
  LOGICAL_REASONING_LESSON_COMPONENT_CONTENT_SEED;
export const LOGICAL_THINKING_LESSON_COMPONENT_CONTENT: KangurLogicalThinkingLessonTemplateContent =
  LOGICAL_THINKING_LESSON_COMPONENT_CONTENT_SEED;
export const ADDING_LESSON_COMPONENT_CONTENT: KangurAddingLessonTemplateContent =
  ADDING_LESSON_COMPONENT_CONTENT_SEED;
export const SUBTRACTING_LESSON_COMPONENT_CONTENT: KangurSubtractingLessonTemplateContent =
  SUBTRACTING_LESSON_COMPONENT_CONTENT_SEED;
export const MULTIPLICATION_LESSON_COMPONENT_CONTENT: KangurMultiplicationLessonTemplateContent =
  MULTIPLICATION_LESSON_COMPONENT_CONTENT_SEED;
export const DIVISION_LESSON_COMPONENT_CONTENT: KangurDivisionLessonTemplateContent =
  DIVISION_LESSON_COMPONENT_CONTENT_SEED;

const DEFAULT_COMPONENT_CONTENT_BY_ID: Partial<
  Record<KangurLessonComponentId, KangurLessonTemplateComponentContent>
> = {
  alphabet_syllables: ALPHABET_SYLLABLES_LESSON_COMPONENT_CONTENT,
  alphabet_words: ALPHABET_WORDS_LESSON_COMPONENT_CONTENT,
  alphabet_matching: ALPHABET_MATCHING_LESSON_COMPONENT_CONTENT,
  alphabet_sequence: ALPHABET_SEQUENCE_LESSON_COMPONENT_CONTENT,
  art_shapes_basic: ART_SHAPES_BASIC_LESSON_COMPONENT_CONTENT,
  adding: ADDING_LESSON_COMPONENT_CONTENT,
  subtracting: SUBTRACTING_LESSON_COMPONENT_CONTENT,
  multiplication: MULTIPLICATION_LESSON_COMPONENT_CONTENT,
  division: DIVISION_LESSON_COMPONENT_CONTENT,
  geometry_basics: GEOMETRY_BASICS_LESSON_COMPONENT_CONTENT,
  geometry_shape_recognition: GEOMETRY_SHAPE_RECOGNITION_LESSON_COMPONENT_CONTENT,
  geometry_shapes: GEOMETRY_SHAPES_LESSON_COMPONENT_CONTENT,
  geometry_symmetry: GEOMETRY_SYMMETRY_LESSON_COMPONENT_CONTENT,
  logical_analogies: LOGICAL_ANALOGIES_LESSON_COMPONENT_CONTENT,
  logical_classification: LOGICAL_CLASSIFICATION_LESSON_COMPONENT_CONTENT,
  logical_patterns: LOGICAL_PATTERNS_LESSON_COMPONENT_CONTENT,
  logical_reasoning: LOGICAL_REASONING_LESSON_COMPONENT_CONTENT,
  logical_thinking: LOGICAL_THINKING_LESSON_COMPONENT_CONTENT,
  music_diatonic_scale: MUSIC_DIATONIC_SCALE_LESSON_COMPONENT_CONTENT,
};

export const supportsKangurLessonTemplateComponentContent = (
  componentId: KangurLessonComponentId | string | null | undefined,
): boolean =>
  Boolean(
    componentId &&
      Object.prototype.hasOwnProperty.call(DEFAULT_COMPONENT_CONTENT_BY_ID, componentId),
  );

export const getDefaultKangurLessonTemplateComponentContent = (
  componentId: KangurLessonComponentId | string | null | undefined,
): KangurLessonTemplateComponentContent | null => {
  if (!componentId) {
    return null;
  }

  return cloneComponentContent(
    DEFAULT_COMPONENT_CONTENT_BY_ID[componentId as KangurLessonComponentId] ?? null,
  );
};

export const resolveKangurLessonTemplateComponentContent = (
  componentId: KangurLessonComponentId | string | null | undefined,
  componentContent: unknown,
): KangurLessonTemplateComponentContent | null => {
  const parsed = kangurLessonTemplateComponentContentSchema.safeParse(componentContent);
  if (parsed.success) {
    return cloneComponentContent(normalizeKangurLessonTemplateComponentContent(parsed.data));
  }

  return getDefaultKangurLessonTemplateComponentContent(componentId);
};

export const serializeKangurLessonTemplateComponentContent = (
  componentId: KangurLessonComponentId | string | null | undefined,
  componentContent: unknown,
): string => {
  const resolved = resolveKangurLessonTemplateComponentContent(componentId, componentContent);
  return resolved ? JSON.stringify(resolved, null, 2) : '';
};

export const parseKangurLessonTemplateComponentContentJson = (
  componentId: KangurLessonComponentId | string | null | undefined,
  raw: string,
): KangurLessonTemplateComponentContent | undefined => {
  const trimmed = raw.trim();
  if (!trimmed) {
    return undefined;
  }

  const parsedJson = JSON.parse(trimmed) as unknown;
  const parsedContent = normalizeKangurLessonTemplateComponentContent(
    kangurLessonTemplateComponentContentSchema.parse(parsedJson),
  );
  const fallback = getDefaultKangurLessonTemplateComponentContent(componentId);

  if (fallback?.kind === 'alphabet_unified' && parsedContent.kind === 'alphabet_unified') {
    const fallbackSectionIds = new Set(fallback.sections.map((section) => section.id));
    const parsedSectionIds = new Set(parsedContent.sections.map((section) => section.id));

    if (
      fallback.sections.length !== parsedContent.sections.length ||
      fallbackSectionIds.size !== parsedSectionIds.size ||
      [...fallbackSectionIds].some((sectionId) => !parsedSectionIds.has(sectionId))
    ) {
      throw new Error('Section ids must match the lesson family template.');
    }
  }

  return parsedContent;
};
