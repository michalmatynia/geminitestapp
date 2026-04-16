import OpenAI from 'openai';

import type { ContextRegistryConsumerEnvelope } from '@/shared/contracts/ai-context-registry';
import { readStoredSettingValue, upsertStoredSettingValue } from '@/shared/lib/ai-brain/server';
import { logSystemEvent } from '@/shared/lib/observability/system-logger';
import { serializeSetting } from '@/features/kangur/shared/utils';
import { ErrorSystem } from '@/features/kangur/shared/utils/observability/error-system';

import { buildKangurLessonTtsContextSignature } from '../context-registry/instructions';
import {
  KANGUR_LESSON_AUDIO_CACHE_SETTING_KEY,
  KANGUR_TTS_DEFAULT_MODEL,
} from '../contracts';

import type {
  KangurLessonAudioSegment,
  KangurLessonNarrationScript,
  KangurLessonTtsProbeResponse,
  KangurLessonTtsResponse,
  KangurLessonTtsStatusResponse,
  KangurLessonTtsVoice,
} from '../contracts';

import {
  buildSegmentCacheKey,
  createSha256,
  doesCachedAudioExist,
  parseAudioCache,
  resolveCachedAudioSegments,
  resolveOpenAiApiKey,
} from './cache';
import {
  KangurLessonTtsGenerationError,
  getErrorCode,
  getErrorMessage,
  getErrorName,
  getErrorStatus,
  getKangurLessonTtsFailureStage,
} from './errors';
import { buildTtsInstructions } from './instructions';
import { synthesizeSegmentAudio } from './synthesis';

export const inspectKangurLessonNarrationAudio = async (input: {
  script: KangurLessonNarrationScript;
  voice: KangurLessonTtsVoice;
  contextRegistry?: ContextRegistryConsumerEnvelope | null;
}): Promise<KangurLessonTtsStatusResponse> => {
  if (input.script.segments.length === 0) {
    return {
      state: 'missing',
      voice: input.voice,
      latestCreatedAt: null,
      message: 'No lesson narration text is available for this lesson yet.',
      segments: [],
    };
  }

  const segments = await resolveCachedAudioSegments(input);
  if (segments) {
    const latestCreatedAt = segments.reduce<string | null>(
      (latest, segment) => (!latest || segment.createdAt > latest ? segment.createdAt : latest),
      null
    );

    return {
      state: 'ready',
      voice: input.voice,
      latestCreatedAt,
      message: 'Cached audio is available for this lesson draft.',
      segments,
    };
  }

  const apiKey = await resolveOpenAiApiKey();
  if (!apiKey) {
    return {
      state: 'tts_unavailable',
      voice: input.voice,
      latestCreatedAt: null,
      message: 'Neural TTS is not configured, so audio has not been generated for this lesson yet.',
      segments: [],
    };
  }

  return {
    state: 'missing',
    voice: input.voice,
    latestCreatedAt: null,
    message: 'Audio has not been generated for this lesson draft yet.',
    segments: [],
  };
};

export const probeKangurLessonNarrationBackend = async (input: {
  voice: KangurLessonTtsVoice;
  locale: string;
  text: string;
}): Promise<KangurLessonTtsProbeResponse> => {
  const checkedAt = new Date().toISOString();
  const apiKey = await resolveOpenAiApiKey();
  if (!apiKey) {
    return {
      ok: false,
      stage: 'config',
      voice: input.voice,
      model: KANGUR_TTS_DEFAULT_MODEL,
      checkedAt,
      message: 'Neural TTS is not configured for this workspace.',
      errorName: null,
      errorStatus: null,
      errorCode: null,
    };
  }

  const client = new OpenAI({ apiKey });

  try {
    let response: Awaited<ReturnType<typeof client.audio.speech.create>>;

    try {
      response = await client.audio.speech.create({
        model: KANGUR_TTS_DEFAULT_MODEL,
        voice: input.voice,
        input: input.text,
        instructions: buildTtsInstructions({ locale: input.locale }),
        response_format: 'mp3',
      });
    } catch (error) {
      throw new KangurLessonTtsGenerationError('openai_speech', error);
    }

    try {
      await response.arrayBuffer();
    } catch (error) {
      throw new KangurLessonTtsGenerationError('audio_buffer', error);
    }

    return {
      ok: true,
      stage: 'ready',
      voice: input.voice,
      model: KANGUR_TTS_DEFAULT_MODEL,
      checkedAt,
      message: 'Server narrator is ready to generate neural audio.',
      errorName: null,
      errorStatus: null,
      errorCode: null,
    };
  } catch (error) {
    void ErrorSystem.captureException(error);
    return {
      ok: false,
      stage: getKangurLessonTtsFailureStage(error),
      voice: input.voice,
      model: KANGUR_TTS_DEFAULT_MODEL,
      checkedAt,
      message: getErrorMessage(error),
      errorName: getErrorName(error),
      errorStatus: getErrorStatus(error),
      errorCode: getErrorCode(error),
    };
  }
};

