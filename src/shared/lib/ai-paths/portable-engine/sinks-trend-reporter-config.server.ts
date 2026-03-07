import 'server-only';

import type { PortablePathSigningPolicyProfile } from './portable-engine-resolution-types';
import {
  parseBooleanFromEnvironment,
  resolvePortablePathEnvelopeVerificationAuditSinkProfileFromEnvironment,
} from './sinks-environment.server';
import {
  parsePortablePathSigningPolicyExpectedProfilesBySurfaceFromEnvironment,
  resolvePortablePathAuditSinkFailureAlertLevelFromEnvironment,
  resolvePortablePathSigningPolicyTrendAlertLevelFromEnvironment,
  resolvePortablePathSigningPolicyTrendPersistenceEnabledFromEnvironment,
  resolvePortablePathSigningPolicyTrendPersistenceMaxSnapshotsFromEnvironment,
  resolvePortablePathSigningPolicyTrendReportEveryUsesFromEnvironment,
  type PortablePathSigningPolicyExpectedProfilesBySurface,
} from './sinks-trend-state.server';
import {
  PORTABLE_PATH_AUDIT_SINK_FAILURE_ALERT_LEVEL_ENV,
  PORTABLE_PATH_SIGNING_POLICY_DRIFT_ALERT_LEVEL_ENV,
  PORTABLE_PATH_SIGNING_POLICY_TREND_PERSISTENCE_ENABLED_ENV,
  PORTABLE_PATH_SIGNING_POLICY_TREND_PERSISTENCE_MAX_SNAPSHOTS_ENV,
  PORTABLE_PATH_SIGNING_POLICY_TREND_REPORT_EVERY_USES_ENV,
  PORTABLE_PATH_SIGNING_POLICY_TREND_REPORTER_ENABLED_ENV,
} from './sinks-constants.server';
import type { PortablePathSigningPolicyAlertLevel } from './sinks-contracts.server';

export type PortablePathSigningPolicyTrendReporterBootstrapEnvironmentSettings = {
  enabled: boolean;
  environmentProfile: PortablePathSigningPolicyProfile;
  reportEveryUses: number | null;
  persistenceEnabled: boolean;
  persistenceMaxSnapshots: number | null;
  driftAlertLevel: PortablePathSigningPolicyAlertLevel;
  sinkFailureAlertLevel: PortablePathSigningPolicyAlertLevel;
  expectedProfilesBySurface: PortablePathSigningPolicyExpectedProfilesBySurface;
};

export const resolvePortablePathSigningPolicyTrendReporterBootstrapSettingsFromEnvironment = (
  env: Record<string, string | undefined> = process.env
): PortablePathSigningPolicyTrendReporterBootstrapEnvironmentSettings => {
  const enabled =
    parseBooleanFromEnvironment(env[PORTABLE_PATH_SIGNING_POLICY_TREND_REPORTER_ENABLED_ENV]) ??
    true;
  const environmentProfile = resolvePortablePathEnvelopeVerificationAuditSinkProfileFromEnvironment(
    env['NODE_ENV']
  );
  const reportEveryUses = resolvePortablePathSigningPolicyTrendReportEveryUsesFromEnvironment(
    env[PORTABLE_PATH_SIGNING_POLICY_TREND_REPORT_EVERY_USES_ENV]
  );
  const persistenceEnabled =
    resolvePortablePathSigningPolicyTrendPersistenceEnabledFromEnvironment(
      env[PORTABLE_PATH_SIGNING_POLICY_TREND_PERSISTENCE_ENABLED_ENV]
    ) ?? true;
  const persistenceMaxSnapshots =
    resolvePortablePathSigningPolicyTrendPersistenceMaxSnapshotsFromEnvironment(
      env[PORTABLE_PATH_SIGNING_POLICY_TREND_PERSISTENCE_MAX_SNAPSHOTS_ENV]
    );
  const driftAlertLevel =
    resolvePortablePathSigningPolicyTrendAlertLevelFromEnvironment(
      env[PORTABLE_PATH_SIGNING_POLICY_DRIFT_ALERT_LEVEL_ENV]
    ) ?? 'warn';
  const sinkFailureAlertLevel =
    resolvePortablePathAuditSinkFailureAlertLevelFromEnvironment(
      env[PORTABLE_PATH_AUDIT_SINK_FAILURE_ALERT_LEVEL_ENV]
    ) ?? 'warn';
  const expectedProfilesBySurface =
    parsePortablePathSigningPolicyExpectedProfilesBySurfaceFromEnvironment(
      env['PORTABLE_PATH_SIGNING_POLICY_ALLOWED_PROFILES_BY_SURFACE'],
      environmentProfile
    );

  return {
    enabled,
    environmentProfile,
    reportEveryUses,
    persistenceEnabled,
    persistenceMaxSnapshots,
    driftAlertLevel,
    sinkFailureAlertLevel,
    expectedProfilesBySurface,
  };
};
