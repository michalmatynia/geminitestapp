import { z } from 'zod';

import {
  KANGUR_TTS_DEFAULT_LOCALE,
  KANGUR_TTS_DEFAULT_VOICE,
  kangurLessonNarrationVoiceSchema,
  type KangurLessonNarrationVoice,
} from '@/shared/contracts/kangur';

const nonEmptyTrimmedString = z.string().trim().min(1);

export const KANGUR_LESSON_AUDIO_CACHE_SETTING_KEY = 'kangur_lesson_audio_v1';
export const KANGUR_TTS_DEFAULT_MODEL = 'gpt-4o-mini-tts';
export { KANGUR_TTS_DEFAULT_LOCALE, KANGUR_TTS_DEFAULT_VOICE };
export const kangurLessonTtsVoiceSchema = kangurLessonNarrationVoiceSchema;
export type KangurLessonTtsVoice = KangurLessonNarrationVoice;

export const KANGUR_TTS_VOICE_OPTIONS: ReadonlyArray<{
  value: KangurLessonTtsVoice;
  label: string;
}> = [
  { value: 'coral', label: 'Coral' },
  { value: 'sage', label: 'Sage' },
  { value: 'verse', label: 'Verse' },
  { value: 'ash', label: 'Ash' },
] as const;

export const kangurLessonNarrationSegmentSchema = z.object({
  id: nonEmptyTrimmedString.max(120),
  text: nonEmptyTrimmedString.max(4_000),
});
export type KangurLessonNarrationSegment = z.infer<typeof kangurLessonNarrationSegmentSchema>;

export const kangurLessonNarrationScriptSchema = z.object({
  lessonId: nonEmptyTrimmedString.max(120),
  title: nonEmptyTrimmedString.max(120),
  description: z.string().trim().max(240).default(''),
  locale: z.string().trim().min(2).max(16).default(KANGUR_TTS_DEFAULT_LOCALE),
  segments: z.array(kangurLessonNarrationSegmentSchema).min(1).max(32),
});
export type KangurLessonNarrationScript = z.infer<typeof kangurLessonNarrationScriptSchema>;

export const kangurLessonTtsRequestSchema = z.object({
  script: kangurLessonNarrationScriptSchema,
  voice: kangurLessonTtsVoiceSchema.default(KANGUR_TTS_DEFAULT_VOICE),
  forceRegenerate: z.boolean().optional().default(false),
});
export type KangurLessonTtsRequest = z.infer<typeof kangurLessonTtsRequestSchema>;

export const kangurLessonTtsStatusRequestSchema = z.object({
  script: kangurLessonNarrationScriptSchema,
  voice: kangurLessonTtsVoiceSchema.default(KANGUR_TTS_DEFAULT_VOICE),
});
export type KangurLessonTtsStatusRequest = z.infer<typeof kangurLessonTtsStatusRequestSchema>;

export const kangurLessonAudioSegmentSchema = kangurLessonNarrationSegmentSchema.extend({
  audioUrl: nonEmptyTrimmedString.max(2_048),
  createdAt: z.string().datetime({ offset: true }),
});
export type KangurLessonAudioSegment = z.infer<typeof kangurLessonAudioSegmentSchema>;

export const kangurLessonTtsAudioResponseSchema = z.object({
  mode: z.literal('audio'),
  voice: kangurLessonTtsVoiceSchema,
  segments: z.array(kangurLessonAudioSegmentSchema).min(1).max(32),
});
export type KangurLessonTtsAudioResponse = z.infer<typeof kangurLessonTtsAudioResponseSchema>;

export const kangurLessonTtsFallbackReasonSchema = z.enum([
  'empty_script',
  'tts_unavailable',
  'generation_failed',
]);
export type KangurLessonTtsFallbackReason = z.infer<
  typeof kangurLessonTtsFallbackReasonSchema
>;

export const kangurLessonTtsFallbackResponseSchema = z.object({
  mode: z.literal('fallback'),
  reason: kangurLessonTtsFallbackReasonSchema,
  message: nonEmptyTrimmedString.max(240),
  segments: z.array(kangurLessonNarrationSegmentSchema).min(1).max(32).default([]),
});
export type KangurLessonTtsFallbackResponse = z.infer<
  typeof kangurLessonTtsFallbackResponseSchema
>;

export const kangurLessonTtsResponseSchema = z.union([
  kangurLessonTtsAudioResponseSchema,
  kangurLessonTtsFallbackResponseSchema,
]);
export type KangurLessonTtsResponse = z.infer<typeof kangurLessonTtsResponseSchema>;

export const kangurLessonTtsStatusStateSchema = z.enum([
  'ready',
  'missing',
  'tts_unavailable',
]);
export type KangurLessonTtsStatusState = z.infer<typeof kangurLessonTtsStatusStateSchema>;

export const kangurLessonTtsStatusResponseSchema = z.object({
  state: kangurLessonTtsStatusStateSchema,
  voice: kangurLessonTtsVoiceSchema,
  latestCreatedAt: z.string().datetime({ offset: true }).nullable(),
  message: z.string().trim().max(240),
  segments: z.array(kangurLessonAudioSegmentSchema).max(32).default([]),
});
export type KangurLessonTtsStatusResponse = z.infer<typeof kangurLessonTtsStatusResponseSchema>;

export const kangurLessonAudioCacheEntrySchema = z.object({
  audioUrl: nonEmptyTrimmedString.max(2_048),
  voice: kangurLessonTtsVoiceSchema,
  model: nonEmptyTrimmedString.max(80),
  textHash: nonEmptyTrimmedString.max(160),
  createdAt: nonEmptyTrimmedString.max(40),
});
export type KangurLessonAudioCacheEntry = z.infer<typeof kangurLessonAudioCacheEntrySchema>;

export const kangurLessonAudioCacheSchema = z.record(
  z.string().trim().min(1).max(160),
  kangurLessonAudioCacheEntrySchema
);
export type KangurLessonAudioCache = z.infer<typeof kangurLessonAudioCacheSchema>;
