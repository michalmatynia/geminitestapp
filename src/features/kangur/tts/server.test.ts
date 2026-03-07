import { beforeEach, describe, expect, it, vi } from 'vitest';

import { KANGUR_LESSON_AUDIO_CACHE_SETTING_KEY } from './contracts';

const {
  fsStatMock,
  fsMkdirMock,
  fsWriteFileMock,
  audioSpeechCreateMock,
  openAiConstructorMock,
  readStoredSettingValueMock,
  upsertStoredSettingValueMock,
  uploadToConfiguredStorageMock,
} = vi.hoisted(() => ({
  fsStatMock: vi.fn(),
  fsMkdirMock: vi.fn(),
  fsWriteFileMock: vi.fn(),
  audioSpeechCreateMock: vi.fn(),
  openAiConstructorMock: vi.fn(),
  readStoredSettingValueMock: vi.fn(),
  upsertStoredSettingValueMock: vi.fn(),
  uploadToConfiguredStorageMock: vi.fn(),
}));

vi.mock('fs/promises', () => ({
  default: {
    stat: fsStatMock,
    mkdir: fsMkdirMock,
    writeFile: fsWriteFileMock,
  },
  stat: fsStatMock,
  mkdir: fsMkdirMock,
  writeFile: fsWriteFileMock,
}));

vi.mock('openai', () => ({
  default: class OpenAIMock {
    audio = {
      speech: {
        create: audioSpeechCreateMock,
      },
    };

    constructor(config: unknown) {
      openAiConstructorMock(config);
    }
  },
}));

vi.mock('@/shared/lib/ai-brain/server', () => ({
  readStoredSettingValue: readStoredSettingValueMock,
  upsertStoredSettingValue: upsertStoredSettingValueMock,
}));

vi.mock('@/shared/lib/files/services/storage/file-storage-service', async () => {
  const actual =
    await vi.importActual<typeof import('@/shared/lib/files/services/storage/file-storage-service')>(
      '@/shared/lib/files/services/storage/file-storage-service'
    );

  return {
    ...actual,
    uploadToConfiguredStorage: uploadToConfiguredStorageMock,
  };
});

import { ensureKangurLessonNarrationAudio, inspectKangurLessonNarrationAudio } from './server';

const createLessonScript = (text = 'To jest lekcja zegara.') => ({
  lessonId: 'clock',
  title: 'Nauka zegara',
  description: '',
  locale: 'pl-PL',
  segments: [{ id: 'segment-1', text }],
});

const primeCachedAudioManifest = async (text = 'To jest lekcja zegara.'): Promise<{
  cacheValue: string;
  createdAt: string;
}> => {
  let cacheValue: string | null = null;

  uploadToConfiguredStorageMock.mockResolvedValueOnce({
    filepath: '/uploads/kangur/tts/existing.mp3',
    source: 'local',
    mirroredLocally: true,
  });
  upsertStoredSettingValueMock.mockImplementationOnce(async (_key: string, value: string) => {
    cacheValue = value;
    return true;
  });
  readStoredSettingValueMock.mockImplementation(async (key: string): Promise<string | null> => {
    if (key === 'openai_api_key') return 'test-openai-key';
    if (key === KANGUR_LESSON_AUDIO_CACHE_SETTING_KEY) return cacheValue;
    return null;
  });

  await ensureKangurLessonNarrationAudio({
    script: createLessonScript(text),
    voice: 'coral',
  });

  if (!cacheValue) {
    throw new Error('Expected cached audio manifest to be persisted.');
  }

  const parsedCache = JSON.parse(cacheValue) as Record<string, { createdAt: string }>;
  const firstEntry = Object.values(parsedCache)[0];
  if (!firstEntry?.createdAt) {
    throw new Error('Expected cached audio manifest to include createdAt.');
  }

  return {
    cacheValue,
    createdAt: firstEntry.createdAt,
  };
};

