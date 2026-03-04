import { NextRequest, NextResponse } from 'next/server';

import { listBrainModels } from '@/shared/lib/ai-brain/server-model-catalog';
import type { ApiHandlerContext } from '@/shared/contracts/ui';

type CaseResolverOcrModelKeySource = 'brain';

type CaseResolverOcrModelsResponse = {
  models: string[];
  ollamaModels: string[];
  otherModels: string[];
  keySource: CaseResolverOcrModelKeySource;
  warning?: {
    code: string;
    message: string;
  };
};

export async function GET_handler(_req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const payload = await listBrainModels({ family: 'ocr' });
  const ollamaModels = payload.models.filter((modelId: string): boolean => {
    const descriptor = payload.descriptors?.[modelId];
    return descriptor?.vendor === 'ollama';
  });
  const otherModels = payload.models.filter(
    (modelId: string): boolean => !ollamaModels.includes(modelId)
  );

  const response: CaseResolverOcrModelsResponse = {
    models: payload.models,
    ollamaModels,
    otherModels,
    keySource: 'brain',
    ...(payload.warning
      ? {
        warning: {
          code: payload.warning.code ?? 'BRAIN_WARNING',
          message: payload.warning.message ?? 'Brain model discovery warning.',
        },
      }
      : {}),
  };
  return NextResponse.json(response);
}
