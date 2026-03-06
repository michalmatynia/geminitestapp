import 'server-only';

export type PortablePathSigningPolicyProfile = 'dev' | 'staging' | 'prod';
export type PortablePathSigningPolicySurface = 'canvas' | 'product' | 'api';

export type PortablePathEnvelopeVerificationAuditSinkProfile = 'dev' | 'staging' | 'prod';
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
