import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { createMilkbarAsset3DFromLink } from '@/features/viewer3d/server';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { parseJsonBody } from '@/shared/lib/api/parse-json';

const linkToFileSchema = z.object({
  name: z.string().trim().optional(),
  tags: z.array(z.string().trim().min(1)).optional(),
  url: z.string().trim().min(1),
});

const resolveModelUrl = (req: NextRequest, url: string): string => {
  try {
    return new URL(url, req.nextUrl.origin).toString();
  } catch {
    return url;
  }
};

export async function postHandler(
  req: NextRequest,
  _ctx: ApiHandlerContext
): Promise<Response> {
  const parsed = await parseJsonBody(req, linkToFileSchema, {
    logPrefix: 'assets3d.milkbar.link-to-file.POST',
  });
  if (!parsed.ok) return parsed.response;

  const asset = await createMilkbarAsset3DFromLink({
    name: parsed.data.name,
    tags: parsed.data.tags,
    url: resolveModelUrl(req, parsed.data.url),
  });

  return NextResponse.json({ asset }, { status: 201 });
}
