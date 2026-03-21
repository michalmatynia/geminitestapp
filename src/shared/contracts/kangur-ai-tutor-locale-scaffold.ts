import { z } from 'zod';

export const KANGUR_AI_TUTOR_TRANSLATION_STATUSES = [
  'source-locale',
  'missing',
  'source-copy',
  'scaffolded',
  'manual',
] as const;

export const kangurAiTutorTranslationStatusSchema = z.enum(
  KANGUR_AI_TUTOR_TRANSLATION_STATUSES
);
export type KangurAiTutorTranslationStatusDto = z.infer<
  typeof kangurAiTutorTranslationStatusSchema
>;
