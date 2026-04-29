import { type NextRequest } from 'next/server';

import {
  collapseLegacyMongoFilemakerJobApplicationsForListing,
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

const readBooleanSearchParam = (url: URL, key: string): boolean => {
  const raw = url.searchParams.get(key)?.trim().toLowerCase() ?? '';
  return raw === '1' || raw === 'true' || raw === 'yes';
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

  if (readBooleanSearchParam(url, 'normalizeLegacy') && organizationId !== null) {
    if (jobListingId !== null) {
      await collapseLegacyMongoFilemakerJobApplicationsForListing({
        jobListingId,
        organizationId,
        personId,
      });
    } else {
      const legacyCandidates = await listMongoFilemakerJobApplications({
        jobListingId: null,
        limit: readLimit(url),
        organizationId,
        personId,
      });
      const jobListingIds = Array.from(
        new Set(
          legacyCandidates
            .filter(
              (application) =>
                (application.artifactVersions === null ||
                  application.artifactVersions === undefined) &&
                (application.persistedArtifactVersions === null ||
                  application.persistedArtifactVersions === undefined)
            )
            .map((application) => application.jobListingId.trim())
            .filter((candidateJobListingId) => candidateJobListingId.length > 0)
        )
      );
      await Promise.all(
        jobListingIds.map((candidateJobListingId) =>
          collapseLegacyMongoFilemakerJobApplicationsForListing({
            jobListingId: candidateJobListingId,
            organizationId,
            personId,
          })
        )
      );
    }
  }

  const applications = await listMongoFilemakerJobApplications({
    jobListingId,
    limit: readLimit(url),
    organizationId,
    personId,
  });
  return Response.json({ applications });
}
