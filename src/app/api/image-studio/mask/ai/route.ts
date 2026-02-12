export const runtime = 'nodejs';

import fs from 'fs/promises';
import path from 'path';

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
import { authError, configurationError, internalError } from '@/shared/errors/app-error';
import { apiHandler } from '@/shared/lib/api/api-handler';
import { parseJsonBody } from '@/shared/lib/api/parse-json';
import type { ApiHandlerContext } from '@/shared/types/api/api';

const payloadSchema = z.object({
  imagePath: z.string().trim().min(1),
  mode: z.enum(['bbox', 'polygon']).optional().default('bbox'),
});

async function POST_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const session = await auth();
  const hasAccess =
    session?.user?.isElevated ||
    session?.user?.permissions?.includes('ai_paths.manage');
  if (!hasAccess) throw authError('Unauthorized.');

  const parsed = await parseJsonBody(req, payloadSchema, { logPrefix: 'image-studio.mask.ai.POST' });
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

  const publicRoot = path.join(process.cwd(), 'public');
  const normalized = parsed.data.imagePath.replace(/^\/+/, '');
  const diskPath = path.resolve(publicRoot, normalized);
  const buffer = await fs.readFile(diskPath);
  const base64 = buffer.toString('base64');
  const ext = path.extname(diskPath).toLowerCase() === '.jpg' ? 'jpeg' : 'png';

  const client = new OpenAI({ apiKey });
  const model =
    settings.promptExtraction.gpt.model ||
    settings.uiExtractor.model ||
    'gpt-4o-mini';
  const response = await client.chat.completions.create({
    model,
    temperature: settings.uiExtractor.temperature ?? 0.1,
    messages: [
      {
        role: 'system',
        content: parsed.data.mode === 'polygon'
          ? 'Return only JSON: { "polygon": [{"x":0..1,"y":0..1}, ...] } for the main product. Use 12-32 points.'
          : 'Return only JSON: { "bbox": { "x":0..1, "y":0..1, "w":0..1, "h":0..1 } } for the main product.',
      },
      {
        role: 'user',
        content: [
          { type: 'text', text: parsed.data.mode === 'polygon' ? 'Detect the main product and return a tight polygon.' : 'Detect the main product and return a tight bounding box.' },
          { type: 'image_url', image_url: { url: `data:image/${ext};base64,${base64}` } },
        ],
      },
    ],
  });

  const raw = response.choices[0]?.message?.content ?? '';
  const json = JSON.parse(raw) as { bbox?: { x: number; y: number; w: number; h: number } };
  if (parsed.data.mode === 'polygon') {
    const polygon = (json as { polygon?: Array<{ x: number; y: number }> }).polygon;
    if (!polygon || polygon.length < 3) throw internalError('AI did not return a polygon.');
    return NextResponse.json({ polygon });
  }
  if (!json?.bbox) throw internalError('AI did not return a bbox.');
  return NextResponse.json({ bbox: json.bbox });
}

export const POST = apiHandler(
  async (req: NextRequest, ctx: ApiHandlerContext): Promise<Response> => POST_handler(req, ctx),
  { source: 'image-studio.mask.ai.POST' }
);