describe('kangur tts server', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    fsStatMock.mockResolvedValue(undefined);
    fsMkdirMock.mockResolvedValue(undefined);
    fsWriteFileMock.mockResolvedValue(undefined);
    audioSpeechCreateMock.mockResolvedValue({
      arrayBuffer: async (): Promise<ArrayBuffer> =>
        Uint8Array.from([1, 2, 3, 4]).buffer as ArrayBuffer,
    });
    uploadToConfiguredStorageMock.mockResolvedValue({
      filepath: '/uploads/kangur/tts/generated.mp3',
      source: 'local',
      mirroredLocally: true,
    });
    upsertStoredSettingValueMock.mockResolvedValue(true);
  });

  it('falls back when no OpenAI key is configured', async () => {
    readStoredSettingValueMock.mockImplementation(async (key: string): Promise<string | null> => {
      if (key === 'openai_api_key') return null;
      return null;
    });

    const result = await ensureKangurLessonNarrationAudio({
      script: {
        lessonId: 'clock',
        title: 'Nauka zegara',
        description: '',
        locale: 'pl-PL',
        segments: [{ id: 'segment-1', text: 'To jest lekcja zegara.' }],
      },
      voice: 'coral',
    });

    expect(result).toEqual({
      mode: 'fallback',
      reason: 'tts_unavailable',
      message: 'Neural TTS is not configured, so browser narration fallback will be used.',
      segments: [{ id: 'segment-1', text: 'To jest lekcja zegara.' }],
    });
    expect(openAiConstructorMock).not.toHaveBeenCalled();
  });

  it('generates audio and caches the manifest when no cached asset exists', async () => {
    readStoredSettingValueMock.mockImplementation(async (key: string): Promise<string | null> => {
      if (key === 'openai_api_key') return 'test-openai-key';
      if (key === KANGUR_LESSON_AUDIO_CACHE_SETTING_KEY) return null;
      return null;
    });

    const result = await ensureKangurLessonNarrationAudio({
      script: {
        lessonId: 'clock',
        title: 'Nauka zegara',
        description: '',
        locale: 'pl-PL',
        segments: [{ id: 'segment-1', text: 'To jest lekcja zegara.' }],
      },
      voice: 'coral',
    });

    expect(openAiConstructorMock).toHaveBeenCalledWith({ apiKey: 'test-openai-key' });
    expect(audioSpeechCreateMock).toHaveBeenCalledTimes(1);
    expect(audioSpeechCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        instructions: expect.stringContaining('Polish'),
      })
    );
    expect(uploadToConfiguredStorageMock).toHaveBeenCalledTimes(1);
    expect(upsertStoredSettingValueMock).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      mode: 'audio',
      voice: 'coral',
      segments: [
        expect.objectContaining({
          id: 'segment-1',
          text: 'To jest lekcja zegara.',
          audioUrl: '/uploads/kangur/tts/generated.mp3',
          createdAt: expect.any(String),
        }),
      ],
    });
  });

  it('reuses cached local audio when the asset still exists', async () => {
    const text = 'To jest lekcja zegara.';
    const { cacheValue, createdAt } = await primeCachedAudioManifest(text);

    vi.clearAllMocks();
    fsStatMock.mockResolvedValue(undefined);
    readStoredSettingValueMock.mockImplementation(async (key: string): Promise<string | null> => {
      if (key === 'openai_api_key') return 'test-openai-key';
      if (key === KANGUR_LESSON_AUDIO_CACHE_SETTING_KEY) return cacheValue;
      return null;
    });

    const result = await ensureKangurLessonNarrationAudio({
      script: createLessonScript(text),
      voice: 'coral',
    });

    expect(fsStatMock).toHaveBeenCalledTimes(1);
    expect(audioSpeechCreateMock).not.toHaveBeenCalled();
    expect(uploadToConfiguredStorageMock).not.toHaveBeenCalled();
    expect(upsertStoredSettingValueMock).not.toHaveBeenCalled();
    expect(result).toEqual({
      mode: 'audio',
      voice: 'coral',
      segments: [
        {
          id: 'segment-1',
          text,
          audioUrl: '/uploads/kangur/tts/existing.mp3',
          createdAt,
        },
      ],
    });
  });

  it('passes the lesson locale into synthesis instructions', async () => {
    readStoredSettingValueMock.mockImplementation(async (key: string): Promise<string | null> => {
      if (key === 'openai_api_key') return 'test-openai-key';
      if (key === KANGUR_LESSON_AUDIO_CACHE_SETTING_KEY) return null;
      return null;
    });

    await ensureKangurLessonNarrationAudio({
      script: {
        lessonId: 'counting',
        title: 'Counting',
        description: '',
        locale: 'en-US',
        segments: [{ id: 'segment-1', text: 'Let us count from one to five.' }],
      },
      voice: 'coral',
    });

    expect(audioSpeechCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        instructions: expect.stringContaining('English'),
      })
    );
  });

  it('reports ready when all cached audio segments already exist', async () => {
    const text = 'To jest lekcja zegara.';
    const { cacheValue, createdAt } = await primeCachedAudioManifest(text);

    vi.clearAllMocks();
    fsStatMock.mockResolvedValue(undefined);
    readStoredSettingValueMock.mockImplementation(async (key: string): Promise<string | null> => {
      if (key === KANGUR_LESSON_AUDIO_CACHE_SETTING_KEY) return cacheValue;
      return null;
    });

    const result = await inspectKangurLessonNarrationAudio({
      script: createLessonScript(text),
      voice: 'coral',
    });

    expect(result).toEqual({
      state: 'ready',
      voice: 'coral',
      latestCreatedAt: createdAt,
      message: 'Cached audio is available for this lesson draft.',
      segments: [
        {
          id: 'segment-1',
          text,
          audioUrl: '/uploads/kangur/tts/existing.mp3',
          createdAt,
        },
      ],
    });
  });
});
