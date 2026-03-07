import 'server-only';

import fs from 'fs/promises';
import path from 'path';
import { createHash } from 'crypto';

import OpenAI from 'openai';

import { IMAGE_STUDIO_OPENAI_API_KEY_KEY } from '@/shared/contracts/image-studio';
import { readStoredSettingValue, upsertStoredSettingValue } from '@/shared/lib/ai-brain/server';
import { uploadsRoot } from '@/shared/lib/files/constants';
import { uploadToConfiguredStorage } from '@/shared/lib/files/services/storage/file-storage-service';
import { parseJsonSetting, serializeSetting } from '@/shared/utils';

import type {
  KangurLessonAudioSegment,
  KangurLessonAudioCache,
  KangurLessonAudioCacheEntry,
  KangurLessonNarrationScript,
  KangurLessonTtsResponse,
  KangurLessonTtsStatusResponse,
  KangurLessonTtsVoice,
} from './contracts';
import {
  kangurLessonAudioCacheSchema,
  KANGUR_LESSON_AUDIO_CACHE_SETTING_KEY,
  KANGUR_TTS_DEFAULT_MODEL,
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

const buildTtsInstructions = (locale: string): string =>
  [
    resolveLocaleInstruction(locale),
    'Use a warm, realistic, calm teaching voice.',
    'Keep the pacing patient and clear.',
    'Read numbers, dates, and short lists carefully.',
    'Avoid sounding robotic or overly dramatic.',
  ].join(' ');

const createSha256 = (value: string): string => createHash('sha256').update(value).digest('hex');

const buildSegmentCacheKey = (input: {
  locale: string;
  voice: KangurLessonTtsVoice;
  text: string;
}): string =>
  createSha256(
    JSON.stringify({
      version: 1,
      model: KANGUR_TTS_DEFAULT_MODEL,
      locale: input.locale,
      voice: input.voice,
      text: input.text,
    })
  ).slice(0, 40);

const resolveOpenAiApiKey = async (): Promise<string | null> => {
  const apiKey =
    (await readStoredSettingValue(IMAGE_STUDIO_OPENAI_API_KEY_KEY))?.trim() ||
    (await readStoredSettingValue('openai_api_key'))?.trim() ||
    process.env['OPENAI_API_KEY']?.trim() ||
    '';
  return apiKey || null;
};

const parseAudioCache = (raw: string | null): KangurLessonAudioCache => {
  const parsed = parseJsonSetting<unknown>(raw, {});
  const result = kangurLessonAudioCacheSchema.safeParse(parsed);
  return result.success ? result.data : {};
};

const isLocalPublicPath = (value: string): boolean => value.startsWith('/uploads/');

const resolveLocalAudioDiskPath = (publicPath: string): string =>
  path.join(process.cwd(), 'public', publicPath.replace(/^\/+/, ''));

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
}): Promise<string> => {
  const response = await input.client.audio.speech.create({
    model: KANGUR_TTS_DEFAULT_MODEL,
    voice: input.voice,
    input: input.text,
    instructions: buildTtsInstructions(input.locale),
    response_format: 'mp3',
  });
  const audioBuffer = Buffer.from(await response.arrayBuffer());
  return await persistAudioBuffer({
    lessonId: input.lessonId,
    cacheKey: input.cacheKey,
    buffer: audioBuffer,
  });
};

const resolveCachedAudioSegments = async (input: {
  script: KangurLessonNarrationScript;
  voice: KangurLessonTtsVoice;
}): Promise<KangurLessonAudioSegment[] | null> => {
  const cache = parseAudioCache(
    await readStoredSettingValue(KANGUR_LESSON_AUDIO_CACHE_SETTING_KEY)
  );
  const segments: KangurLessonAudioSegment[] = [];

  for (const segment of input.script.segments) {
    const cacheKey = buildSegmentCacheKey({
      locale: input.script.locale,
      voice: input.voice,
      text: segment.text,
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

export const ensureKangurLessonNarrationAudio = async (input: {
  script: KangurLessonNarrationScript;
  voice: KangurLessonTtsVoice;
  forceRegenerate?: boolean;
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
  let cacheChanged = false;

  try {
    const segments: KangurLessonAudioSegment[] = [];

    for (const segment of input.script.segments) {
      const cacheKey = buildSegmentCacheKey({
        locale: input.script.locale,
        voice: input.voice,
        text: segment.text,
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
  } catch {
    return {
      mode: 'fallback',
      reason: 'generation_failed',
      message:
        'Neural narration could not be prepared right now, so browser narration fallback will be used.',
      segments: input.script.segments,
    };
  }
};
