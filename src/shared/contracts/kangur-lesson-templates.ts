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

export const kangurLessonTemplateSlideContentSchema = z.object({
  title: z.string().trim().min(1).max(120),
  lead: z.string().trim().min(1).max(240),
  caption: z.string().trim().min(1).max(240).optional(),
});

export const kangurLessonTemplateSectionContentSchema = z.object({
  id: z.string().trim().min(1).max(64),
  emoji: z.string().trim().min(1).max(12),
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().min(1).max(240),
  isGame: z.boolean().optional(),
  slides: z.array(kangurLessonTemplateSlideContentSchema).default([]),
  gameStageTitle: z.string().trim().min(1).max(120).optional(),
  gameStageDescription: z.string().trim().min(1).max(240).optional(),
});

export const kangurAlphabetUnifiedLessonTemplateContentSchema = z.object({
  kind: z.literal('alphabet_unified'),
  sections: z.array(kangurLessonTemplateSectionContentSchema).min(1),
});

const kangurMusicDiatonicScaleSectionSchema = z.object({
  emoji: z.string().trim().min(1).max(12),
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().min(1).max(240),
});

const kangurMusicDiatonicScaleSlideSchema = z.object({
  title: z.string().trim().min(1).max(120),
  lead: z.string().trim().min(1).max(240),
});

const kangurMusicDiatonicScaleFactSchema = z.object({
  title: z.string().trim().min(1).max(120),
  caption: z.string().trim().min(1).max(240),
});

export const kangurMusicDiatonicScaleLessonTemplateContentSchema = z.object({
  kind: z.literal('music_diatonic_scale'),
  notesSection: kangurMusicDiatonicScaleSectionSchema.extend({
    introSlide: kangurMusicDiatonicScaleSlideSchema.extend({
      noteCardLabel: z.string().trim().min(1).max(80),
      noteSequence: z.array(z.string().trim().min(1).max(24)).min(1).max(12),
      caption: z.string().trim().min(1).max(240),
    }),
    colorsSlide: kangurMusicDiatonicScaleSlideSchema.extend({
      noteChips: z.array(z.string().trim().min(1).max(24)).min(1).max(12),
      previewTitle: z.string().trim().min(1).max(120),
      previewDescription: z.string().trim().min(1).max(240),
      caption: z.string().trim().min(1).max(240),
    }),
  }),
  melodySection: kangurMusicDiatonicScaleSectionSchema.extend({
    directionSlide: kangurMusicDiatonicScaleSlideSchema.extend({
      ascendingTitle: z.string().trim().min(1).max(80),
      ascendingSequence: z.string().trim().min(1).max(120),
      ascendingCaption: z.string().trim().min(1).max(240),
      descendingTitle: z.string().trim().min(1).max(80),
      descendingSequence: z.string().trim().min(1).max(120),
      descendingCaption: z.string().trim().min(1).max(240),
    }),
    listenSlide: kangurMusicDiatonicScaleSlideSchema.extend({
      planTitle: z.string().trim().min(1).max(80),
      planSteps: z.array(z.string().trim().min(1).max(80)).min(1).max(6),
      caption: z.string().trim().min(1).max(240),
    }),
  }),
  gameRepeatSection: kangurMusicDiatonicScaleSectionSchema.extend({
    gameStageTitle: z.string().trim().min(1).max(120),
    gameStageDescription: z.string().trim().min(1).max(240),
  }),
  gameFreeplaySection: kangurMusicDiatonicScaleSectionSchema.extend({
    gameStageTitle: z.string().trim().min(1).max(120),
    gameStageDescription: z.string().trim().min(1).max(240),
  }),
  summarySection: kangurMusicDiatonicScaleSectionSchema.extend({
    summarySlide: kangurMusicDiatonicScaleSlideSchema.extend({
      facts: z.array(kangurMusicDiatonicScaleFactSchema).min(1).max(6),
    }),
  }),
});

export const kangurLessonTemplateComponentContentSchema = z.discriminatedUnion('kind', [
  kangurAlphabetUnifiedLessonTemplateContentSchema,
  kangurMusicDiatonicScaleLessonTemplateContentSchema,
]);

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
  componentContent: kangurLessonTemplateComponentContentSchema.optional(),
});
export type KangurLessonTemplate = z.infer<typeof kangurLessonTemplateSchema>;
export type KangurLessonTemplateComponentContent = NonNullable<
  KangurLessonTemplate['componentContent']
>;
export type KangurAlphabetUnifiedLessonTemplateContent = Extract<
  KangurLessonTemplateComponentContent,
  { kind: 'alphabet_unified' }
>;
export type KangurMusicDiatonicScaleLessonTemplateContent = Extract<
  KangurLessonTemplateComponentContent,
  { kind: 'music_diatonic_scale' }
>;

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
