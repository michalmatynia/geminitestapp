import { z } from 'zod';

export const KANGUR_TUTOR_MOOD_IDS = [
  'neutral',
  'thinking',
  'focused',
  'careful',
  'curious',
  'encouraging',
  'motivating',
  'playful',
  'calm',
  'patient',
  'gentle',
  'reassuring',
  'empathetic',
  'supportive',
  'reflective',
  'determined',
  'confident',
  'proud',
  'happy',
  'celebrating',
] as const;

export const kangurTutorMoodIdSchema = z.enum(KANGUR_TUTOR_MOOD_IDS);
export type KangurTutorMoodId = z.infer<typeof kangurTutorMoodIdSchema>;

type KangurTutorMoodPreset = {
  id: KangurTutorMoodId;
};

export const KANGUR_TUTOR_MOOD_PRESETS: readonly KangurTutorMoodPreset[] = [
  { id: 'neutral' },
  { id: 'thinking' },
  { id: 'focused' },
  { id: 'careful' },
  { id: 'curious' },
  { id: 'encouraging' },
  { id: 'motivating' },
  { id: 'playful' },
  { id: 'calm' },
  { id: 'patient' },
  { id: 'gentle' },
  { id: 'reassuring' },
  { id: 'empathetic' },
  { id: 'supportive' },
  { id: 'reflective' },
  { id: 'determined' },
  { id: 'confident' },
  { id: 'proud' },
  { id: 'happy' },
  { id: 'celebrating' },
] as const;

export const DEFAULT_KANGUR_TUTOR_MOOD_ID: KangurTutorMoodId = 'neutral';

export const kangurAiTutorLearnerMoodSchema = z.object({
  currentMoodId: kangurTutorMoodIdSchema.default(DEFAULT_KANGUR_TUTOR_MOOD_ID),
  baselineMoodId: kangurTutorMoodIdSchema.default(DEFAULT_KANGUR_TUTOR_MOOD_ID),
  confidence: z.number().min(0).max(1).default(0.25),
  lastComputedAt: z.string().datetime({ offset: true }).nullable().default(null),
  lastReasonCode: z.string().trim().max(80).nullable().default(null),
});

export type KangurAiTutorLearnerMood = z.infer<typeof kangurAiTutorLearnerMoodSchema>;

export const createDefaultKangurAiTutorLearnerMood = (
  overrides?: Partial<KangurAiTutorLearnerMood> | null
): KangurAiTutorLearnerMood => ({
  currentMoodId: overrides?.currentMoodId ?? DEFAULT_KANGUR_TUTOR_MOOD_ID,
  baselineMoodId: overrides?.baselineMoodId ?? DEFAULT_KANGUR_TUTOR_MOOD_ID,
  confidence: overrides?.confidence ?? 0.25,
  lastComputedAt: overrides?.lastComputedAt ?? null,
  lastReasonCode: overrides?.lastReasonCode ?? null,
});
