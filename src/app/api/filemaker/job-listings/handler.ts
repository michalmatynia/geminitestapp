import { type NextRequest } from 'next/server';

import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import {
  getMongoFilemakerOrganizationNamesByIds,
  listAllSettingsFilemakerJobListings,
  listMongoFilemakerJobApplications,
  requireFilemakerMailAdminSession,
} from '@/features/filemaker/server';
import type {
  FilemakerJobApplication,
  FilemakerJobApplicationLogEntry,
  FilemakerJobListing,
} from '@/features/filemaker/types';

const STATUSES = new Set(['draft', 'open', 'paused', 'closed']);

export type EnrichedJobListing = FilemakerJobListing & {
  organizationName: string | null;
  isApplied: boolean;
  applicationId: string | null;
  applicationLog: FilemakerJobApplicationLogEntry[];
};

const hasApplicableManualLog = (application: FilemakerJobApplication): boolean =>
  (application.applicationLog ?? []).some(
    (entry: FilemakerJobApplicationLogEntry): boolean =>
      entry.method === 'manual' &&
      (entry.toStatus === undefined || entry.toStatus === null || entry.toStatus === 'applied')
  );

const hasQueryMatch = (
  listing: FilemakerJobListing,
  organizationName: string | null,
  query: string
): boolean => {
  if (query.length === 0) return true;
  return [
    listing.title,
    listing.organizationId,
    organizationName ?? '',
    listing.location ?? '',
    listing.sourceSite ?? '',
    listing.sourceUrl ?? '',
  ].some((value: string): boolean => value.toLowerCase().includes(query));
};

export async function getHandler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  await requireFilemakerMailAdminSession();

  const url = new URL(req.url);
  const rawQuery = (url.searchParams.get('query') ?? '').trim().toLowerCase();
  const rawStatus = url.searchParams.get('status') ?? '';
  const personId = (url.searchParams.get('personId') ?? '').trim();

  let listings = await listAllSettingsFilemakerJobListings();

  if (STATUSES.has(rawStatus)) {
    listings = listings.filter(
      (listing: FilemakerJobListing): boolean => listing.status === rawStatus
    );
  }

  const orgIds = [...new Set(listings.map((listing) => listing.organizationId))];
  const orgNames = await getMongoFilemakerOrganizationNamesByIds(orgIds);

  if (rawQuery.length > 0) {
    listings = listings.filter((listing: FilemakerJobListing): boolean =>
      hasQueryMatch(listing, orgNames.get(listing.organizationId) ?? null, rawQuery)
    );
  }

  listings = listings
    .slice()
    .sort((a, b) => (b.updatedAt ?? '').localeCompare(a.updatedAt ?? ''));

  const appliedListingIds = new Set<string>();
  const appliedApplicationByListingId = new Map<
    string,
    { applicationId: string; applicationLog: FilemakerJobApplicationLogEntry[]; hasManualLog: boolean }
  >();
  if (personId.length > 0) {
    const applications = await listMongoFilemakerJobApplications({ personId, limit: 5000 });
    applications
      .filter((app: FilemakerJobApplication): boolean => app.status === 'applied')
      .forEach((app: FilemakerJobApplication): void => {
        appliedListingIds.add(app.jobListingId);
        const currentValue = appliedApplicationByListingId.get(app.jobListingId);
        const hasManualLog = hasApplicableManualLog(app);
        if (
          currentValue === undefined ||
          (!currentValue.hasManualLog && hasManualLog)
        ) {
          appliedApplicationByListingId.set(app.jobListingId, {
            applicationId: app.id,
            applicationLog: app.applicationLog ?? [],
            hasManualLog,
          });
        }
      });
  }

  const enriched: EnrichedJobListing[] = listings.map((listing) => ({
    ...listing,
    organizationName: orgNames.get(listing.organizationId) ?? null,
    isApplied: appliedListingIds.has(listing.id),
    applicationId:
      appliedApplicationByListingId.get(listing.id)?.applicationId ?? null,
    applicationLog:
      appliedApplicationByListingId.get(listing.id)?.applicationLog ?? [],
  }));

  return Response.json({ listings: enriched, total: enriched.length });
}
