import 'server-only';

import {
  PORTABLE_PATH_AUDIT_SINK_FAILURE_ALERT_LEVEL_ENV,
  PORTABLE_PATH_SIGNING_POLICY_DRIFT_ALERT_LEVEL_ENV,
  PORTABLE_PATH_SIGNING_POLICY_TREND_PERSISTENCE_ENABLED_ENV,
  PORTABLE_PATH_SIGNING_POLICY_TREND_PERSISTENCE_MAX_SNAPSHOTS_ENV,
  PORTABLE_PATH_SIGNING_POLICY_TREND_REPORT_EVERY_USES_ENV,
  PORTABLE_PATH_SIGNING_POLICY_TREND_REPORTER_ENABLED_ENV,
} from './sinks-constants.server';
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

import type { PortablePathSigningPolicyProfile } from './portable-engine-resolution-types';
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

const resolveTrendReporterEnabledFromEnvironment = (
  env: Record<string, string | undefined>
): boolean =>
  parseBooleanFromEnvironment(env[PORTABLE_PATH_SIGNING_POLICY_TREND_REPORTER_ENABLED_ENV]) ??
  true;

const resolveTrendReporterPersistenceEnabledFromEnvironment = (
  env: Record<string, string | undefined>
): boolean =>
  resolvePortablePathSigningPolicyTrendPersistenceEnabledFromEnvironment(
    env[PORTABLE_PATH_SIGNING_POLICY_TREND_PERSISTENCE_ENABLED_ENV]
  ) ?? true;

const resolveTrendReporterAlertLevelsFromEnvironment = (
  env: Record<string, string | undefined>
): Pick<
  PortablePathSigningPolicyTrendReporterBootstrapEnvironmentSettings,
  'driftAlertLevel' | 'sinkFailureAlertLevel'
> => ({
  driftAlertLevel:
    resolvePortablePathSigningPolicyTrendAlertLevelFromEnvironment(
      env[PORTABLE_PATH_SIGNING_POLICY_DRIFT_ALERT_LEVEL_ENV]
    ) ?? 'warn',
  sinkFailureAlertLevel:
    resolvePortablePathAuditSinkFailureAlertLevelFromEnvironment(
      env[PORTABLE_PATH_AUDIT_SINK_FAILURE_ALERT_LEVEL_ENV]
    ) ?? 'warn',
});

const resolveTrendReporterExpectedProfilesFromEnvironment = (
  env: Record<string, string | undefined>,
  environmentProfile: PortablePathSigningPolicyProfile
): PortablePathSigningPolicyExpectedProfilesBySurface =>
  parsePortablePathSigningPolicyExpectedProfilesBySurfaceFromEnvironment(
    env['PORTABLE_PATH_SIGNING_POLICY_ALLOWED_PROFILES_BY_SURFACE'],
    environmentProfile
  );

export const resolvePortablePathSigningPolicyTrendReporterBootstrapSettingsFromEnvironment = (
  env: Record<string, string | undefined> = process.env
): PortablePathSigningPolicyTrendReporterBootstrapEnvironmentSettings => {
  const environmentProfile = resolvePortablePathEnvelopeVerificationAuditSinkProfileFromEnvironment(
    env['NODE_ENV']
  );
  const reportEveryUses = resolvePortablePathSigningPolicyTrendReportEveryUsesFromEnvironment(
    env[PORTABLE_PATH_SIGNING_POLICY_TREND_REPORT_EVERY_USES_ENV]
  );
  const persistenceMaxSnapshots =
    resolvePortablePathSigningPolicyTrendPersistenceMaxSnapshotsFromEnvironment(
      env[PORTABLE_PATH_SIGNING_POLICY_TREND_PERSISTENCE_MAX_SNAPSHOTS_ENV]
    );
  const { driftAlertLevel, sinkFailureAlertLevel } =
    resolveTrendReporterAlertLevelsFromEnvironment(env);

  return {
    enabled: resolveTrendReporterEnabledFromEnvironment(env),
    environmentProfile,
    reportEveryUses,
    persistenceEnabled: resolveTrendReporterPersistenceEnabledFromEnvironment(env),
    persistenceMaxSnapshots,
    driftAlertLevel,
    sinkFailureAlertLevel,
    expectedProfilesBySurface: resolveTrendReporterExpectedProfilesFromEnvironment(
      env,
      environmentProfile
    ),
  };
};