export const ensureKangurLessonNarrationAudio = async (input: {
  script: KangurLessonNarrationScript;
  voice: KangurLessonTtsVoice;
  forceRegenerate?: boolean;
  contextRegistry?: ContextRegistryConsumerEnvelope | null;
}): Promise<KangurLessonTtsResponse> => {
  if (input.script.segments.length === 0) {
    return {
      mode: 'fallback',
      reason: 'empty_script',
      message: 'No lesson narration text is available for this lesson yet.',
      segments: [],
    };
  }

  const apiKey = await resolveOpenAiApiKey();
  if (!apiKey) {
    return {
      mode: 'fallback',
      reason: 'tts_unavailable',
      message: 'Neural TTS is not configured, so browser narration fallback will be used.',
      segments: input.script.segments,
    };
  }

  const client = new OpenAI({ apiKey });
  const cache = parseAudioCache(
    await readStoredSettingValue(KANGUR_LESSON_AUDIO_CACHE_SETTING_KEY)
  );
  const contextSignature = buildKangurLessonTtsContextSignature(input.contextRegistry?.resolved);
  let cacheChanged = false;

  try {
    const segments: KangurLessonAudioSegment[] = [];

    for (const segment of input.script.segments) {
      const cacheKey = buildSegmentCacheKey({
        locale: input.script.locale,
        voice: input.voice,
        text: segment.text,
        contextSignature,
      });
      const existingEntry = input.forceRegenerate ? null : (cache[cacheKey] ?? null);
      const canReuseEntry =
        existingEntry?.voice === input.voice &&
        existingEntry.model === KANGUR_TTS_DEFAULT_MODEL &&
        existingEntry.textHash === createSha256(segment.text) &&
        (await doesCachedAudioExist(existingEntry));

      const audioUrl = canReuseEntry
        ? existingEntry.audioUrl
        : await synthesizeSegmentAudio({
          client,
          lessonId: input.script.lessonId,
          locale: input.script.locale,
          voice: input.voice,
          text: segment.text,
          cacheKey,
          contextRegistry: input.contextRegistry,
        });

      if (!canReuseEntry) {
        const createdAt = new Date().toISOString();
        cache[cacheKey] = {
          audioUrl,
          voice: input.voice,
          model: KANGUR_TTS_DEFAULT_MODEL,
          textHash: createSha256(segment.text),
          createdAt,
        };
        cacheChanged = true;
      }

      const createdAt = canReuseEntry ? existingEntry.createdAt : cache[cacheKey]!.createdAt;
      segments.push({
        id: segment.id,
        text: segment.text,
        audioUrl,
        createdAt,
      });
    }

    if (cacheChanged) {
      await upsertStoredSettingValue(
        KANGUR_LESSON_AUDIO_CACHE_SETTING_KEY,
        serializeSetting(cache)
      );
    }

    return {
      mode: 'audio',
      voice: input.voice,
      segments,
    };
  } catch (error) {
    void ErrorSystem.captureException(error);
    void logSystemEvent({
      level: 'warn',
      source: 'kangur.tts.generationFailed',
      service: 'kangur.tts',
      message: 'Kangur lesson neural narration generation failed; browser fallback will be used.',
      error,
      context: {
        feature: 'kangur',
        lessonId: input.script.lessonId,
        locale: input.script.locale,
        voice: input.voice,
        forceRegenerate: input.forceRegenerate ?? false,
        segmentCount: input.script.segments.length,
        contextRegistryRefCount: input.contextRegistry?.refs.length ?? 0,
        contextRegistryDocumentCount: input.contextRegistry?.resolved?.documents.length ?? 0,
        failureStage: getKangurLessonTtsFailureStage(error),
        errorName: getErrorName(error),
        errorMessage: getErrorMessage(error),
        errorStatus: getErrorStatus(error),
        errorCode: getErrorCode(error),
      },
    }).catch((error) => {
      void ErrorSystem.captureException(error);
      return undefined;
    });

    return {
      mode: 'fallback',
      reason: 'generation_failed',
      message:
        'Neural narration could not be prepared right now, so browser narration fallback will be used.',
      segments: input.script.segments,
    };
  }
};
