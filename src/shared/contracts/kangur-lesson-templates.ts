import { z } from 'zod';

import {
  kangurLessonAgeGroupSchema,
  kangurLessonComponentIdSchema,
  kangurLessonSubjectSchema,
} from './kangur-lesson-constants';
import { optionalTrimmedQueryString } from '@/shared/lib/api/query-schema';

// ---------------------------------------------------------------------------
// Lesson template — the catalog definition for a lesson type
// ---------------------------------------------------------------------------

export const kangurLessonTemplateSchema = z.object({
  componentId: kangurLessonComponentIdSchema,
  subject: kangurLessonSubjectSchema,
  ageGroup: kangurLessonAgeGroupSchema.optional(),
  label: z.string().trim().min(1).max(120),
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().min(1).max(240),
  emoji: z.string().trim().max(12),
  color: z.string().trim().max(60),
  activeBg: z.string().trim().max(60),
  sortOrder: z.number().int().min(0).max(1_000_000).default(0),
});
export type KangurLessonTemplate = z.infer<typeof kangurLessonTemplateSchema>;

export const kangurLessonTemplatesSchema = z.array(kangurLessonTemplateSchema);
export type KangurLessonTemplates = z.infer<typeof kangurLessonTemplatesSchema>;

export const kangurLessonTemplatesQuerySchema = z.object({
  subject: optionalTrimmedQueryString(kangurLessonSubjectSchema),
  locale: optionalTrimmedQueryString(z.string().trim().min(2).max(16)),
});
export type KangurLessonTemplatesQuery = z.infer<typeof kangurLessonTemplatesQuerySchema>;

export const kangurLessonTemplatesReplacePayloadSchema = z.object({
  locale: z.string().trim().min(2).max(16).optional(),
  templates: kangurLessonTemplatesSchema,
});
export type KangurLessonTemplatesReplacePayload = z.infer<
  typeof kangurLessonTemplatesReplacePayloadSchema
>;
