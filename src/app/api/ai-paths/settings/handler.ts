import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import {
  deleteAiPathsSettings,
  listAiPathsSettings,
  upsertAiPathsSetting,
  upsertAiPathsSettingsBulk,
} from '@/features/ai/ai-paths/server';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { badRequestError } from '@/shared/errors/app-error';

const settingPayloadSchema = z.object({
  key: z
    .string()
    .trim()
    .min(1)
    .refine((value) => value.startsWith('ai_paths_'), {
      message: 'AI Paths setting keys must start with "ai_paths_".',
    }),
  value: z.string(),
});

const settingsBulkPayloadSchema = z.object({
  items: z.array(settingPayloadSchema).min(1),
});

const deletePayloadSchema = z
  .object({
    key: z.string().trim().min(1).optional(),
    keys: z.array(z.string().trim().min(1)).min(1).optional(),
  })
  .refine(
    (value) =>
      Boolean(value.key) || Boolean(value.keys && value.keys.length > 0),
    { message: 'Provide "key" or non-empty "keys".' },
  );

export async function GET_handler(
  _req: NextRequest,
  _ctx: ApiHandlerContext,
): Promise<Response> {
  const settings = await listAiPathsSettings();
  return NextResponse.json(settings, {
    headers: {
      'Cache-Control': 'private, max-age=10, stale-while-revalidate=30',
    },
  });
}

export async function POST_handler(
  req: NextRequest,
  _ctx: ApiHandlerContext,
): Promise<Response> {
  const rawBody = await req.text();
  let body: unknown = {};
  if (rawBody) {
    try {
      body = JSON.parse(rawBody);
    } catch {
      throw badRequestError('Invalid JSON body.');
    }
  }

  const parsedBulk = settingsBulkPayloadSchema.safeParse(body);
  if (parsedBulk.success) {
    await upsertAiPathsSettingsBulk(parsedBulk.data.items);
    return NextResponse.json({ success: true });
  }

  const parsedSingle = settingPayloadSchema.safeParse(body);
  if (parsedSingle.success) {
    await upsertAiPathsSetting(parsedSingle.data.key, parsedSingle.data.value);
    return NextResponse.json({ success: true });
  }
  throw badRequestError('Invalid AI Paths settings payload.');
}

export async function DELETE_handler(
  req: NextRequest,
  _ctx: ApiHandlerContext,
): Promise<Response> {
  const rawBody = await req.text();
  let body: unknown = {};
  if (rawBody) {
    try {
      body = JSON.parse(rawBody);
    } catch {
      throw badRequestError('Invalid JSON body.');
    }
  }

  const parsed = deletePayloadSchema.safeParse(body);
  if (!parsed.success) {
    throw badRequestError('Invalid AI Paths settings delete payload.');
  }
  const keys = [
    ...(parsed.data.key ? [parsed.data.key] : []),
    ...(parsed.data.keys ?? []),
  ];
  const deletedCount = await deleteAiPathsSettings(keys);
  return NextResponse.json({ deletedCount });
}
