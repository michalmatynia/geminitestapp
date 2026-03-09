import 'server-only';

import { createHash } from 'crypto';
import fs from 'fs/promises';
import path from 'path';

import OpenAI from 'openai';

import type { ContextRegistryConsumerEnvelope } from '@/shared/contracts/ai-context-registry';
import { readBrainProviderCredential } from '@/shared/lib/ai-brain/provider-credentials';
import { readStoredSettingValue, upsertStoredSettingValue } from '@/shared/lib/ai-brain/server';
import { uploadsRoot } from '@/shared/lib/files/server-constants';
import { getDiskPathFromPublicPath } from '@/shared/lib/files/services/image-file-service';
import { uploadToConfiguredStorage } from '@/shared/lib/files/services/storage/file-storage-service';
import { logSystemEvent } from '@/shared/lib/observability/system-logger';
import { parseJsonSetting, serializeSetting } from '@/shared/utils';

import {
  buildKangurLessonTtsContextInstructions,
  buildKangurLessonTtsContextSignature,
} from './context-registry/instructions';
import {
  kangurLessonAudioCacheSchema,
  KANGUR_LESSON_AUDIO_CACHE_SETTING_KEY,
  KANGUR_TTS_DEFAULT_MODEL,
} from './contracts';

import type {
  KangurLessonAudioSegment,
  KangurLessonAudioCache,
  KangurLessonAudioCacheEntry,
  KangurLessonNarrationScript,
  KangurLessonTtsProbeResponse,
  KangurLessonTtsResponse,
  KangurLessonTtsStatusResponse,
  KangurLessonTtsVoice,
} from './contracts';

const resolveLocaleInstruction = (locale: string): string => {
  const normalizedLocale = locale.trim().toLowerCase();
  if (!normalizedLocale || normalizedLocale.startsWith('pl')) {
    return 'Speak in natural Polish for children learning math.';
  }
  if (normalizedLocale.startsWith('en')) {
    return 'Speak in natural English for children learning math.';
  }

  return `Speak naturally in the requested locale ${locale.trim()}.`;
};

const buildTtsInstructions = (input: {
  locale: string;
  contextRegistry?: ContextRegistryConsumerEnvelope | null;
}): string =>
  [
    resolveLocaleInstruction(input.locale),
    'Use a warm, realistic, calm teaching voice.',
    'Keep the pacing patient and clear.',
    'Read numbers, dates, and short lists carefully.',
    'Avoid sounding robotic or overly dramatic.',
    buildKangurLessonTtsContextInstructions(input.contextRegistry?.resolved),
  ]
    .filter(Boolean)
    .join(' ');

const createSha256 = (value: string): string => createHash('sha256').update(value).digest('hex');

