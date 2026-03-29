import { z } from 'zod';

import {
  kangurLessonAgeGroupSchema,
  kangurLessonComponentIdSchema,
  kangurLessonSubjectSchema,
} from './kangur-lesson-constants';
import { optionalTrimmedQueryString } from '@/shared/lib/api/query-schema';
import {
  kangurAlphabetUnifiedLessonTemplateContentSchema,
} from './kangur-lesson-templates.shared';
import {
  kangurArtShapesBasicLessonTemplateContentSchema,
  kangurMusicDiatonicScaleLessonTemplateContentSchema,
} from './kangur-lesson-templates.music-art';
import {
  kangurAddingLessonTemplateContentSchema,
  kangurDivisionLessonTemplateContentSchema,
  kangurMultiplicationLessonTemplateContentSchema,
  kangurSubtractingLessonTemplateContentSchema,
} from './kangur-lesson-templates.arithmetic';
import {
  kangurGeometryBasicsLessonTemplateContentSchema,
  kangurGeometryShapeRecognitionLessonTemplateContentSchema,
  kangurGeometryShapesLessonTemplateContentSchema,
  kangurGeometrySymmetryLessonTemplateContentSchema,
} from './kangur-lesson-templates.geometry';
import {
  kangurLogicalAnalogiesLessonTemplateContentSchema,
  kangurLogicalClassificationLessonTemplateContentSchema,
  kangurLogicalPatternsLessonTemplateContentSchema,
  kangurLogicalReasoningLessonTemplateContentSchema,
  kangurLogicalThinkingLessonTemplateContentSchema,
} from './kangur-lesson-templates.logic';

export {
  kangurLegacyCompatibleLessonSectionGameCopyShape,
  kangurLessonTemplateSlideContentSchema,
  kangurLessonTemplateSectionContentSchema,
  kangurAlphabetUnifiedLessonTemplateContentSchema,
  normalizeLegacyCompatibleLessonSectionGameCopy,
  normalizeLegacyCompatibleLessonShellTitle,
} from './kangur-lesson-templates.shared';
export type {
  LegacyCompatibleLessonSectionGameCopy,
  LegacyCompatibleLessonShellTitle,
} from './kangur-lesson-templates.shared';
export {
  kangurMusicDiatonicScaleLessonTemplateContentSchema,
  kangurArtShapesBasicLessonTemplateContentSchema,
} from './kangur-lesson-templates.music-art';
export {
  kangurMultiplicationLessonTemplateContentSchema,
  kangurAddingLessonTemplateContentSchema,
  kangurSubtractingLessonTemplateContentSchema,
  kangurDivisionLessonTemplateContentSchema,
} from './kangur-lesson-templates.arithmetic';
export {
  kangurGeometryBasicsLessonTemplateContentSchema,
  kangurGeometryShapesLessonTemplateContentSchema,
  kangurGeometryShapeRecognitionLessonTemplateContentSchema,
  kangurGeometrySymmetryLessonTemplateContentSchema,
} from './kangur-lesson-templates.geometry';
export {
  kangurLogicalClassificationLessonTemplateContentSchema,
  kangurLogicalAnalogiesLessonTemplateContentSchema,
  kangurLogicalThinkingLessonTemplateContentSchema,
  kangurLogicalPatternsLessonTemplateContentSchema,
  kangurLogicalReasoningLessonTemplateContentSchema,
} from './kangur-lesson-templates.logic';

export const kangurLessonTemplateComponentContentSchema = z.discriminatedUnion('kind', [
  kangurAlphabetUnifiedLessonTemplateContentSchema,
  kangurMusicDiatonicScaleLessonTemplateContentSchema,
  kangurArtShapesBasicLessonTemplateContentSchema,
  kangurAddingLessonTemplateContentSchema,
  kangurSubtractingLessonTemplateContentSchema,
  kangurMultiplicationLessonTemplateContentSchema,
  kangurDivisionLessonTemplateContentSchema,
  kangurGeometryBasicsLessonTemplateContentSchema,
  kangurGeometryShapesLessonTemplateContentSchema,
  kangurGeometryShapeRecognitionLessonTemplateContentSchema,
  kangurGeometrySymmetryLessonTemplateContentSchema,
  kangurLogicalAnalogiesLessonTemplateContentSchema,
  kangurLogicalClassificationLessonTemplateContentSchema,
  kangurLogicalThinkingLessonTemplateContentSchema,
  kangurLogicalPatternsLessonTemplateContentSchema,
  kangurLogicalReasoningLessonTemplateContentSchema,
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
export type KangurArtShapesBasicLessonTemplateContent = Extract<
  KangurLessonTemplateComponentContent,
  { kind: 'art_shapes_basic' }
>;
export type KangurAddingLessonTemplateContent = Extract<
  KangurLessonTemplateComponentContent,
  { kind: 'adding' }
>;
export type KangurSubtractingLessonTemplateContent = Extract<
  KangurLessonTemplateComponentContent,
  { kind: 'subtracting' }
>;
export type KangurMultiplicationLessonTemplateContent = Extract<
  KangurLessonTemplateComponentContent,
  { kind: 'multiplication' }
>;
export type KangurDivisionLessonTemplateContent = Extract<
  KangurLessonTemplateComponentContent,
  { kind: 'division' }
>;
export type KangurGeometryBasicsLessonTemplateContent = Extract<
  KangurLessonTemplateComponentContent,
  { kind: 'geometry_basics' }
>;
export type KangurGeometryShapesLessonTemplateContent = Extract<
  KangurLessonTemplateComponentContent,
  { kind: 'geometry_shapes' }
>;
export type KangurGeometryShapeRecognitionLessonTemplateContent = Extract<
  KangurLessonTemplateComponentContent,
  { kind: 'geometry_shape_recognition' }
>;
export type KangurGeometrySymmetryLessonTemplateContent = Extract<
  KangurLessonTemplateComponentContent,
  { kind: 'geometry_symmetry' }
>;
export type KangurLogicalAnalogiesLessonTemplateContent = Extract<
  KangurLessonTemplateComponentContent,
  { kind: 'logical_analogies' }
>;
export type KangurLogicalClassificationLessonTemplateContent = Extract<
  KangurLessonTemplateComponentContent,
  { kind: 'logical_classification' }
>;
export type KangurLogicalThinkingLessonTemplateContent = Extract<
  KangurLessonTemplateComponentContent,
  { kind: 'logical_thinking' }
>;
export type KangurLogicalPatternsLessonTemplateContent = Extract<
  KangurLessonTemplateComponentContent,
  { kind: 'logical_patterns' }
>;
export type KangurLogicalReasoningLessonTemplateContent = Extract<
  KangurLessonTemplateComponentContent,
  { kind: 'logical_reasoning' }
>;

export const kangurLessonTemplatesSchema = z.array(kangurLessonTemplateSchema);
export type KangurLessonTemplates = z.infer<typeof kangurLessonTemplatesSchema>;

export const kangurLessonTemplatesQuerySchema = z.object({
  componentId: optionalTrimmedQueryString(kangurLessonComponentIdSchema),
  subject: optionalTrimmedQueryString(kangurLessonSubjectSchema),
  ageGroup: optionalTrimmedQueryString(kangurLessonAgeGroupSchema),
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
