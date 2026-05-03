import 'server-only';

import {
  PORTABLE_PATH_ENVELOPE_VERIFICATION_AUDIT_SINK_BOOTSTRAP_ENABLED_ENV,
  PORTABLE_PATH_ENVELOPE_VERIFICATION_AUDIT_SINK_HEALTH_POLICY_ENV,
  PORTABLE_PATH_ENVELOPE_VERIFICATION_AUDIT_SINK_HEALTH_TIMEOUT_MS_ENV,
  PORTABLE_PATH_ENVELOPE_VERIFICATION_AUDIT_SINK_PROFILE_ENV,
} from './sinks-constants.server';
import {
  parseBooleanFromEnvironment,
  resolvePortablePathEnvelopeVerificationAuditSinkHealthPolicyFromEnvironment,
  resolvePortablePathEnvelopeVerificationAuditSinkHealthTimeoutMsFromEnvironment,
  resolvePortablePathEnvelopeVerificationAuditSinkProfileFromEnvironment,
  resolvePortablePathEnvelopeVerificationAuditSinkProfileOverrideFromEnvironment,
} from './sinks-environment.server';

import type {
  PortablePathEnvelopeVerificationAuditSinkHealthPolicy,
  PortablePathEnvelopeVerificationAuditSinkProfile,
} from './sinks-contracts.server';

export type PortablePathEnvelopeVerificationAuditSinkBootstrapEnvironmentSettings = {
  enabled: boolean;
  profile: PortablePathEnvelopeVerificationAuditSinkProfile;
  healthPolicy: PortablePathEnvelopeVerificationAuditSinkHealthPolicy;
  healthTimeoutMs: number | null;
};

export const resolvePortablePathEnvelopeVerificationAuditSinkBootstrapSettingsFromEnvironment = (
  env: Record<string, string | undefined> = process.env
): PortablePathEnvelopeVerificationAuditSinkBootstrapEnvironmentSettings => {
  const enabled =
    parseBooleanFromEnvironment(
      env[PORTABLE_PATH_ENVELOPE_VERIFICATION_AUDIT_SINK_BOOTSTRAP_ENABLED_ENV]
    ) ?? true;
  const profile =
    resolvePortablePathEnvelopeVerificationAuditSinkProfileOverrideFromEnvironment(
      env[PORTABLE_PATH_ENVELOPE_VERIFICATION_AUDIT_SINK_PROFILE_ENV]
    ) ?? resolvePortablePathEnvelopeVerificationAuditSinkProfileFromEnvironment(env['NODE_ENV']);
  const healthPolicy =
    resolvePortablePathEnvelopeVerificationAuditSinkHealthPolicyFromEnvironment(
      env[PORTABLE_PATH_ENVELOPE_VERIFICATION_AUDIT_SINK_HEALTH_POLICY_ENV]
    ) ?? 'warn';
  const healthTimeoutMs =
    resolvePortablePathEnvelopeVerificationAuditSinkHealthTimeoutMsFromEnvironment(
      env[PORTABLE_PATH_ENVELOPE_VERIFICATION_AUDIT_SINK_HEALTH_TIMEOUT_MS_ENV]
    );

  return {
    enabled,
    profile,
    healthPolicy,
    healthTimeoutMs,
  };
};
