import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { resolveBrainExecutionConfigForCapability } from '@/shared/lib/ai-brain/segments/api';
import {
  isBrainModelVisionCapable,
  runBrainChatCompletion,
} from '@/shared/lib/ai-brain/server-runtime-client';

const DEFAULT_SYSTEM_PROMPT = 'Evaluate the current page state and describe what you observe.';

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

  const brainConfig = await resolveBrainExecutionConfigForCapability(
    'playwright.ai_evaluator_step',
    {
      defaultSystemPrompt: DEFAULT_SYSTEM_PROMPT,
      defaultModelId: 'claude-sonnet-4-6',
    }
  );

  const modelId = brainConfig.modelId;
  const systemPrompt =
    body.systemPrompt?.trim() ||
    brainConfig.systemPrompt ||
    DEFAULT_SYSTEM_PROMPT;
  const { inputSource, data } = body;

  const isImageInput = inputSource === 'screenshot';

  if (isImageInput && !isBrainModelVisionCapable(modelId)) {
    return NextResponse.json(
      {
        error: `Model "${modelId}" does not support image inputs. Use a vision-capable model (e.g. claude-sonnet-4-6, gpt-4o, gemini-2.0-flash) for screenshot evaluation. Configure this in /admin/brain?tab=routing under Playwright.`,
      },
      { status: 422 }
    );
  }

  const userContent = isImageInput
    ? [
        {
          type: 'image_url' as const,
          image_url: { url: `data:image/png;base64,${data}` },
        },
        {
          type: 'text' as const,
          text: 'Evaluate the current state of the page based on this screenshot.',
        },
      ]
    : `${inputSource === 'html' ? 'Page HTML:\n' : inputSource === 'text_content' ? 'Page text content:\n' : 'Element text:\n'}${data}`;

  const result = await runBrainChatCompletion({
    modelId,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent },
    ],
    temperature: brainConfig.temperature ?? 0,
  });

  return NextResponse.json({
    output: result.text,
    modelId: result.modelId,
  } satisfies PlaywrightAiStepEvaluateResponse);
}
