import 'server-only';

import {
  PORTABLE_PATH_ENVELOPE_VERIFICATION_AUDIT_SINK_HEALTH_POLICY_ENV,
  PORTABLE_PATH_ENVELOPE_VERIFICATION_AUDIT_SINK_HEALTH_TIMEOUT_MS_ENV,
  PORTABLE_PATH_ENVELOPE_VERIFICATION_AUDIT_SINK_PROFILE_ENV,
  type PortablePathEnvelopeVerificationAuditSinkHealthPolicy,
  type PortablePathEnvelopeVerificationAuditSinkProfile,
} from './sinks-types.server';

const DEFAULT_PORTABLE_PATH_ENVELOPE_VERIFICATION_AUDIT_SINK_HEALTH_TIMEOUT_MS = 3000;

export const parseBooleanFromEnvironment = (value: string | undefined): boolean | null => {
  const normalized = String(value ?? '')
    .trim()
    .toLowerCase();
  if (normalized.length === 0) return null;
  if (normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'on') {
    return true;
  }
  if (normalized === '0' || normalized === 'false' || normalized === 'no' || normalized === 'off') {
    return false;
  }
  return null;
};

export const resolveHealthTimeoutMs = (value: number | undefined): number => {
  if (!Number.isFinite(value)) {
    return DEFAULT_PORTABLE_PATH_ENVELOPE_VERIFICATION_AUDIT_SINK_HEALTH_TIMEOUT_MS;
  }
  const normalized = Math.floor(Number(value));
  if (normalized < 250) {
    return DEFAULT_PORTABLE_PATH_ENVELOPE_VERIFICATION_AUDIT_SINK_HEALTH_TIMEOUT_MS;
  }
  return normalized;
};

const normalizePortablePathEnvelopeVerificationAuditSinkProfile = (
  value: string | undefined | null
): PortablePathEnvelopeVerificationAuditSinkProfile | null => {
  const normalized = String(value ?? '')
    .trim()
    .toLowerCase();
  if (normalized === 'production' || normalized === 'prod') {
    return 'prod';
  }
  if (normalized === 'staging' || normalized === 'stage' || normalized === 'preprod') {
    return 'staging';
  }
  if (
    normalized === 'development' ||
    normalized === 'dev' ||
    normalized === 'local' ||
    normalized === 'test'
  ) {
    return 'dev';
  }
  return null;
};

export const resolvePortablePathEnvelopeVerificationAuditSinkProfileFromEnvironment = (
  nodeEnv: string | undefined = process.env['NODE_ENV']
): PortablePathEnvelopeVerificationAuditSinkProfile => {
  return normalizePortablePathEnvelopeVerificationAuditSinkProfile(nodeEnv) ?? 'dev';
};

export const resolvePortablePathEnvelopeVerificationAuditSinkProfileOverrideFromEnvironment = (
  profile = process.env[PORTABLE_PATH_ENVELOPE_VERIFICATION_AUDIT_SINK_PROFILE_ENV]
): PortablePathEnvelopeVerificationAuditSinkProfile | null =>
  normalizePortablePathEnvelopeVerificationAuditSinkProfile(profile);

export const resolvePortablePathEnvelopeVerificationAuditSinkHealthPolicyFromEnvironment = (
  value = process.env[PORTABLE_PATH_ENVELOPE_VERIFICATION_AUDIT_SINK_HEALTH_POLICY_ENV]
): PortablePathEnvelopeVerificationAuditSinkHealthPolicy | null => {
  const normalized = String(value ?? '')
    .trim()
    .toLowerCase();
  if (normalized === 'off') return 'off';
  if (normalized === 'warn' || normalized === 'warning') return 'warn';
  if (normalized === 'error' || normalized === 'strict') return 'error';
  return null;
};

export const resolvePortablePathEnvelopeVerificationAuditSinkHealthTimeoutMsFromEnvironment = (
  value = process.env[PORTABLE_PATH_ENVELOPE_VERIFICATION_AUDIT_SINK_HEALTH_TIMEOUT_MS_ENV]
): number | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (trimmed.length === 0) return null;
  const numeric = Number(trimmed);
  if (!Number.isFinite(numeric)) return null;
  return resolveHealthTimeoutMs(numeric);
};
