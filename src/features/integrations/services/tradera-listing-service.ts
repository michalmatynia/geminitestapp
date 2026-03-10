import 'server-only';

/**
 * Tradera Listing Service
 *
 * Orchestrates product listings on Tradera via browser automation (Playwright)
 * or official Tradera API.
 */

export * from './tradera-listing/config';
export * from './tradera-listing/utils';
export * from './tradera-listing/settings';
export * from './tradera-listing/browser';
export * from './tradera-listing/api';
export * from './tradera-listing/categories';

import { isTraderaApiIntegrationSlug } from '@/features/integrations/constants/slugs';
import {
  findProductListingByIdAcrossProviders,
  getIntegrationRepository,
} from '@/features/integrations/server';
import {
  loadTraderaSystemSettings,
  toTruthyBoolean,
} from '@/features/integrations/services/tradera-system-settings';
import type { TraderaListingJobInput } from '@/shared/contracts/integrations';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import prisma from '@/shared/lib/db/prisma';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

export type { TraderaListingJobInput };

import { runTraderaApiListing } from './tradera-listing/api';
import { runTraderaBrowserListing } from './tradera-listing/browser';
import { resolveEffectiveListingSettings, buildRelistPolicy } from './tradera-listing/settings';
import {
  classifyTraderaFailure,
  toUserFacingTraderaFailure,
  resolveExpiry,
  resolveNextRelistAt,
} from './tradera-listing/utils';

