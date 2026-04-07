import { createHash } from 'crypto';
import fs from 'fs/promises';

import type { ContextRegistryConsumerEnvelope } from '@/shared/contracts/ai-context-registry';
import { readBrainProviderCredential } from '@/shared/lib/ai-brain/provider-credentials';
import { readStoredSettingValue } from '@/shared/lib/ai-brain/server';
import { getDiskPathFromPublicPath } from '@/shared/lib/files/services/image-file-service';
import { ErrorSystem } from '@/features/kangur/shared/utils/observability/error-system';
import { parseJsonSetting } from '@/features/kangur/shared/utils';

import { buildKangurLessonTtsContextSignature } from '../context-registry/instructions';
import {
  kangurLessonAudioCacheSchema,
  KANGUR_LESSON_AUDIO_CACHE_SETTING_KEY,
  KANGUR_TTS_DEFAULT_MODEL,
} from '../contracts';

import type {
  KangurLessonAudioSegment,
  KangurLessonAudioCache,
  KangurLessonAudioCacheEntry,
  KangurLessonNarrationScript,
  KangurLessonTtsVoice,
} from '../contracts';

export const createSha256 = (value: string): string => createHash('sha256').update(value).digest('hex');

export const buildSegmentCacheKey = (input: {
  locale: string;
  voice: KangurLessonTtsVoice;
  text: string;
  contextSignature?: string | null;
}): string =>
  createSha256(
    JSON.stringify({
      version: 1,
      model: KANGUR_TTS_DEFAULT_MODEL,
      locale: input.locale,
      voice: input.voice,
      text: input.text,
      ...(input.contextSignature ? { contextSignature: input.contextSignature } : {}),
    })
  ).slice(0, 40);

export const parseAudioCache = (raw: string | null): KangurLessonAudioCache => {
  const parsed = parseJsonSetting<unknown>(raw, {});
  const result = kangurLessonAudioCacheSchema.safeParse(parsed);
  return result.success ? result.data : {};
};

const isLocalPublicPath = (value: string): boolean => value.startsWith('/uploads/');

const resolveLocalAudioDiskPath = (publicPath: string): string => getDiskPathFromPublicPath(publicPath);

export const doesCachedAudioExist = async (entry: KangurLessonAudioCacheEntry): Promise<boolean> => {
  if (!isLocalPublicPath(entry.audioUrl)) {
    return true;
  }

  try {
    await fs.stat(resolveLocalAudioDiskPath(entry.audioUrl));
    return true;
  } catch (error) {
    void ErrorSystem.captureException(error);
    return false;
  }
};

export const resolveCachedAudioSegments = async (input: {
  script: KangurLessonNarrationScript;
  voice: KangurLessonTtsVoice;
  contextRegistry?: ContextRegistryConsumerEnvelope | null;
}): Promise<KangurLessonAudioSegment[] | null> => {
  const cache = parseAudioCache(
    await readStoredSettingValue(KANGUR_LESSON_AUDIO_CACHE_SETTING_KEY)
  );
  const contextSignature = buildKangurLessonTtsContextSignature(input.contextRegistry?.resolved);
  const segments: KangurLessonAudioSegment[] = [];

  for (const segment of input.script.segments) {
    const cacheKey = buildSegmentCacheKey({
      locale: input.script.locale,
      voice: input.voice,
      text: segment.text,
      contextSignature,
    });
    const existingEntry = cache[cacheKey] ?? null;
    const canReuseEntry =
      existingEntry?.voice === input.voice &&
      existingEntry.model === KANGUR_TTS_DEFAULT_MODEL &&
      existingEntry.textHash === createSha256(segment.text) &&
      (await doesCachedAudioExist(existingEntry));

    if (!canReuseEntry) {
      return null;
    }

    segments.push({
      id: segment.id,
      text: segment.text,
      audioUrl: existingEntry.audioUrl,
      createdAt: existingEntry.createdAt,
    });
  }

  return segments;
};

export const resolveOpenAiApiKey = async (): Promise<string | null> => {
  const resolved = await readBrainProviderCredential('openai');
  return resolved.apiKey;
};
