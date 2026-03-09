import { NextRequest, NextResponse } from 'next/server';

import { resolveImageStudioContextRegistryEnvelope } from '@/features/ai/image-studio/context-registry/server';
import { buildImageStudioWorkspaceSystemPrompt } from '@/features/ai/image-studio/context-registry/workspace-prompt';
import {
  IMAGE_STUDIO_SETTINGS_KEY,
  parsePersistedImageStudioSettings,
} from '@/features/ai/server';
import { auth } from '@/features/auth/server';
import {
  imageStudioUiExtractorRequestSchema,
  imageStudioUiExtractorResponseSchema,
} from '@/shared/contracts/image-studio';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { authError, internalError } from '@/shared/errors/app-error';
import { getSettingValue } from '@/shared/lib/ai/server-settings';
import { resolveBrainExecutionConfigForCapability } from '@/shared/lib/ai-brain/server';
import {
  runBrainChatCompletion,
  supportsBrainJsonMode,
} from '@/shared/lib/ai-brain/server-runtime-client';
import { parseJsonBody } from '@/shared/lib/api/parse-json';

export async function POST_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const session = await auth();
  const hasAccess =
    session?.user?.isElevated || session?.user?.permissions?.includes('ai_paths.manage');
  if (!hasAccess) throw authError('Unauthorized.');

  const parsed = await parseJsonBody(req, imageStudioUiExtractorRequestSchema, {
    logPrefix: 'image-studio.ui-extractor.POST',
  });
  if (!parsed.ok) return parsed.response;

  const settingsRaw = (await getSettingValue(IMAGE_STUDIO_SETTINGS_KEY)) as
    | string
    | null
    | undefined;
  const settings = parsePersistedImageStudioSettings(settingsRaw);
  const temperature = settings.uiExtractor.temperature ?? 0.2;
  const maxOutputTokens = settings.uiExtractor.max_output_tokens ?? 800;

  const contextRegistry = await resolveImageStudioContextRegistryEnvelope(
    parsed.data.contextRegistry ?? null
  );
  const contextRegistryPrompt = buildImageStudioWorkspaceSystemPrompt({
    registryBundle: contextRegistry?.resolved,
    taskLabel: 'prompt parameter UI control selection',
    extraInstructions:
      'Prefer controls that match the current prompt draft, selected slot workflow, and operator-facing generation settings.',
  });
  const systemPrompt = [
    'You map prompt parameters to UI controls.',
    'Return ONLY JSON matching: { "suggestions": [{ path, control, reason?, confidence? }] }.',
    'Controls must be one of: auto, checkbox, buttons, select, slider, number, text, textarea, json, rgb, tuple2.',
    'Prefer: booleans->checkbox, enums->buttons/select, 0..1 or bounded numbers->slider,',
    'short strings->text, long/multiline strings->textarea, arrays/objects->json, RGB arrays->rgb, 2-number arrays->tuple2.',
    'Use confidence 0..1 (optional).',
    contextRegistryPrompt,
  ]
    .filter(Boolean)
    .join('\n');

  const userPrompt = [
    'Prompt:',
    parsed.data.prompt,
    '',
    'Parameters (path, value, spec):',
    JSON.stringify(parsed.data.params, null, 2),
  ].join('\n');

  const brainConfig = await resolveBrainExecutionConfigForCapability('image_studio.ui_extractor', {
    defaultTemperature: temperature,
    defaultMaxTokens: maxOutputTokens,
    defaultSystemPrompt: systemPrompt,
    runtimeKind: 'validation',
  });

  const response = await runBrainChatCompletion({
    modelId: brainConfig.modelId,
    temperature: brainConfig.temperature,
    maxTokens: brainConfig.maxTokens,
    jsonMode: supportsBrainJsonMode(brainConfig.modelId),
    messages: [
      { role: 'system', content: brainConfig.systemPrompt },
      { role: 'user', content: userPrompt },
    ],
  });

  const raw = response.text ?? '';
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    throw internalError('Model did not return valid JSON.', { raw });
  }

  const validated = imageStudioUiExtractorResponseSchema.safeParse(json);
  if (!validated.success) {
    throw internalError('Invalid UI extractor response shape.', {
      issues: validated.error.flatten(),
    });
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
