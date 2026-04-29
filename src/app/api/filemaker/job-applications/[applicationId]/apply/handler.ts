import { type NextRequest } from 'next/server';
import { z } from 'zod';

import {
  getLatestMongoFilemakerJobApplicationApplyRun,
  requireFilemakerMailAdminSession,
} from '@/features/filemaker/server';
import { startFilemakerJobApplicationApplyRun } from '@/features/filemaker/server/filemaker-job-application-apply';
import type { ApiHandlerContext, JsonParseResult } from '@/shared/contracts/ui/api';
import { parseJsonBody } from '@/shared/lib/api/parse-json';

const applyRunRequestSchema = z.object({
  activeArtifacts: z
    .object({
      applicationEmailVersionId: z.string().trim().nullable().optional(),
      coverLetterVersionId: z.string().trim().nullable().optional(),
      tailoredCvVersionId: z.string().trim().nullable().optional(),
    })
    .optional(),
  force: z.boolean().optional(),
  mode: z.enum(['review', 'submit']).optional(),
});

type JobApplicationApplyParams = {
  applicationId: string | string[];
};

const resolveApplicationId = (params: JobApplicationApplyParams): string => {
  const value = params.applicationId;
  const raw = Array.isArray(value) ? (value[0] ?? '') : value;
  return decodeURIComponent(raw);
};

export async function getHandler(
  _req: NextRequest,
  _ctx: ApiHandlerContext,
  params: JobApplicationApplyParams
): Promise<Response> {
  await requireFilemakerMailAdminSession();
  const run = await getLatestMongoFilemakerJobApplicationApplyRun(resolveApplicationId(params));
  return Response.json({ run });
}

export async function postHandler(
  req: NextRequest,
  _ctx: ApiHandlerContext,
  params: JobApplicationApplyParams
): Promise<Response> {
  await requireFilemakerMailAdminSession();
  const result: JsonParseResult<z.infer<typeof applyRunRequestSchema>> = await parseJsonBody(
    req,
    applyRunRequestSchema,
    { logPrefix: 'filemaker.job-applications.[applicationId].apply.POST' }
  );
  if (!result.ok) return result.response;

  const run = await startFilemakerJobApplicationApplyRun({
    activeArtifacts: result.data.activeArtifacts,
    applicationId: resolveApplicationId(params),
    force: result.data.force,
    mode: result.data.mode,
  });
  return Response.json({ run });
}
