import { describe, expect, it } from 'vitest';

import { resolvePortablePathSigningPolicyTrendReporterBootstrapSettingsFromEnvironment } from '../sinks-trend-reporter-config.server';
import {
  PORTABLE_PATH_AUDIT_SINK_FAILURE_ALERT_LEVEL_ENV,
  PORTABLE_PATH_SIGNING_POLICY_DRIFT_ALERT_LEVEL_ENV,
  PORTABLE_PATH_SIGNING_POLICY_TREND_PERSISTENCE_ENABLED_ENV,
  PORTABLE_PATH_SIGNING_POLICY_TREND_PERSISTENCE_MAX_SNAPSHOTS_ENV,
  PORTABLE_PATH_SIGNING_POLICY_TREND_REPORT_EVERY_USES_ENV,
  PORTABLE_PATH_SIGNING_POLICY_TREND_REPORTER_ENABLED_ENV,
} from '../sinks-constants.server';

describe('resolvePortablePathSigningPolicyTrendReporterBootstrapSettingsFromEnvironment', () => {
  it('applies explicit environment overrides and normalizes expected profiles', () => {
    const result = resolvePortablePathSigningPolicyTrendReporterBootstrapSettingsFromEnvironment({
      NODE_ENV: 'production',
      [PORTABLE_PATH_SIGNING_POLICY_TREND_REPORTER_ENABLED_ENV]: 'false',
      [PORTABLE_PATH_SIGNING_POLICY_TREND_REPORT_EVERY_USES_ENV]: '7',
      [PORTABLE_PATH_SIGNING_POLICY_TREND_PERSISTENCE_ENABLED_ENV]: '0',
      [PORTABLE_PATH_SIGNING_POLICY_TREND_PERSISTENCE_MAX_SNAPSHOTS_ENV]: '42',
      [PORTABLE_PATH_SIGNING_POLICY_DRIFT_ALERT_LEVEL_ENV]: 'error',
      [PORTABLE_PATH_AUDIT_SINK_FAILURE_ALERT_LEVEL_ENV]: 'off',
      PORTABLE_PATH_SIGNING_POLICY_ALLOWED_PROFILES_BY_SURFACE: JSON.stringify({
        canvas: ['production', 'prod'],
        product: ['staging', 'preprod'],
      }),
    });

    expect(result).toEqual({
      enabled: false,
      environmentProfile: 'prod',
      reportEveryUses: 7,
      persistenceEnabled: false,
      persistenceMaxSnapshots: 42,
      driftAlertLevel: 'error',
      sinkFailureAlertLevel: 'off',
      expectedProfilesBySurface: {
        canvas: ['prod'],
        product: ['staging'],
        api: ['prod'],
      },
    });
  });

  it('falls back to defaults when environment values are missing or invalid', () => {
    const result = resolvePortablePathSigningPolicyTrendReporterBootstrapSettingsFromEnvironment({
      NODE_ENV: 'development',
      [PORTABLE_PATH_SIGNING_POLICY_TREND_REPORTER_ENABLED_ENV]: 'maybe',
      [PORTABLE_PATH_SIGNING_POLICY_TREND_PERSISTENCE_ENABLED_ENV]: 'also-maybe',
      [PORTABLE_PATH_SIGNING_POLICY_DRIFT_ALERT_LEVEL_ENV]: 'loud',
      [PORTABLE_PATH_AUDIT_SINK_FAILURE_ALERT_LEVEL_ENV]: 'critical-ish',
      PORTABLE_PATH_SIGNING_POLICY_ALLOWED_PROFILES_BY_SURFACE: '{bad json',
    });

    expect(result).toEqual({
      enabled: true,
      environmentProfile: 'dev',
      reportEveryUses: null,
      persistenceEnabled: true,
      persistenceMaxSnapshots: null,
      driftAlertLevel: 'warn',
      sinkFailureAlertLevel: 'warn',
      expectedProfilesBySurface: {
        canvas: ['dev', 'staging', 'prod'],
        product: ['dev', 'staging', 'prod'],
        api: ['dev', 'staging', 'prod'],
      },
    });
  });
});
