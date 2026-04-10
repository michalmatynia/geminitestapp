import 'server-only';

import type {
  CreateProductListingInput,
  ProductListingExportEventRecord,
  ProductListingRepository,
} from '@/shared/contracts/integrations/repositories';
import type { PlaywrightServiceListingExecutionBase } from './service-result';
import {
  buildPlaywrightListingExportHistoryRecord,
  buildPlaywrightListingFailureUpdateFields,
  buildPlaywrightListingSuccessUpdateFields,
} from './listing-persistence';

type PlaywrightListingJobRepository = Pick<
  ProductListingRepository,
  'updateListingStatus' | 'updateListing' | 'appendExportHistory'
>;

export const finalizePlaywrightListingJobSuccess = async ({
  repository,
  listingId,
  transitionStatus,
  update,
  history,
}: {
  repository: PlaywrightListingJobRepository;
  listingId: string;
  transitionStatus?: string | null;
  update: Partial<CreateProductListingInput>;
  history: ProductListingExportEventRecord;
}): Promise<void> => {
  if (transitionStatus) {
    await repository.updateListingStatus(listingId, transitionStatus);
  }

  await repository.updateListing(listingId, update);
  await repository.appendExportHistory(listingId, history);
};

export const finalizePlaywrightListingJobFailure = async ({
  repository,
  listingId,
  transitionStatus,
  update,
  history,
  errorMessage,
}: {
  repository: PlaywrightListingJobRepository;
  listingId: string;
  transitionStatus?: string | null;
  update: Partial<CreateProductListingInput>;
  history: ProductListingExportEventRecord;
  errorMessage: string;
}): Promise<never> => {
  if (transitionStatus) {
    await repository.updateListingStatus(listingId, transitionStatus);
  }

  await repository.updateListing(listingId, update);
  await repository.appendExportHistory(listingId, history);

  throw new Error(errorMessage);
};

export const finalizePlaywrightStandardListingJobOutcome = async ({
  repository,
  listingId,
  result,
  at,
  marketplaceData,
  relist,
  requestId,
  historyFields,
  success,
  failure,
}: {
  repository: PlaywrightListingJobRepository;
  listingId: string;
  result: Pick<
    PlaywrightServiceListingExecutionBase,
    'ok' | 'externalListingId' | 'error' | 'errorCategory'
  >;
  at: Date;
  marketplaceData: Record<string, unknown>;
  relist: boolean;
  requestId?: string | null;
  historyFields?: string[] | null;
  success: {
    transitionStatus?: string | null;
    historyStatus: string;
    externalListingId?: string | null;
    expiresAt?: Date | string | null;
    updateExtra?: Partial<CreateProductListingInput>;
  };
  failure: {
    transitionStatus?: string | null;
    historyStatus: string;
    failureReason: string;
    updateExtra?: Partial<CreateProductListingInput>;
  };
}): Promise<void> => {
  if (result.ok) {
    const externalListingId = success.externalListingId ?? result.externalListingId ?? null;

    await finalizePlaywrightListingJobSuccess({
      repository,
      listingId,
      transitionStatus: success.transitionStatus,
      update: buildPlaywrightListingSuccessUpdateFields({
        at,
        marketplaceData,
        externalListingId,
        extra: success.updateExtra,
      }),
      history: buildPlaywrightListingExportHistoryRecord({
        exportedAt: at,
        status: success.historyStatus,
        externalListingId,
        expiresAt: success.expiresAt,
        failureReason: null,
        relist,
        requestId,
        fields: historyFields,
      }),
    });
    return;
  }

  const failureReason = result.error ?? failure.failureReason;
  await finalizePlaywrightListingJobFailure({
    repository,
    listingId,
    transitionStatus: failure.transitionStatus,
    update: buildPlaywrightListingFailureUpdateFields({
      at,
      marketplaceData,
      failureReason,
      extra: failure.updateExtra,
    }),
    history: buildPlaywrightListingExportHistoryRecord({
      exportedAt: at,
      status: failure.historyStatus,
      failureReason,
      relist,
      requestId,
      fields: historyFields,
    }),
    errorMessage: failureReason,
  });
};

export const finalizePlaywrightListingStatusCheckOutcome = async ({
  repository,
  listingId,
  result,
  at,
  marketplaceData,
  statusOnSuccess,
  failureMessage,
}: {
  repository: Pick<ProductListingRepository, 'updateListing'>;
  listingId: string;
  result: Pick<PlaywrightServiceListingExecutionBase, 'ok' | 'error'>;
  at: Date;
  marketplaceData: Record<string, unknown>;
  statusOnSuccess?: string | null;
  failureMessage: string;
}): Promise<void> => {
  if (result.ok) {
    await repository.updateListing(listingId, {
      ...(statusOnSuccess ? { status: statusOnSuccess } : {}),
      lastStatusCheckAt: at,
      marketplaceData,
    });
    return;
  }

  await repository.updateListing(listingId, {
    lastStatusCheckAt: at,
    marketplaceData,
  });
  throw new Error(result.error ?? failureMessage);
};
