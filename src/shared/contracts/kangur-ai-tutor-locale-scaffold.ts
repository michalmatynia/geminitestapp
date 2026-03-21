import { z } from 'zod';

const kangurAiTutorLocaleSchema = z.string().trim().min(1).max(16);

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

export const kangurAiTutorLocaleTranslationStatusSchema = z.object({
  locale: kangurAiTutorLocaleSchema,
  status: kangurAiTutorTranslationStatusSchema,
});
export type KangurAiTutorLocaleTranslationStatusDto = z.infer<
  typeof kangurAiTutorLocaleTranslationStatusSchema
>;
