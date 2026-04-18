import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { evaluateStepWithAI } from '@/features/playwright/server/ai-step-service';

export const playwrightAiStepEvaluateRequestSchema = z.object({
  /** Per-step system prompt override. Falls back to Brain-configured system prompt, then default. */
  systemPrompt: z.string().nullable().optional(),
  inputSource: z.enum(['screenshot', 'html', 'text_content', 'selector_text']),
  data: z.string().min(1),
});

export type PlaywrightAiStepEvaluateRequest = z.infer<typeof playwrightAiStepEvaluateRequestSchema>;

export type PlaywrightAiStepEvaluateResponse = {
  output: string;
  modelId: string;
};

export async function POST_handler(
  _req: NextRequest,
  ctx: ApiHandlerContext
): Promise<Response> {
  const body = ctx.body as PlaywrightAiStepEvaluateRequest;

  try {
    const result = await evaluateStepWithAI({
      inputSource: body.inputSource,
      data: body.data,
      systemPrompt: body.systemPrompt,
    });

    return NextResponse.json(result satisfies PlaywrightAiStepEvaluateResponse);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes('does not support image inputs')) {
      return NextResponse.json({ error: message }, { status: 422 });
    }
    throw error;
  }
}
