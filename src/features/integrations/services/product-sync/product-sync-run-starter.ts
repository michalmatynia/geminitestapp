import 'server-only';

import type {
  ProductSyncRunRecord,
  ProductSyncRunTrigger,
} from '@/features/integrations/types/product-sync';
import { enqueueProductSyncRunJob } from '@/features/jobs/workers/productSyncQueue';
import { ErrorSystem } from '@/features/observability/server';

import {
  createProductSyncRun,
  getProductSyncProfile,
  hasActiveProductSyncRun,
  pruneProductSyncRunsForProfile,
  recoverStaleProductSyncRuns,
} from './product-sync-repository';
import { assignQueueJobToProductSyncRun } from './product-sync-service';


export const startProductSyncRun = async (input: {
  profileId: string;
  trigger: ProductSyncRunTrigger;
}): Promise<ProductSyncRunRecord> => {
  const profile = await getProductSyncProfile(input.profileId);
  if (!profile) {
    throw new Error('Sync profile not found.');
  }

  if (!profile.enabled && input.trigger === 'scheduled') {
    throw new Error('Sync profile is disabled.');
  }

  const staleRecovery = await recoverStaleProductSyncRuns({
    profileId: profile.id,
    limit: 200,
  });
  if (staleRecovery.recoveredRuns > 0) {
    await ErrorSystem.logWarning('Recovered stale product sync runs before starting a new run', {
      service: 'product-sync-run-starter',
      profileId: profile.id,
      trigger: input.trigger,
      recoveredRuns: staleRecovery.recoveredRuns,
      recoveredQueuedRuns: staleRecovery.recoveredQueuedRuns,
      recoveredRunningRuns: staleRecovery.recoveredRunningRuns,
    });
  }

  const hasActiveRun = await hasActiveProductSyncRun(profile.id);
  if (hasActiveRun) {
    throw new Error('A sync run is already queued or running for this profile.');
  }

  const run = await createProductSyncRun({
    profileId: profile.id,
    profileName: profile.name,
    trigger: input.trigger,
  });

  const queueJobId = await enqueueProductSyncRunJob({
    runId: run.id,
    profileId: profile.id,
    trigger: input.trigger,
  });

  const queuedRun = await assignQueueJobToProductSyncRun(run.id, queueJobId);

  void pruneProductSyncRunsForProfile({ profileId: profile.id }).catch((error) => {
    void ErrorSystem.captureException(error, {
      service: 'product-sync-run-starter',
      action: 'pruneProductSyncRunsForProfile',
      profileId: profile.id,
      runId: queuedRun.id,
      trigger: input.trigger,
    });
  });

  return queuedRun;
};
