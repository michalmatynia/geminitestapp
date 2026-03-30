import type { KangurContentBootstrapSummary } from '@/features/kangur/server/kangur-content-bootstrap';
import type { KangurContentVerificationResult } from '@/features/kangur/server/kangur-content-verification';

export const buildKangurContentSyncCliOutput = (summary: KangurContentBootstrapSummary) => ({
  ok: true,
  mode: 'exact-localhost-sync' as const,
  sourceOfTruth: 'localhost' as const,
  ...summary,
});

export const buildKangurContentVerifyCliOutput = (
  summary: KangurContentVerificationResult
) => ({
  mode: 'exact-localhost-verify' as const,
  sourceOfTruth: 'localhost' as const,
  ...summary,
});
