import { type NextRequest } from 'next/server';
import { z } from 'zod';

import {
  deleteMongoFilemakerCv,
  requireFilemakerMailAdminSession,
  requireMongoFilemakerCvById,
  updateMongoFilemakerCv,
} from '@/features/filemaker/server';
import type { ApiHandlerContext, JsonParseResult } from '@/shared/contracts/ui/api';
import { parseJsonBody } from '@/shared/lib/api/parse-json';

const cvPatchSchema = z.object({
  bodyBlocks: z.unknown().optional(),
  bodyHtml: z.string().nullable().optional(),
  bodyText: z.string().nullable().optional(),
  status: z.enum(['draft', 'published', 'archived']).optional(),
  template: z.enum(['classic']).optional(),
  title: z.string().optional(),
});

const resolveCvId = (ctx: ApiHandlerContext): string => {
  const value = ctx.params?.['cvId'];
  const raw = Array.isArray(value) ? (value[0] ?? '') : value;
  return decodeURIComponent(raw ?? '');
};

export async function getHandler(_req: NextRequest, ctx: ApiHandlerContext): Promise<Response> {
  await requireFilemakerMailAdminSession();
  const cv = await requireMongoFilemakerCvById(resolveCvId(ctx));
  return Response.json({ cv });
}

export async function patchHandler(req: NextRequest, ctx: ApiHandlerContext): Promise<Response> {
  await requireFilemakerMailAdminSession();
  const result: JsonParseResult<z.infer<typeof cvPatchSchema>> = await parseJsonBody(
    req,
    cvPatchSchema,
    { logPrefix: 'filemaker.cvs.[cvId].PATCH' }
  );
  if (!result.ok) return result.response;
  const cv = await updateMongoFilemakerCv(resolveCvId(ctx), result.data);
  return Response.json({ cv });
}

export async function deleteHandler(_req: NextRequest, ctx: ApiHandlerContext): Promise<Response> {
  await requireFilemakerMailAdminSession();
  await deleteMongoFilemakerCv(resolveCvId(ctx));
  return new Response(null, { status: 204 });
}
