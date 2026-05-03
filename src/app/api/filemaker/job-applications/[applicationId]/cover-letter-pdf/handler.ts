import { type NextRequest } from 'next/server';

import {
  createFilemakerJobApplicationCoverLetterPdfResponse,
  requireFilemakerMailAdminSession,
} from '@/features/filemaker/server';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';

type JobApplicationCoverLetterPdfParams = {
  applicationId: string | string[];
};

const resolveApplicationId = (params: JobApplicationCoverLetterPdfParams): string => {
  const value = params.applicationId;
  const raw = Array.isArray(value) ? (value[0] ?? '') : value;
  return decodeURIComponent(raw);
};

export async function postHandler(
  req: NextRequest,
  _ctx: ApiHandlerContext,
  params: JobApplicationCoverLetterPdfParams
): Promise<Response> {
  await requireFilemakerMailAdminSession();
  const url = new URL(req.url);
  const coverLetterVersionId = url.searchParams.get('coverLetterVersionId')?.trim() ?? null;
  return createFilemakerJobApplicationCoverLetterPdfResponse({
    applicationId: resolveApplicationId(params),
    coverLetterVersionId,
  });
}
