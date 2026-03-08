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

export type PrismaSettingClient = {
  setting?: {
    findUnique: (input: {
      where: { key: string };
      select: { value: true };
    }) => Promise<{ value: string | null } | null>;
    upsert: (input: {
      where: { key: string };
      create: { key: string; value: string };
      update: { value: string };
    }) => Promise<unknown>;
  };
};

export type PrismaSettingDelegate = NonNullable<PrismaSettingClient['setting']>;

const isPrismaSettingDelegate = (value: unknown): value is PrismaSettingDelegate => {
  if (!value || typeof value !== 'object') return false;
  return (
    typeof Reflect.get(value, 'findUnique') === 'function' &&
    typeof Reflect.get(value, 'upsert') === 'function'
  );
};

export const getPrismaSettingDelegate = (
  prismaClient: unknown
): PrismaSettingDelegate | null => {
  if (!process.env['DATABASE_URL'] || !prismaClient || typeof prismaClient !== 'object') {
    return null;
  }
  const setting = Reflect.get(prismaClient, 'setting');
  return isPrismaSettingDelegate(setting) ? setting : null;
};

export const canUsePrismaSettings = (
  prismaClient: unknown
): boolean => getPrismaSettingDelegate(prismaClient) !== null;

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
