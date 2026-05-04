import { type NextRequest } from 'next/server';
import { z } from 'zod';

import {
  deleteMongoFilemakerJobApplication,
  removeMongoFilemakerJobApplicationLogEntry,
  requireFilemakerMailAdminSession,
  requireMongoFilemakerJobApplicationById,
  updateMongoFilemakerJobApplicationActiveArtifacts,
  updateMongoFilemakerJobApplicationStatus,
} from '@/features/filemaker/server';
import type { ApiHandlerContext, JsonParseResult } from '@/shared/contracts/ui/api';
import { parseJsonBody } from '@/shared/lib/api/parse-json';

const jobApplicationPatchSchema = z.object({
  activeArtifacts: z
    .object({
      applicationEmailVersionId: z.string().trim().nullable().optional(),
      coverLetterVersionId: z.string().trim().nullable().optional(),
      tailoredCvVersionId: z.string().trim().nullable().optional(),
    })
    .optional(),
  removeLogEntryId: z.string().trim().min(1).optional(),
  status: z.enum(['draft', 'ready', 'applied', 'rejected', 'archived']).optional(),
});

type JobApplicationParams = {
  applicationId: string | string[];
};

const resolveApplicationId = (params: JobApplicationParams): string => {
  const value = params.applicationId;
  const raw = Array.isArray(value) ? (value[0] ?? '') : value;
  return decodeURIComponent(raw);
};

export async function getHandler(
  _req: NextRequest,
  _ctx: ApiHandlerContext,
  params: JobApplicationParams
): Promise<Response> {
  await requireFilemakerMailAdminSession();
  const application = await requireMongoFilemakerJobApplicationById(resolveApplicationId(params));
  return Response.json({ application });
}

export async function patchHandler(
  req: NextRequest,
  _ctx: ApiHandlerContext,
  params: JobApplicationParams
): Promise<Response> {
  await requireFilemakerMailAdminSession();
  const result: JsonParseResult<z.infer<typeof jobApplicationPatchSchema>> = await parseJsonBody(
    req,
    jobApplicationPatchSchema,
    { logPrefix: 'filemaker.job-applications.[applicationId].PATCH' }
  );
  if (!result.ok) return result.response;

  const applicationId = resolveApplicationId(params);
  const hasStatusUpdate = result.data.status !== undefined;
  const hasActiveArtifactsUpdate = result.data.activeArtifacts !== undefined;
  const hasLogEntryRemoval = result.data.removeLogEntryId !== undefined;
  let updatedApplication = await requireMongoFilemakerJobApplicationById(applicationId);

  if (hasLogEntryRemoval) {
    updatedApplication = await removeMongoFilemakerJobApplicationLogEntry(
      applicationId,
      result.data.removeLogEntryId
    );
  }
  if (hasStatusUpdate) {
    updatedApplication = await updateMongoFilemakerJobApplicationStatus(applicationId, result.data.status);
  }
  if (hasActiveArtifactsUpdate) {
    updatedApplication = await updateMongoFilemakerJobApplicationActiveArtifacts(applicationId, {
      applicationEmailVersionId: result.data.activeArtifacts.applicationEmailVersionId ?? null,
      coverLetterVersionId: result.data.activeArtifacts.coverLetterVersionId ?? null,
      tailoredCvVersionId: result.data.activeArtifacts.tailoredCvVersionId ?? null,
    });
  }
  return Response.json({ application: updatedApplication });
}

export async function deleteHandler(
  _req: NextRequest,
  _ctx: ApiHandlerContext,
  params: JobApplicationParams
): Promise<Response> {
  await requireFilemakerMailAdminSession();
  await deleteMongoFilemakerJobApplication(resolveApplicationId(params));
  return new Response(null, { status: 204 });
}
