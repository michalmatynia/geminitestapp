import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { injectCodeWithAI } from '@/features/playwright/server/ai-step-service';

export const playwrightAiInjectRequestSchema = z.object({
  goal: z.string().min(1),
  systemPrompt: z.string().nullable().optional(),
  context: z.object({
    iteration: z.number().int().min(1),
    maxIterations: z.number().int().min(1),
    url: z.string(),
    dom: z.string().nullable().optional(),
    priorEvaluation: z.string().nullable().optional(),
    priorInjectorReasoning: z.string().nullable().optional(),
  }),
});

export type PlaywrightAiInjectRequest = z.infer<typeof playwrightAiInjectRequestSchema>;

export type PlaywrightAiInjectResponse = {
  code: string;
  done: boolean;
  reasoning: string;
};

export async function POST_handler(
  _req: NextRequest,
  ctx: ApiHandlerContext
): Promise<Response> {
  const body = ctx.body as PlaywrightAiInjectRequest;

  const result = await injectCodeWithAI({
    goal: body.goal,
    systemPrompt: body.systemPrompt,
    context: {
      iteration: body.context.iteration,
      maxIterations: body.context.maxIterations,
      url: body.context.url,
      dom: body.context.dom,
      priorEvaluation: body.context.priorEvaluation,
      priorInjectorReasoning: body.context.priorInjectorReasoning,
    },
  });

  return NextResponse.json({
    code: result.code,
    done: result.done,
    reasoning: result.reasoning,
    modelId: result.modelId,
  } satisfies PlaywrightAiInjectResponse & { modelId: string });
}
