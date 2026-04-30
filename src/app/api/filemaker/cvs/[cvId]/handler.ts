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
  coreStrengths: z.unknown().optional(),
  experienceHighlightPatches: z.unknown().optional(),
  highlightTechnologyTerms: z.unknown().optional(),
  jobListingId: z.string().nullable().optional(),
  professionalSummary: z.string().nullable().optional(),
  selectedTechnicalEnvironment: z.unknown().optional(),
  sourceCvRecordId: z.string().nullable().optional(),
  sourceCvTitle: z.string().nullable().optional(),
  status: z.enum(['draft', 'published', 'archived']).optional(),
  tailoringPatch: z.unknown().optional(),
  tailoringScope: z.unknown().optional(),
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
  const cvId = resolveCvId(ctx);
  const result: JsonParseResult<z.infer<typeof cvPatchSchema>> = await parseJsonBody(
    req,
    cvPatchSchema,
    { logPrefix: 'filemaker.cvs.[cvId].PATCH' }
  );
  if (!result.ok) return result.response;
  const existingCv = await requireMongoFilemakerCvById(cvId);
  const submittedFullBodyFields = [
    result.data.bodyBlocks !== undefined ? 'bodyBlocks' : null,
    result.data.bodyHtml !== undefined ? 'bodyHtml' : null,
    result.data.bodyText !== undefined ? 'bodyText' : null,
  ].filter((field): field is string => field !== null);
  const ignoredFields =
    existingCv.bodyBlocksEditable === false ? submittedFullBodyFields : [];
  const cv = await updateMongoFilemakerCv(cvId, result.data);
  return Response.json({
    cv,
    meta: {
      canonicalEditMode: cv.canonicalEditMode ?? 'bodyBlocks',
      ignoredFields,
    },
  });
}

export async function deleteHandler(_req: NextRequest, ctx: ApiHandlerContext): Promise<Response> {
  await requireFilemakerMailAdminSession();
  await deleteMongoFilemakerCv(resolveCvId(ctx));
  return new Response(null, { status: 204 });
}