export const runTraderaListing = async (
  input: TraderaListingJobInput
): Promise<{
  ok: boolean;
  externalListingId: string | null;
  listingUrl: string | null;
  expiresAt: Date | null;
  nextRelistAt: Date | null;
  error: string | null;
  errorCategory: string | null;
  metadata?: Record<string, unknown>;
}> => {
  const listingId = input.listingId;
  const source = input.source ?? 'manual';
  const action = input.action ?? 'list';

  try {
    const resolvedListing = await findProductListingByIdAcrossProviders(listingId);
    if (!resolvedListing) {
      return {
        ok: false,
        externalListingId: null,
        listingUrl: null,
        expiresAt: null,
        nextRelistAt: null,
        error: `Listing not found: ${listingId}`,
        errorCategory: 'NOT_FOUND',
      };
    }
    const { listing } = resolvedListing;

    const integrationRepo = await getIntegrationRepository();
    const connection = await integrationRepo.getConnectionById(listing.connectionId);
    if (!connection) {
      return {
        ok: false,
        externalListingId: null,
        listingUrl: null,
        expiresAt: null,
        nextRelistAt: null,
        error: `Connection not found: ${listing.connectionId}`,
        errorCategory: 'NOT_FOUND',
      };
    }
    const integration = await integrationRepo.getIntegrationById(connection.integrationId);
    if (!integration) {
      return {
        ok: false,
        externalListingId: null,
        listingUrl: null,
        expiresAt: null,
        nextRelistAt: null,
        error: `Integration not found: ${connection.integrationId}`,
        errorCategory: 'NOT_FOUND',
      };
    }

    const systemSettings = await loadTraderaSystemSettings();
    const integrationSlug = integration.slug;
    const useApi = isTraderaApiIntegrationSlug(integrationSlug);

    if (useApi) {
      const result = await runTraderaApiListing({ listing, connection });
      const settings = resolveEffectiveListingSettings(listing, connection, systemSettings);
      const expiresAt = resolveExpiry(settings.durationHours);
      const nextRelistAt = resolveNextRelistAt(
        expiresAt,
        settings.autoRelistEnabled,
        settings.autoRelistLeadMinutes
      );

      return {
        ok: true,
        externalListingId: result.externalListingId,
        listingUrl: result.listingUrl ?? null,
        expiresAt,
        nextRelistAt,
        error: null,
        errorCategory: null,
        metadata: {
          ...result.metadata,
          relistPolicy: buildRelistPolicy(settings),
        },
      };
    }

    const result = await runTraderaBrowserListing({
      listing,
      connection,
      systemSettings,
      source,
      action,
    });

    const settings = resolveEffectiveListingSettings(listing, connection, systemSettings);
    const expiresAt = resolveExpiry(settings.durationHours);
    const nextRelistAt = resolveNextRelistAt(
      expiresAt,
      settings.autoRelistEnabled,
      settings.autoRelistLeadMinutes
    );

    return {
      ok: true,
      externalListingId: result.externalListingId,
      listingUrl: result.listingUrl ?? null,
      expiresAt,
      nextRelistAt,
      error: null,
      errorCategory: null,
      metadata: {
        simulated: result.simulated ?? false,
        relistPolicy: buildRelistPolicy(settings),
      },
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    const category = classifyTraderaFailure(message);
    const userMessage = toUserFacingTraderaFailure(category, message);

    void ErrorSystem.captureException(error, {
      service: 'tradera-listing',
      listingId,
      category,
      action,
      source,
      userMessage,
    });

    return {
      ok: false,
      externalListingId: null,
      listingUrl: null,
      expiresAt: null,
      nextRelistAt: null,
      error: userMessage,
      errorCategory: category,
    };
  }
};

export const processTraderaListingJob = async (input: TraderaListingJobInput): Promise<void> => {
  const result = await runTraderaListing(input);
  const resolved = await findProductListingByIdAcrossProviders(input.listingId);
  if (!resolved) {
    if (!result.ok) {
      throw new Error(result.error ?? `Listing not found: ${input.listingId}`);
    }
    return;
  }

  const now = new Date();
  if (result.ok) {
    await resolved.repository.updateListingStatus(input.listingId, 'active');
    await resolved.repository.updateListing(input.listingId, {
      externalListingId: result.externalListingId ?? null,
      listedAt: now,
      expiresAt: result.expiresAt ?? null,
      nextRelistAt: result.nextRelistAt ?? null,
      lastRelistedAt: input.action === 'relist' ? now : null,
      lastStatusCheckAt: now,
      failureReason: null,
    });
    await resolved.repository.appendExportHistory(input.listingId, {
      exportedAt: now,
      status: 'active',
      externalListingId: result.externalListingId ?? null,
      expiresAt: result.expiresAt ?? null,
      failureReason: null,
      relist: input.action === 'relist',
      requestId: input.jobId ?? null,
    });
    return;
  }

  await resolved.repository.updateListingStatus(input.listingId, 'failed');
  await resolved.repository.updateListing(input.listingId, {
    lastStatusCheckAt: now,
    nextRelistAt: null,
    failureReason: result.error ?? 'Tradera listing failed.',
  });
  await resolved.repository.appendExportHistory(input.listingId, {
    exportedAt: now,
    status: 'failed',
    externalListingId: null,
    expiresAt: null,
    failureReason: result.error ?? 'Tradera listing failed.',
    relist: input.action === 'relist',
    requestId: input.jobId ?? null,
  });
  throw new Error(result.error ?? 'Tradera listing failed.');
};

const findDueRelistsInMongo = async (limit: number): Promise<string[]> => {
  if (!process.env['MONGODB_URI']) return [];
  const db = await getMongoDb();
  const traderaIntegrations = await db
    .collection<{ _id: string; slug: string }>('integrations')
    .find({ slug: { $regex: /^(tradera|tradera-api)$/i } }, { projection: { _id: 1 } })
    .toArray();
  if (traderaIntegrations.length === 0) return [];

  const now = new Date();
  const listings = await db
    .collection<{
      _id: string;
      integrationId: string;
      status: string;
      nextRelistAt?: Date | null;
    }>('product_listings')
    .find({
      integrationId: { $in: traderaIntegrations.map((i) => i._id) },
      status: { $in: ['active', 'queued_relist'] },
      nextRelistAt: { $ne: null, $lte: now },
    })
    .sort({ nextRelistAt: 1, updatedAt: 1 })
    .limit(limit)
    .toArray();

  return listings.map((listing) => listing._id);
};

const findDueRelistsInPrisma = async (limit: number): Promise<string[]> => {
  if (!process.env['DATABASE_URL']) return [];
  try {
    const rows = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
      `
      SELECT pl.id
      FROM "ProductListing" pl
      INNER JOIN "Integration" i ON i.id = pl."integrationId"
      WHERE LOWER(i.slug) IN ('tradera', 'tradera-api')
        AND pl.status IN ('active', 'queued_relist')
        AND pl."nextRelistAt" IS NOT NULL
        AND pl."nextRelistAt" <= NOW()
      ORDER BY pl."nextRelistAt" ASC, pl."updatedAt" ASC
      LIMIT ${limit}
      `
    );
    return rows.map((row) => row.id);
  } catch (error) {
    void ErrorSystem.logWarning('Failed to find due Tradera relists in SQL', {
      service: 'tradera-listing',
      error,
    });
    return [];
  }
};

export const findDueTraderaRelistListingIds = async (limit: number = 10): Promise<string[]> => {
  const [mongoIds, prismaIds] = await Promise.all([
    findDueRelistsInMongo(limit),
    findDueRelistsInPrisma(limit),
  ]);
  const combined = [...new Set([...mongoIds, ...prismaIds])];
  return combined.slice(0, limit);
};

export const shouldRunTraderaRelistScheduler = async (): Promise<boolean> => {
  const settings = await loadTraderaSystemSettings();
  const schedulerEnabled = toTruthyBoolean(
    process.env['TRADERA_RELIST_SCHEDULER_ENABLED'],
    settings.schedulerEnabled
  );
  const autoRelistEnabled = toTruthyBoolean(
    process.env['TRADERA_AUTO_RELIST_ENABLED'],
    settings.autoRelistEnabled
  );
  return schedulerEnabled && autoRelistEnabled;
};
