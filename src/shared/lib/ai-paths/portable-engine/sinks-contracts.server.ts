import 'server-only';

import type { PortablePathEnvelopeVerificationAuditSink } from './portable-engine-envelope-audit-sinks';

export type PortablePathEnvelopeVerificationAuditSinkProfile = 'dev' | 'staging' | 'prod';

export type PortablePathEnvelopeVerificationAuditSinkHealthPolicy = 'off' | 'warn' | 'error';

export type PortablePathEnvelopeVerificationAuditSinkHealthCheck = () => void | Promise<void>;

export type PortablePathEnvelopeVerificationAuditSinkWithHealthCheck =
  PortablePathEnvelopeVerificationAuditSink & {
    healthCheck?: PortablePathEnvelopeVerificationAuditSinkHealthCheck;
  };

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

export type PortablePathEnvelopeVerificationAuditSinkStartupHealthStatus =
  | 'healthy'
  | 'degraded'
  | 'failed'
  | 'skipped';

export type PortablePathEnvelopeVerificationAuditSinkStartupHealthSummary = {
  profile: PortablePathEnvelopeVerificationAuditSinkProfile;
  policy: PortablePathEnvelopeVerificationAuditSinkHealthPolicy;
  timeoutMs: number;
  status: PortablePathEnvelopeVerificationAuditSinkStartupHealthStatus;
  checkedAt: string;
  failedSinkIds: string[];
  diagnostics: PortablePathEnvelopeVerificationAuditSinkHealthDiagnostic[];
};

export type PortablePathSigningPolicyAlertLevel = 'off' | 'warn' | 'error';

export type PortablePathAuditSinkAutoRemediationDeadLetterReplayExportRedactionMode =
  | 'off'
  | 'sensitive';
