export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { z } from 'zod';

import { getBrainAssignmentForFeature } from '@/features/ai/brain/server';
import {
  IMAGE_STUDIO_SETTINGS_KEY,
  parseImageStudioSettings,
} from '@/features/ai/image-studio/utils/studio-settings';
import { auth } from '@/features/auth/server';
import { getSettingValue } from '@/features/products/services/aiDescriptionService';
import { authError, configurationError } from '@/shared/errors/app-error';
import { apiHandler } from '@/shared/lib/api/api-handler';
import { parseJsonBody } from '@/shared/lib/api/parse-json';
import type { ApiHandlerContext } from '@/shared/types/api/api';

const payloadSchema = z.object({
  prompt: z.string().trim().min(1),
});

const responseSchema = z.object({
  params: z.record(z.string(), z.any()),
});

async function POST_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const session = await auth();
  const hasAccess =
    session?.user?.isElevated ||
    session?.user?.permissions?.includes('ai_paths.manage');
  if (!hasAccess) throw authError('Unauthorized.');

  const parsed = await parseJsonBody(req, payloadSchema, { logPrefix: 'image-studio.prompt-extract.POST' });
  if (!parsed.ok) return parsed.response;

  const apiKey = (await getSettingValue('openai_api_key')) ?? process.env['OPENAI_API_KEY'] ?? null;
  if (!apiKey) {
    throw configurationError('OpenAI API key is missing. Set it in /admin/settings/brain.');
  }

  const settingsRaw = await getSettingValue(IMAGE_STUDIO_SETTINGS_KEY);
  const settings = parseImageStudioSettings(settingsRaw);
  const brainAssignment = await getBrainAssignmentForFeature('image_studio');
  if (!brainAssignment.enabled) {
    throw configurationError('AI Brain is disabled for Image Studio.');
  }
  if (brainAssignment.provider === 'agent') {
    throw configurationError('Image Studio prompt extraction does not support agent providers yet.');
  }
  const model =
    brainAssignment.modelId ||
    settings.promptExtraction.gpt.model ||
    (await getSettingValue('openai_model')) ||
    'gpt-4o-mini';
  if (!model.trim()) {
    throw configurationError('Prompt extraction model is missing. Set it in Image Studio settings.');
  }

  const temperature = brainAssignment.temperature ?? settings.promptExtraction.gpt.temperature ?? 0;
  const top_p = settings.promptExtraction.gpt.top_p ?? undefined;
  const max_output_tokens = brainAssignment.maxTokens ?? settings.promptExtraction.gpt.max_output_tokens ?? 1200;

  const client = new OpenAI({ apiKey });

  const systemPrompt = [
    'You extract a JSON params object from a prompt.',
    'If the prompt includes a params object (JS-like or JSON), extract it and normalize to strict JSON.',
    'If the prompt does not include a params object, infer a best-effort params object from explicit key/value settings only; otherwise return an empty object.',
    'Return ONLY JSON matching: { "params": { ... } } with no extra text.',
    'Preserve booleans, numbers, arrays, and nested objects when present.',
  ].join('\n');

  const userPrompt = ['Prompt:', parsed.data.prompt].join('\n');

  const response = await client.chat.completions.create({
    model,
    temperature,
    max_tokens: max_output_tokens,
    ...(top_p !== undefined ? { top_p } : {}),
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
  });

  const raw = response.choices[0]?.message?.content ?? '';
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    throw new Error('Model did not return valid JSON.');
  }

  const validated = responseSchema.safeParse(json);
  if (!validated.success) {
    throw new Error('Invalid prompt extraction response shape.');
  }

  return NextResponse.json(validated.data);
}

export const POST = apiHandler(
  async (req: NextRequest, ctx: ApiHandlerContext): Promise<Response> => POST_handler(req, ctx),
  { source: 'image-studio.prompt-extract.POST' }
);
