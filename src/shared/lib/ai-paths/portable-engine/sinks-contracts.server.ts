import 'server-only';

import type { PortablePathEnvelopeVerificationAuditSink } from './portable-engine-envelope-audit-sinks';
import type { PortablePathEnvelopeVerificationAuditSinkHealthPolicy } from './types';

export type { PortablePathEnvelopeVerificationAuditSinkProfile } from './types';
export type { PortablePathEnvelopeVerificationAuditSinkHealthPolicy } from './types';

export type PortablePathEnvelopeVerificationAuditSinkHealthCheck = () => void | Promise<void>;

export type PortablePathEnvelopeVerificationAuditSinkWithHealthCheck =
  PortablePathEnvelopeVerificationAuditSink & {
    healthCheck?: PortablePathEnvelopeVerificationAuditSinkHealthCheck;
  };

export type { PortablePathEnvelopeVerificationAuditSinkHealthDiagnosticStatus } from './types';
export type { PortablePathEnvelopeVerificationAuditSinkHealthDiagnostic } from './types';
export type { PortablePathEnvelopeVerificationAuditSinkStartupHealthStatus } from './types';
export type { PortablePathEnvelopeVerificationAuditSinkStartupHealthSummary } from './types';

export type PortablePathSigningPolicyAlertLevel =
  PortablePathEnvelopeVerificationAuditSinkHealthPolicy;
