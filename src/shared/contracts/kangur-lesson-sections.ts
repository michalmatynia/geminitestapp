import { z } from 'zod';

import {
  kangurLessonAgeGroupSchema,
  kangurLessonComponentIdSchema,
  kangurLessonSubjectSchema,
} from './kangur-lesson-constants';

// ---------------------------------------------------------------------------
// Subsection — a grouping of lessons within a section
// ---------------------------------------------------------------------------

export const kangurLessonSubsectionSchema = z.object({
  id: z.string().trim().min(1).max(120),
  label: z.string().trim().min(1).max(120),
  shortLabel: z.string().trim().max(60).optional(),
  typeLabel: z.string().trim().max(40).default('Subsection'),
  sortOrder: z.number().int().min(0).max(1_000_000),
  enabled: z.boolean().default(true),
  componentIds: z.array(kangurLessonComponentIdSchema).default([]),
});
export type KangurLessonSubsection = z.infer<typeof kangurLessonSubsectionSchema>;

// ---------------------------------------------------------------------------
// Section — a top-level grouping within a subject + ageGroup
// ---------------------------------------------------------------------------

export const kangurLessonSectionSchema = z.object({
  id: z.string().trim().min(1).max(120),
  subject: kangurLessonSubjectSchema,
  ageGroup: kangurLessonAgeGroupSchema,
  label: z.string().trim().min(1).max(120),
  shortLabel: z.string().trim().max(60).optional(),
  typeLabel: z.string().trim().max(40).default('Section'),
  emoji: z.string().trim().max(12).optional(),
  sortOrder: z.number().int().min(0).max(1_000_000),
  enabled: z.boolean().default(true),
  /** Direct lesson references (flat groups like alphabet). */
  componentIds: z.array(kangurLessonComponentIdSchema).default([]),
  /** Nested lesson groups (structured subjects like web_development). */
  subsections: z.array(kangurLessonSubsectionSchema).default([]),
});
export type KangurLessonSection = z.infer<typeof kangurLessonSectionSchema>;

export const kangurLessonSectionsSchema = z.array(kangurLessonSectionSchema);
export type KangurLessonSections = z.infer<typeof kangurLessonSectionsSchema>;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Collect all componentIds referenced by a section, including those nested
 * inside subsections.
 */
export const collectSectionComponentIds = (
  section: KangurLessonSection
): readonly string[] => {
  const ids: string[] = [...section.componentIds];
  for (const sub of section.subsections) {
    ids.push(...sub.componentIds);
  }
  return ids;
};
