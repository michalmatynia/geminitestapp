/**
 * Full lesson catalog — re-exports lightweight metadata and adds the heavy
 * per-subject template data (`KANGUR_LESSON_LIBRARY`, `KANGUR_LESSON_COMPONENT_ORDER`).
 *
 * Consumers that only need subjects, age groups, defaults, or utility functions
 * should import from `./lesson-catalog-metadata` instead to keep their bundle
 * lean.
 */
import type { KangurLessonComponentId } from '@/features/kangur/shared/contracts/kangur';
import type { KangurLessonTemplate } from '@/features/kangur/lessons/lesson-types';
import {
  ALPHABET_LESSON_COMPONENT_ORDER,
  ALPHABET_LESSON_TEMPLATES,
} from './subjects/alphabet/catalog';
import {
  AGENTIC_CODING_LESSON_COMPONENT_ORDER,
  AGENTIC_CODING_LESSON_TEMPLATES,
} from './subjects/agentic-coding/catalog';
import { ART_LESSON_COMPONENT_ORDER, ART_LESSON_TEMPLATES } from './subjects/art/catalog';
import { ENGLISH_LESSON_COMPONENT_ORDER, ENGLISH_LESSON_TEMPLATES } from './subjects/english/catalog';
import {
  GEOMETRY_LESSON_COMPONENT_ORDER,
  GEOMETRY_LESSON_TEMPLATES,
} from './subjects/geometry/catalog';
import { MATHS_LESSON_COMPONENT_ORDER, MATHS_LESSON_TEMPLATES } from './subjects/maths/catalog';
import { MUSIC_LESSON_COMPONENT_ORDER, MUSIC_LESSON_TEMPLATES } from './subjects/music/catalog';
import {
  WEB_DEVELOPMENT_LESSON_COMPONENT_ORDER,
  WEB_DEVELOPMENT_LESSON_TEMPLATES,
} from './subjects/web-development/catalog';
import {
  KANGUR_SUBJECTS,
  KANGUR_AGE_GROUPS,
  DEFAULT_KANGUR_AGE_GROUP,
  DEFAULT_KANGUR_SUBJECT,
  KANGUR_DEFAULT_SUBJECT_BY_AGE_GROUP,
  getKangurSubjectLabel,
  getKangurAgeGroupLabel,
  getKangurSubjectAgeGroups,
  doesKangurSubjectSupportAgeGroup,
  getKangurSubjectsForAgeGroup,
  getKangurDefaultSubjectForAgeGroup,
  resolveKangurSubjectForAgeGroup,
} from './lesson-catalog-metadata';

// Re-export all metadata so existing consumers don't break.
export {
  KANGUR_SUBJECTS,
  KANGUR_AGE_GROUPS,
  DEFAULT_KANGUR_AGE_GROUP,
  DEFAULT_KANGUR_SUBJECT,
  KANGUR_DEFAULT_SUBJECT_BY_AGE_GROUP,
  getKangurSubjectLabel,
  getKangurAgeGroupLabel,
  getKangurSubjectAgeGroups,
  doesKangurSubjectSupportAgeGroup,
  getKangurSubjectsForAgeGroup,
  getKangurDefaultSubjectForAgeGroup,
  resolveKangurSubjectForAgeGroup,
};

export const KANGUR_LESSON_COMPONENT_ORDER = [
  ...ALPHABET_LESSON_COMPONENT_ORDER,
  ...ART_LESSON_COMPONENT_ORDER,
  ...GEOMETRY_LESSON_COMPONENT_ORDER,
  ...MUSIC_LESSON_COMPONENT_ORDER,
  ...MATHS_LESSON_COMPONENT_ORDER,
  ...ENGLISH_LESSON_COMPONENT_ORDER,
  ...WEB_DEVELOPMENT_LESSON_COMPONENT_ORDER,
  ...AGENTIC_CODING_LESSON_COMPONENT_ORDER,
] as const satisfies readonly KangurLessonComponentId[];

export const KANGUR_LESSON_LIBRARY: Record<KangurLessonComponentId, KangurLessonTemplate> = {
  ...ALPHABET_LESSON_TEMPLATES,
  ...ART_LESSON_TEMPLATES,
  ...GEOMETRY_LESSON_TEMPLATES,
  ...MUSIC_LESSON_TEMPLATES,
  ...MATHS_LESSON_TEMPLATES,
  ...ENGLISH_LESSON_TEMPLATES,
  ...WEB_DEVELOPMENT_LESSON_TEMPLATES,
  ...AGENTIC_CODING_LESSON_TEMPLATES,
};
