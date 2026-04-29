import { type NextRequest } from 'next/server';

import {
  listMongoFilemakerJobApplications,
  requireFilemakerMailAdminSession,
} from '@/features/filemaker/server';
import { badRequestError } from '@/shared/errors/app-error';

const readSearchParam = (url: URL, key: string): string | null => {
  const value = url.searchParams.get(key)?.trim() ?? '';
  return value.length > 0 ? value : null;
};

const readLimit = (url: URL): number | undefined => {
  const raw = url.searchParams.get('limit')?.trim() ?? '';
  if (raw.length === 0) return undefined;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : undefined;
};

export async function getHandler(req: NextRequest): Promise<Response> {
  await requireFilemakerMailAdminSession();
  const url = new URL(req.url);
  const organizationId = readSearchParam(url, 'organizationId');
  const jobListingId = readSearchParam(url, 'jobListingId');
  const personId = readSearchParam(url, 'personId');

  if (organizationId === null && jobListingId === null && personId === null) {
    throw badRequestError('organizationId, jobListingId, or personId is required.');
  }

  const applications = await listMongoFilemakerJobApplications({
    jobListingId,
    limit: readLimit(url),
    organizationId,
    personId,
  });
  return Response.json({ applications });
}
