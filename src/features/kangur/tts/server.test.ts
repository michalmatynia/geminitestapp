import { createHash } from 'crypto';

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

vi.mock('@/shared/lib/files/services/storage/file-storage-service', () => ({
  uploadToConfiguredStorage: uploadToConfiguredStorageMock,
}));

import { ensureKangurLessonNarrationAudio, inspectKangurLessonNarrationAudio } from './server';

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
    const cacheKey = createHash('sha256')
      .update(
        JSON.stringify({
          version: 1,
          model: 'gpt-4o-mini-tts',
          locale: 'pl-PL',
          voice: 'coral',
          text,
        })
      )
      .digest('hex')
      .slice(0, 40);
    const textHash = createHash('sha256').update(text).digest('hex');

    readStoredSettingValueMock.mockImplementation(async (key: string): Promise<string | null> => {
      if (key === 'openai_api_key') return 'test-openai-key';
      if (key === KANGUR_LESSON_AUDIO_CACHE_SETTING_KEY) {
        return JSON.stringify({
          [cacheKey]: {
            audioUrl: '/uploads/kangur/tts/existing.mp3',
            voice: 'coral',
            model: 'gpt-4o-mini-tts',
            textHash,
            createdAt: '2026-03-06T12:00:00.000Z',
          },
        });
      }
      return null;
    });

    const result = await ensureKangurLessonNarrationAudio({
      script: {
        lessonId: 'clock',
        title: 'Nauka zegara',
        description: '',
        locale: 'pl-PL',
        segments: [{ id: 'segment-1', text }],
      },
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
          text: 'To jest lekcja zegara.',
          audioUrl: '/uploads/kangur/tts/existing.mp3',
          createdAt: '2026-03-06T12:00:00.000Z',
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
    const cacheKey = createHash('sha256')
      .update(
        JSON.stringify({
          version: 1,
          model: 'gpt-4o-mini-tts',
          locale: 'pl-PL',
          voice: 'coral',
          text,
        })
      )
      .digest('hex')
      .slice(0, 40);
    const textHash = createHash('sha256').update(text).digest('hex');

    readStoredSettingValueMock.mockImplementation(async (key: string): Promise<string | null> => {
      if (key === KANGUR_LESSON_AUDIO_CACHE_SETTING_KEY) {
        return JSON.stringify({
          [cacheKey]: {
            audioUrl: '/uploads/kangur/tts/existing.mp3',
            voice: 'coral',
            model: 'gpt-4o-mini-tts',
            textHash,
            createdAt: '2026-03-06T12:00:00.000Z',
          },
        });
      }
      return null;
    });

    const result = await inspectKangurLessonNarrationAudio({
      script: {
        lessonId: 'clock',
        title: 'Nauka zegara',
        description: '',
        locale: 'pl-PL',
        segments: [{ id: 'segment-1', text }],
      },
      voice: 'coral',
    });

    expect(result).toEqual({
      state: 'ready',
      voice: 'coral',
      latestCreatedAt: '2026-03-06T12:00:00.000Z',
      message: 'Cached audio is available for this lesson draft.',
      segments: [
        {
          id: 'segment-1',
          text,
          audioUrl: '/uploads/kangur/tts/existing.mp3',
          createdAt: '2026-03-06T12:00:00.000Z',
        },
      ],
    });
  });
});
