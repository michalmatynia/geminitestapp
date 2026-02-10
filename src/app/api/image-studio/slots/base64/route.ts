export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { badRequestError } from '@/shared/errors/app-error';
import { apiHandler } from '@/shared/lib/api/api-handler';
import type { ApiHandlerContext } from '@/shared/types/api/api';

const payloadSchema = z.object({
  url: z.string().trim().min(1),
});

const isDataUrl = (value: string): boolean => value.startsWith('data:');

const toDataUrl = (buffer: Buffer, mimetype: string): string =>
  `data:${mimetype};base64,${buffer.toString('base64')}`;

async function POST_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const body = (await req.json().catch(() => null)) as unknown;
  const parsed = payloadSchema.safeParse(body);
  if (!parsed.success) {
    throw badRequestError('Invalid payload', { errors: parsed.error.format() });
  }

  const url = parsed.data.url.trim();
  if (isDataUrl(url)) {
    return NextResponse.json({ dataUrl: url });
  }

  const res = await fetch(url);
  if (!res.ok) {
    throw badRequestError(`Failed to fetch (${res.status})`);
  }
  const buffer = Buffer.from(await res.arrayBuffer());
  const contentType = res.headers.get('content-type') || 'image/jpeg';
  const dataUrl = toDataUrl(buffer, contentType);

  return NextResponse.json({ dataUrl });
}

export const POST = apiHandler(
  async (req: NextRequest, ctx: ApiHandlerContext): Promise<Response> => POST_handler(req, ctx),
  { source: 'image-studio.slots.base64.POST' }
);
