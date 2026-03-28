import { z } from 'zod';

import { kangurGameInstanceIdSchema } from './kangur-game-instances';
import { kangurGameIdSchema } from './kangur-games';
import { kangurLessonComponentIdSchema } from './kangur-lesson-constants';

const kangurClockLessonGameInitialModeSchema = z.enum(['practice', 'challenge']);
const kangurClockLessonGameSectionSchema = z.enum(['hours', 'minutes', 'combined']);

export const kangurLessonGameSectionClockSettingsSchema = z
  .object({
    clockSection: kangurClockLessonGameSectionSchema.optional(),
    initialMode: kangurClockLessonGameInitialModeSchema.optional(),
    showHourHand: z.boolean().optional(),
    showMinuteHand: z.boolean().optional(),
    showModeSwitch: z.boolean().optional(),
    showTaskTitle: z.boolean().optional(),
    showTimeDisplay: z.boolean().optional(),
  })
  .strict();
export type KangurLessonGameSectionClockSettings = z.infer<
  typeof kangurLessonGameSectionClockSettingsSchema
>;

export const kangurLessonGameSectionSettingsSchema = z
  .object({
    clock: kangurLessonGameSectionClockSettingsSchema.optional(),
  })
  .strict()
  .default({});
export type KangurLessonGameSectionSettings = z.infer<
  typeof kangurLessonGameSectionSettingsSchema
>;

export const kangurLessonGameSectionSchema = z.object({
  id: z.string().trim().min(1).max(120),
  lessonComponentId: kangurLessonComponentIdSchema,
  gameId: kangurGameIdSchema,
  instanceId: kangurGameInstanceIdSchema.optional(),
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().max(240).default(''),
  emoji: z.string().trim().min(1).max(12),
  sortOrder: z.number().int().min(0).max(1_000_000),
  enabled: z.boolean().default(true),
  settings: kangurLessonGameSectionSettingsSchema,
});
export type KangurLessonGameSection = z.infer<typeof kangurLessonGameSectionSchema>;

export const kangurLessonGameSectionsSchema = z.array(kangurLessonGameSectionSchema);
export type KangurLessonGameSections = z.infer<typeof kangurLessonGameSectionsSchema>;

export const kangurLessonGameSectionsReplacePayloadSchema = z.object({
  gameId: kangurGameIdSchema,
  sections: kangurLessonGameSectionsSchema,
});
export type KangurLessonGameSectionsReplacePayload = z.infer<
  typeof kangurLessonGameSectionsReplacePayloadSchema
>;
