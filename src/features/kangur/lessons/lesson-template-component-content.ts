import type { KangurLessonComponentId } from '@/features/kangur/shared/contracts/kangur';
import {
  cloneKangurLessonTemplateComponentContent,
  normalizeKangurLessonTemplateComponentContent,
} from '@/features/kangur/lessons/lesson-template-component-content-resolver';
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

  return cloneKangurLessonTemplateComponentContent(
    DEFAULT_COMPONENT_CONTENT_BY_ID[componentId as KangurLessonComponentId] ?? null,
  );
};

export const resolveKangurLessonTemplateComponentContent = (
  componentId: KangurLessonComponentId | string | null | undefined,
  componentContent: unknown,
): KangurLessonTemplateComponentContent | null => {
  const parsed = kangurLessonTemplateComponentContentSchema.safeParse(componentContent);
  if (parsed.success) {
    return cloneKangurLessonTemplateComponentContent(
      normalizeKangurLessonTemplateComponentContent(parsed.data),
    );
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
