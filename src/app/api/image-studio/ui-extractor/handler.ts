import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { z } from 'zod';

import {
  IMAGE_STUDIO_OPENAI_API_KEY_KEY,
  IMAGE_STUDIO_SETTINGS_KEY,
  parseImageStudioSettings,
} from '@/features/ai/image-studio/utils/studio-settings';
import { auth } from '@/features/auth/server';
import { getSettingValue } from '@/features/products/services/aiDescriptionService';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { authError, configurationError, internalError } from '@/shared/errors/app-error';
import { parseJsonBody } from '@/shared/lib/api/parse-json';

const uiControlEnum = z.enum([
  'auto',
  'checkbox',
  'buttons',
  'select',
  'slider',
  'number',
  'text',
  'textarea',
  'json',
  'rgb',
  'tuple2',
]);

const paramSpecSchema = z
  .object({
    kind: z.string().optional(),
    min: z.number().optional(),
    max: z.number().optional(),
    enumOptions: z.array(z.string()).optional(),
  })
  .partial();

const payloadSchema = z.object({
  prompt: z.string().trim().min(1),
  params: z.array(
    z.object({
      path: z.string().trim().min(1),
      value: z.unknown(),
      spec: paramSpecSchema.nullable().optional(),
    })
  ),
  mode: z.enum(['heuristic', 'ai', 'both']).optional().default('ai'),
});

const responseSchema = z.object({
  suggestions: z.array(
    z.object({
      path: z.string().trim().min(1),
      control: uiControlEnum,
      reason: z.string().trim().min(1).nullable().optional(),
      confidence: z.number().min(0).max(1).optional(),
    })
  ),
});

export async function POST_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const session = await auth();
  const hasAccess =
    session?.user?.isElevated ||
    session?.user?.permissions?.includes('ai_paths.manage');
  if (!hasAccess) throw authError('Unauthorized.');

  const parsed = await parseJsonBody(req, payloadSchema, { logPrefix: 'image-studio.ui-extractor.POST' });
  if (!parsed.ok) return parsed.response;

  const apiKey =
    (await getSettingValue(IMAGE_STUDIO_OPENAI_API_KEY_KEY))?.trim() ||
    (await getSettingValue('openai_api_key'))?.trim() ||
    process.env['OPENAI_API_KEY'] ||
    null;
  if (!apiKey) {
    throw configurationError('OpenAI API key is missing. Set it in Image Studio settings.');
  }

  const settingsRaw = await getSettingValue(IMAGE_STUDIO_SETTINGS_KEY);
  const settings = parseImageStudioSettings(settingsRaw);
  const model =
    settings.uiExtractor.model ||
    settings.promptExtraction.gpt.model ||
    (await getSettingValue('openai_model')) ||
    'gpt-4o-mini';
  const temperature = settings.uiExtractor.temperature ?? 0.2;
  const max_output_tokens = settings.uiExtractor.max_output_tokens ?? 800;

  const client = new OpenAI({ apiKey });

  const systemPrompt = [
    'You map prompt parameters to UI controls.',
    'Return ONLY JSON matching: { "suggestions": [{ path, control, reason?, confidence? }] }.',
    'Controls must be one of: auto, checkbox, buttons, select, slider, number, text, textarea, json, rgb, tuple2.',
    'Prefer: booleans->checkbox, enums->buttons/select, 0..1 or bounded numbers->slider,',
    'short strings->text, long/multiline strings->textarea, arrays/objects->json, RGB arrays->rgb, 2-number arrays->tuple2.',
    'Use confidence 0..1 (optional).',
  ].join('\n');

  const userPrompt = [
    'Prompt:',
    parsed.data.prompt,
    '',
    'Parameters (path, value, spec):',
    JSON.stringify(parsed.data.params, null, 2),
  ].join('\n');

  const response = await client.chat.completions.create({
    model,
    temperature,
    max_tokens: max_output_tokens,
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
    throw internalError('Model did not return valid JSON.', { raw });
  }

  const validated = responseSchema.safeParse(json);
  if (!validated.success) {
    throw internalError('Invalid UI extractor response shape.', { issues: validated.error.flatten() });
  }

  return NextResponse.json({
    suggestions: validated.data.suggestions.map((s) => ({
      path: s.path,
      valuePreview: '',
      control: s.control,
      options: [s.control],
      confidence: s.confidence ?? 0.6,
      reason: s.reason ?? null,
      source: 'ai',
    })),
  });
}
