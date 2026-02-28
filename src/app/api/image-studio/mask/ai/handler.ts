import fs from 'fs/promises';
import path from 'path';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { resolveBrainExecutionConfigForCapability } from '@/shared/lib/ai-brain/server';
import { runBrainChatCompletion } from '@/shared/lib/ai-brain/server-runtime-client';

import {
  IMAGE_STUDIO_SETTINGS_KEY,
  parseImageStudioSettings,
} from '@/features/ai/image-studio/studio-settings';
import { auth } from '@/features/auth/server';
import { getSettingValue } from '@/shared/lib/products/services/aiDescriptionService.settings';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { authError, internalError } from '@/shared/errors/app-error';
import { parseJsonBody } from '@/shared/lib/api/parse-json';

const payloadSchema = z.object({
  imagePath: z.string().trim().min(1),
  mode: z.enum(['bbox', 'polygon']).optional().default('bbox'),
});

export async function POST_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const session = await auth();
  const hasAccess =
    session?.user?.isElevated || session?.user?.permissions?.includes('ai_paths.manage');
  if (!hasAccess) throw authError('Unauthorized.');

  const parsed = await parseJsonBody(req, payloadSchema, {
    logPrefix: 'image-studio.mask.ai.POST',
  });
  if (!parsed.ok) return parsed.response;

  const settingsRaw = (await getSettingValue(IMAGE_STUDIO_SETTINGS_KEY)) as
    | string
    | null
    | undefined;
  const settings = parseImageStudioSettings(settingsRaw);

  const publicRoot = path.join(process.cwd(), 'public');
  const normalized = parsed.data.imagePath.replace(/^\/+/, '');
  const diskPath = path.resolve(publicRoot, normalized);
  const buffer = await fs.readFile(diskPath);
  const base64 = buffer.toString('base64');
  const ext = path.extname(diskPath).toLowerCase() === '.jpg' ? 'jpeg' : 'png';

  const systemPrompt =
    parsed.data.mode === 'polygon'
      ? 'Return only JSON: { "polygon": [{"x":0..1,"y":0..1}, ...] } for the main product. Use 12-32 points.'
      : 'Return only JSON: { "bbox": { "x":0..1, "y":0..1, "w":0..1, "h":0..1 } } for the main product.';
  const brainConfig = await resolveBrainExecutionConfigForCapability('image_studio.mask_ai', {
    defaultTemperature: settings.uiExtractor.temperature ?? 0.1,
    defaultMaxTokens: 800,
    defaultSystemPrompt: systemPrompt,
    runtimeKind: 'vision',
  });
  const response = await runBrainChatCompletion({
    modelId: brainConfig.modelId,
    temperature: brainConfig.temperature,
    maxTokens: brainConfig.maxTokens,
    messages: [
      {
        role: 'system',
        content: brainConfig.systemPrompt,
      },
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text:
              parsed.data.mode === 'polygon'
                ? 'Detect the main product and return a tight polygon.'
                : 'Detect the main product and return a tight bounding box.',
          },
          {
            type: 'image_url',
            image_url: { url: `data:image/${ext};base64,${base64}` },
          },
        ],
      },
    ],
  });

  const raw = response.text ?? '';
  const json = JSON.parse(raw) as { bbox?: { x: number; y: number; w: number; h: number } };
  if (parsed.data.mode === 'polygon') {
    const polygon = (json as { polygon?: Array<{ x: number; y: number }> }).polygon;
    if (!polygon || polygon.length < 3) throw internalError('AI did not return a polygon.');
    return NextResponse.json({ polygon });
  }
  if (!json?.bbox) throw internalError('AI did not return a bbox.');
  return NextResponse.json({ bbox: json.bbox });
}
