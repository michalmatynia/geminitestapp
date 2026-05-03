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

export async function getHandler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  await requireFilemakerMailAdminSession();

  const url = new URL(req.url);
  const rawQuery = (url.searchParams.get('query') ?? '').trim().toLowerCase();
  const rawStatus = url.searchParams.get('status') ?? '';
  const personId = (url.searchParams.get('personId') ?? '').trim();

  let listings = await listAllSettingsFilemakerJobListings();

  if (rawQuery.length > 0) {
    listings = listings.filter((listing: FilemakerJobListing): boolean =>
      listing.title.toLowerCase().includes(rawQuery) ||
      listing.organizationId.toLowerCase().includes(rawQuery) ||
      (listing.location?.toLowerCase().includes(rawQuery) ?? false)
    );
  }

  if (STATUSES.has(rawStatus)) {
    listings = listings.filter(
      (listing: FilemakerJobListing): boolean => listing.status === rawStatus
    );
  }

  listings = listings.slice().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  const orgIds = listings.map((l) => l.organizationId);
  const orgNames = await getMongoFilemakerOrganizationNamesByIds(orgIds);

  let appliedListingIds = new Set<string>();
  const appliedLogsByListingId = new Map<string, FilemakerJobApplicationLogEntry[]>();
  const applicationIdByListingId = new Map<string, string>();
  if (personId.length > 0) {
    const applications = await listMongoFilemakerJobApplications({ personId, limit: 5000 });
    applications
      .filter((app: FilemakerJobApplication): boolean => app.status === 'applied')
      .forEach((app: FilemakerJobApplication): void => {
        appliedListingIds.add(app.jobListingId);
        if ((app.applicationLog?.length ?? 0) > 0) {
          appliedLogsByListingId.set(app.jobListingId, app.applicationLog ?? []);
        }
        if (!applicationIdByListingId.has(app.jobListingId)) {
          applicationIdByListingId.set(app.jobListingId, app.id);
        }
      });
  }

  const enriched: EnrichedJobListing[] = listings.map((listing) => ({
    ...listing,
    organizationName: orgNames.get(listing.organizationId) ?? null,
    isApplied: appliedListingIds.has(listing.id),
    applicationId: applicationIdByListingId.get(listing.id) ?? null,
    applicationLog: appliedLogsByListingId.get(listing.id) ?? [],
  }));

  return Response.json({ listings: enriched, total: enriched.length });
}
