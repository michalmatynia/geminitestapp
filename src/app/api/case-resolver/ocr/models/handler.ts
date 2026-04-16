import { type NextRequest, NextResponse } from 'next/server';

import type { CaseResolverOcrModelsResponse } from '@/shared/contracts/case-resolver/ocr';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { listBrainModels } from '@/shared/lib/ai-brain/server-model-catalog';

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
