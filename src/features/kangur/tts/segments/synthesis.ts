import type OpenAI from 'openai';
import type { ContextRegistryConsumerEnvelope } from '@/shared/contracts/ai-context-registry';
import { ErrorSystem } from '@/features/kangur/shared/utils/observability/error-system';
import { KANGUR_TTS_DEFAULT_MODEL } from '../contracts';
import type { KangurLessonTtsVoice } from '../contracts';
import { buildTtsInstructions } from './instructions';
import { KangurLessonTtsGenerationError } from './errors';
import { persistAudioBuffer } from './storage';

export const synthesizeSegmentAudio = async (input: {
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
    void ErrorSystem.captureException(error);
    throw new KangurLessonTtsGenerationError('openai_speech', error);
  }

  let audioBuffer: Buffer;
  try {
    audioBuffer = Buffer.from(await response.arrayBuffer());
  } catch (error) {
    void ErrorSystem.captureException(error);
    throw new KangurLessonTtsGenerationError('audio_buffer', error);
  }

  try {
    return await persistAudioBuffer({
      lessonId: input.lessonId,
      cacheKey: input.cacheKey,
      buffer: audioBuffer,
    });
  } catch (error) {
    void ErrorSystem.captureException(error);
    throw new KangurLessonTtsGenerationError('storage_upload', error);
  }
};
