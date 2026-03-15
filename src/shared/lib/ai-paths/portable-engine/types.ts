import 'server-only';

import type {
  PortablePathSigningPolicyProfile,
  PortablePathSigningPolicySurface,
} from './portable-engine-resolution-types';

export type { PortablePathSigningPolicyProfile, PortablePathSigningPolicySurface };

export type PortablePathEnvelopeVerificationAuditSinkProfile = PortablePathSigningPolicyProfile;
export type PortablePathEnvelopeVerificationAuditSinkHealthPolicy = 'off' | 'warn' | 'error';

export type PortablePathEnvelopeVerificationAuditSinkStartupHealthStatus =
  | 'healthy'
  | 'degraded'
  | 'failed'
  | 'skipped';

export type PortablePathEnvelopeVerificationAuditSinkHealthDiagnosticStatus =
  | 'healthy'
  | 'failed'
  | 'skipped';

export type PortablePathEnvelopeVerificationAuditSinkHealthDiagnostic = {
  sinkId: string;
  status: PortablePathEnvelopeVerificationAuditSinkHealthDiagnosticStatus;
  checkedAt: string;
  durationMs: number;
  message: string;
  error: string | null;
};

export type PortablePathEnvelopeVerificationAuditSinkStartupHealthSummary = {
  profile: PortablePathEnvelopeVerificationAuditSinkProfile;
  policy: PortablePathEnvelopeVerificationAuditSinkHealthPolicy;
  timeoutMs: number;
  status: PortablePathEnvelopeVerificationAuditSinkStartupHealthStatus;
  checkedAt: string;
  failedSinkIds: string[];
  diagnostics: PortablePathEnvelopeVerificationAuditSinkHealthDiagnostic[];
};

export type PortablePathAuditSinkStartupHealthState = {
  consecutiveFailureCount: number;
  lastFailureAt: string | null;
  lastRecoveredAt: string | null;
  lastFailedSinkIds: string[];
  remediationCount: number;
  lastRemediatedAt: string | null;
  remediationWindowStartedAt: string | null;
  remediationWindowActionCount: number;
  lastRemediationSkippedAt: string | null;
  lastRemediationSkippedReason: 'cooldown' | 'rate_limited' | null;
  lastStatus: PortablePathEnvelopeVerificationAuditSinkStartupHealthStatus | null;
};

export const PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_STRATEGIES = [
  'none',
  'unregister_all',
  'degrade_to_log_only',
] as const;

export type PortablePathAuditSinkAutoRemediationStrategy =
  (typeof PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_STRATEGIES)[number];
