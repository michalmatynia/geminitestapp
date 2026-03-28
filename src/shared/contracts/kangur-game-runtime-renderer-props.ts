import { z } from 'zod';

import { kangurLessonActivityIdSchema } from './kangur-lesson-constants';

const nonEmptyTrimmedString = z.string().trim().min(1);

const KANGUR_GEOMETRY_DRAWING_SHAPE_IDS = [
  'circle',
  'oval',
  'triangle',
  'diamond',
  'square',
  'rectangle',
  'pentagon',
  'hexagon',
] as const;

export const kangurGeometryDrawingShapeIdSchema = z.enum(KANGUR_GEOMETRY_DRAWING_SHAPE_IDS);
export type KangurGeometryDrawingShapeId = z.infer<
  typeof kangurGeometryDrawingShapeIdSchema
>;

const KANGUR_CALENDAR_INTERACTIVE_SECTIONS = ['dni', 'miesiace', 'data'] as const;
export const kangurCalendarInteractiveSectionSchema = z.enum(
  KANGUR_CALENDAR_INTERACTIVE_SECTIONS
);
export type KangurCalendarInteractiveSection = z.infer<
  typeof kangurCalendarInteractiveSectionSchema
>;

const KANGUR_CLOCK_TRAINING_SECTIONS = ['hours', 'minutes', 'combined'] as const;
export const kangurClockTrainingSectionSchema = z.enum(
  KANGUR_CLOCK_TRAINING_SECTIONS
);
export type KangurClockTrainingSection = z.infer<
  typeof kangurClockTrainingSectionSchema
>;

export const kangurClockTrainingInitialModeSchema = z.enum(['practice', 'challenge']);
export type KangurClockTrainingInitialMode = z.infer<
  typeof kangurClockTrainingInitialModeSchema
>;

const KANGUR_LOGICAL_PATTERN_SET_IDS = [
  'logical_patterns_workshop',
  'alphabet_letter_order',
] as const;
export const kangurLogicalPatternSetIdSchema = z.enum(KANGUR_LOGICAL_PATTERN_SET_IDS);
export type KangurLogicalPatternSetId = z.infer<typeof kangurLogicalPatternSetIdSchema>;

const KANGUR_LITERACY_MATCH_SET_IDS = [
  'alphabet_first_words',
  'alphabet_letter_matching',
] as const;
export const kangurLiteracyMatchSetIdSchema = z.enum(KANGUR_LITERACY_MATCH_SET_IDS);
export type KangurLiteracyMatchSetId = z.infer<typeof kangurLiteracyMatchSetIdSchema>;

const KANGUR_GAME_RUNTIME_FINISH_LABEL_VARIANTS = [
  'lesson',
  'topics',
  'play',
  'done',
] as const;

export const kangurGameRuntimeFinishLabelVariantSchema = z.enum(
  KANGUR_GAME_RUNTIME_FINISH_LABEL_VARIANTS
);
export type KangurGameRuntimeFinishLabelVariant = z.infer<
  typeof kangurGameRuntimeFinishLabelVariantSchema
>;

export const kangurGameRuntimeRendererPropsSchema = z
  .object({
    activityKey: nonEmptyTrimmedString.max(120).optional(),
    calendarSection: kangurCalendarInteractiveSectionSchema.optional(),
    clockSection: kangurClockTrainingSectionSchema.optional(),
    clockInitialMode: kangurClockTrainingInitialModeSchema.optional(),
    difficultyLabelOverride: nonEmptyTrimmedString.max(120).optional(),
    finishLabel: nonEmptyTrimmedString.max(120).optional(),
    finishLabelVariant: kangurGameRuntimeFinishLabelVariantSchema.optional(),
    lessonActivityId: kangurLessonActivityIdSchema.optional(),
    lessonKey: nonEmptyTrimmedString.max(120).optional(),
    literacyMatchSetId: kangurLiteracyMatchSetIdSchema.optional(),
    patternSetId: kangurLogicalPatternSetIdSchema.optional(),
    operation: nonEmptyTrimmedString.max(80).optional(),
    shapeIds: z.array(kangurGeometryDrawingShapeIdSchema).min(1).max(12).optional(),
    showClockHourHand: z.boolean().optional(),
    showClockMinuteHand: z.boolean().optional(),
    showClockModeSwitch: z.boolean().optional(),
    showClockTaskTitle: z.boolean().optional(),
    showClockTimeDisplay: z.boolean().optional(),
    showDifficultySelector: z.boolean().optional(),
  })
  .strict();
export type KangurGameRuntimeRendererProps = z.infer<
  typeof kangurGameRuntimeRendererPropsSchema
>;
