import 'server-only';

import type { ProductScanRecord } from '@/shared/contracts/product-scans';

import { createPersistedProductScanStep } from './product-scans-service.helpers';
import {
  resolveAmazonImageSearchProviderHistory,
  resolveNextQueueStepAttempt,
} from './product-scans-service.helpers.amazon';
import type { AmazonTriageSelectedCandidate } from './product-scans-sync-amazon-triage.evaluation';
import {
  buildAmazonTriageStartedRawResult,
  persistQueuedAmazonTriageScan,
  resolveTriageRunStatus,
  startAmazonTriageEngineTask,
  type AmazonTriageQueueContext,
} from './product-scans-sync-amazon-triage.queue';

const buildSelectedCandidateQueueStep = (
  context: AmazonTriageQueueContext,
  selected: AmazonTriageSelectedCandidate,
  continuationStatus: 'queued' | 'running'
): ProductScanRecord['steps'][number] =>
  createPersistedProductScanStep({
    key: 'queue_scan',
    label: 'Start triaged Amazon candidate',
    attempt: resolveNextQueueStepAttempt(context.finalizedAmazonSteps),
    status: 'completed',
    resultCode: continuationStatus === 'running' ? 'run_started' : 'run_queued',
    message:
      continuationStatus === 'running'
        ? 'Started the top-ranked Amazon candidate after AI triage.'
        : 'Queued the top-ranked Amazon candidate after AI triage.',
    details: [
      { label: 'Image search provider', value: context.currentProvider },
      { label: 'Selected candidate URL', value: selected.selectedCandidateUrl },
      { label: 'Selected candidate rank', value: String(selected.selectedCandidateRank) },
      { label: 'Recommended action', value: context.triageEvaluation.recommendedAction },
    ],
    url: selected.selectedCandidateUrl,
  });

export const startAmazonTriageSelectedCandidateScan = async (
  context: AmazonTriageQueueContext,
  selected: AmazonTriageSelectedCandidate
): Promise<ProductScanRecord> => {
  const continuationRun = await startAmazonTriageEngineTask({
    context,
    imageSearchProvider: context.currentProvider,
    label: 'Amazon triaged candidate scan',
    tags: ['product', 'amazon', 'scan', 'candidate-triage'],
    extraInput: {
      skipAmazonProbe: false,
      directAmazonCandidateUrl: selected.selectedCandidateUrl,
      directAmazonCandidateUrls: selected.selectedCandidateUrls,
      directMatchedImageId: context.parsedResult.matchedImageId,
      directAmazonCandidateRank: selected.selectedCandidateRank,
    },
  });
  const continuationStatus = resolveTriageRunStatus(continuationRun);
  return await persistQueuedAmazonTriageScan({
    context,
    run: continuationRun,
    url: selected.selectedCandidateUrl,
    rawResult: buildAmazonTriageStartedRawResult({
      context,
      run: continuationRun,
      imageSearchProvider: context.currentProvider,
      imageSearchProviderHistory: resolveAmazonImageSearchProviderHistory(
        context.scan.rawResult,
        context.currentProvider
      ),
      extraRawResult: { candidateTriageSelectedUrls: selected.selectedCandidateUrls },
    }),
    queueStep: buildSelectedCandidateQueueStep(context, selected, continuationStatus),
  });
};
