import { type NextRequest } from 'next/server';
import { z } from 'zod';

import {
  collapseLegacyMongoFilemakerJobApplicationsForListing,
  listMongoFilemakerJobApplications,
  requireFilemakerMailAdminSession,
  upsertManualAppliedMongoFilemakerJobApplication,
} from '@/features/filemaker/server';
import type { JsonParseResult } from '@/shared/contracts/ui/api';
import { badRequestError } from '@/shared/errors/app-error';
import { parseJsonBody } from '@/shared/lib/api/parse-json';

const manualAppliedJobApplicationSchema = z.object({
  action: z.literal('mark_applied_manual'),
  jobListingId: z.string().trim().min(1),
  jobTitle: z.string().trim().nullable().optional(),
  organizationId: z.string().trim().min(1),
  organizationName: z.string().trim().nullable().optional(),
  personId: z.string().trim().min(1),
  personName: z.string().trim().nullable().optional(),
  sourceSite: z.string().trim().nullable().optional(),
  sourceUrl: z.string().trim().nullable().optional(),
});

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
                  application.persistedArtifactVersions === undefined) &&
                application.source !== 'filemaker-manual-applied'
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

export async function postHandler(req: NextRequest): Promise<Response> {
  await requireFilemakerMailAdminSession();
  const result: JsonParseResult<z.infer<typeof manualAppliedJobApplicationSchema>> =
    await parseJsonBody(req, manualAppliedJobApplicationSchema, {
      logPrefix: 'filemaker.job-applications.POST',
    });
  if (!result.ok) return result.response;

  const application = await upsertManualAppliedMongoFilemakerJobApplication({
    jobListingId: result.data.jobListingId,
    jobTitle: result.data.jobTitle,
    organizationId: result.data.organizationId,
    organizationName: result.data.organizationName,
    personId: result.data.personId,
    personName: result.data.personName,
    sourceSite: result.data.sourceSite,
    sourceUrl: result.data.sourceUrl,
  });
  return Response.json({ application });
}