const buildSegmentCacheKey = (input: {
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

type KangurLessonTtsFailureStage =
  | 'openai_speech'
  | 'audio_buffer'
  | 'storage_upload'
  | 'unknown';

class KangurLessonTtsGenerationError extends Error {
  readonly stage: KangurLessonTtsFailureStage;

  constructor(stage: KangurLessonTtsFailureStage, cause: unknown) {
    super(cause instanceof Error ? cause.message : String(cause));
    this.name = 'KangurLessonTtsGenerationError';
    this.stage = stage;
    this.cause = cause;
  }
}

const getKangurLessonTtsFailureStage = (error: unknown): KangurLessonTtsFailureStage =>
  error instanceof KangurLessonTtsGenerationError ? error.stage : 'unknown';

const getRootCauseError = (error: unknown): unknown =>
  error instanceof KangurLessonTtsGenerationError ? error.cause : error;

const getErrorName = (error: unknown): string =>
  error instanceof Error ? error.name : typeof error === 'string' ? 'Error' : 'UnknownError';

const getErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

const getErrorStatus = (error: unknown): number | null => {
  const rootCause = getRootCauseError(error);
  if (!rootCause || typeof rootCause !== 'object' || !('status' in rootCause)) {
    return null;
  }

  const value = rootCause.status;
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
};

const getErrorCode = (error: unknown): string | null => {
  const rootCause = getRootCauseError(error);
  if (!rootCause || typeof rootCause !== 'object' || !('code' in rootCause)) {
    return null;
  }

  const value = rootCause.code;
  return typeof value === 'string' && value.trim().length > 0 ? value : null;
};

const resolveOpenAiApiKey = async (): Promise<string | null> => {
  const resolved = await readBrainProviderCredential('openai');
  return resolved.apiKey;
};

const parseAudioCache = (raw: string | null): KangurLessonAudioCache => {
  const parsed = parseJsonSetting<unknown>(raw, {});
  const result = kangurLessonAudioCacheSchema.safeParse(parsed);
  return result.success ? result.data : {};
};

const isLocalPublicPath = (value: string): boolean => value.startsWith('/uploads/');

const resolveLocalAudioDiskPath = (publicPath: string): string => getDiskPathFromPublicPath(publicPath);

const doesCachedAudioExist = async (entry: KangurLessonAudioCacheEntry): Promise<boolean> => {
  if (!isLocalPublicPath(entry.audioUrl)) {
    return true;
  }

  try {
    await fs.stat(resolveLocalAudioDiskPath(entry.audioUrl));
    return true;
  } catch {
    return false;
  }
};

const persistAudioBuffer = async (input: {
  lessonId: string;
  cacheKey: string;
  buffer: Buffer;
}): Promise<string> => {
  const filename = `${input.cacheKey}.mp3`;
  const diskDir = path.join(uploadsRoot, 'kangur', 'tts');
  const publicPath = `/uploads/kangur/tts/${filename}`;
  const localDiskPath = path.join(diskDir, filename);

  const storageResult = await uploadToConfiguredStorage({
    buffer: input.buffer,
    filename,
    mimetype: 'audio/mpeg',
    publicPath,
    category: 'kangur-tts',
    projectId: input.lessonId,
    folder: 'tts',
    writeLocalCopy: async (): Promise<void> => {
      await fs.mkdir(diskDir, { recursive: true });
      await fs.writeFile(localDiskPath, input.buffer);
    },
  });

  return storageResult.filepath;
};

const synthesizeSegmentAudio = async (input: {
  client: OpenAI;
  lessonId: string;
  locale: string;
  voice: KangurLessonTtsVoice;
  text: string;
  cacheKey: string;
  contextRegistry?: ContextRegistryConsumerEnvelope | null;
}): Promise<string> => {
  let response: Awaited<ReturnType<typeof input.client.audio.speech.create>>;

  try {
    response = await input.client.audio.speech.create({
      model: KANGUR_TTS_DEFAULT_MODEL,
      voice: input.voice,
      input: input.text,
      instructions: buildTtsInstructions({
        locale: input.locale,
        contextRegistry: input.contextRegistry,
      }),
      response_format: 'mp3',
    });
  } catch (error) {
    throw new KangurLessonTtsGenerationError('openai_speech', error);
  }

  let audioBuffer: Buffer;
  try {
    audioBuffer = Buffer.from(await response.arrayBuffer());
  } catch (error) {
    throw new KangurLessonTtsGenerationError('audio_buffer', error);
  }

  try {
    return await persistAudioBuffer({
      lessonId: input.lessonId,
      cacheKey: input.cacheKey,
      buffer: audioBuffer,
    });
  } catch (error) {
    throw new KangurLessonTtsGenerationError('storage_upload', error);
  }
};

const resolveCachedAudioSegments = async (input: {
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
    }).catch(() => undefined);

    return {
      mode: 'fallback',
      reason: 'generation_failed',
      message:
        'Neural narration could not be prepared right now, so browser narration fallback will be used.',
      segments: input.script.segments,
    };
  }
};
