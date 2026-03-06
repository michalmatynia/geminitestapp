import 'server-only';

import { logSystemEvent, type SystemLogInput } from '@/shared/lib/observability/system-logger';

import { resolvePortablePathSigningPolicyTrendReporterBootstrapSettingsFromEnvironment } from './sinks-trend-reporter-config.server';
import {
  createPortablePathSigningPolicyTrendReporter,
  type PortablePathSigningPolicyTrendReporter,
} from './sinks-trend-reporter.server';
import {
  resolvePortablePathSigningPolicyTrendPersistenceMaxSnapshots,
  toPortablePathSigningPolicyAlertLevel,
  type PortablePathSigningPolicyExpectedProfilesBySurface,
} from './sinks-trend-state.server';
import {
  PORTABLE_PATH_ENVELOPE_VERIFICATION_AUDIT_SINK_BOOTSTRAP_SOURCE,
  PORTABLE_PATH_ENVELOPE_VERIFICATION_AUDIT_SINK_HEALTH_CATEGORY,
  PORTABLE_PATH_ENVELOPE_VERIFICATION_AUDIT_SINK_HEALTH_KIND,
  PORTABLE_PATH_ENVELOPE_VERIFICATION_DEFAULT_SERVICE,
} from './sinks-constants.server';
import type {
  PortablePathEnvelopeVerificationAuditSinkStartupHealthSummary,
  PortablePathSigningPolicyAlertLevel,
} from './sinks-contracts.server';

export type EmitPortablePathAuditSinkStartupHealthAlertOptions = {
  level?: PortablePathSigningPolicyAlertLevel;
  writeLog?: (input: SystemLogInput) => Promise<void>;
};

export const emitPortablePathAuditSinkStartupHealthAlert = async (
  summary: PortablePathEnvelopeVerificationAuditSinkStartupHealthSummary | null | undefined,
  options: EmitPortablePathAuditSinkStartupHealthAlertOptions = {}
): Promise<boolean> => {
  if (!summary || summary.status === 'healthy' || summary.status === 'skipped') {
    return false;
  }
  const level = options.level ?? 'warn';
  if (level === 'off') return false;
  const writer = options.writeLog ?? logSystemEvent;
  await writer({
    level: toPortablePathSigningPolicyAlertLevel(level),
    source: PORTABLE_PATH_ENVELOPE_VERIFICATION_AUDIT_SINK_BOOTSTRAP_SOURCE,
    service: PORTABLE_PATH_ENVELOPE_VERIFICATION_DEFAULT_SERVICE,
    message: `Portable envelope verification audit sink startup health is ${summary.status}.`,
    context: {
      category: PORTABLE_PATH_ENVELOPE_VERIFICATION_AUDIT_SINK_HEALTH_CATEGORY,
      kind: PORTABLE_PATH_ENVELOPE_VERIFICATION_AUDIT_SINK_HEALTH_KIND,
      alertType: 'portable_audit_sink_startup_health',
      startupHealth: summary,
    },
  });
  return true;
};

export type BootstrapPortablePathSigningPolicyTrendReporterFromEnvironmentOptions = {
  env?: Record<string, string | undefined>;
  startupHealthSummary?: PortablePathEnvelopeVerificationAuditSinkStartupHealthSummary | null;
};

export type BootstrapPortablePathSigningPolicyTrendReporterFromEnvironmentResult = {
  enabled: boolean;
  reportEveryUses: number | null;
  persistenceEnabled: boolean;
  persistenceMaxSnapshots: number | null;
  driftAlertLevel: PortablePathSigningPolicyAlertLevel;
  sinkFailureAlertLevel: PortablePathSigningPolicyAlertLevel;
  expectedProfilesBySurface: PortablePathSigningPolicyExpectedProfilesBySurface;
  reporter: PortablePathSigningPolicyTrendReporter | null;
  stop: () => void;
};

export const bootstrapPortablePathSigningPolicyTrendReporterFromEnvironment = async (
  options: BootstrapPortablePathSigningPolicyTrendReporterFromEnvironmentOptions = {}
): Promise<BootstrapPortablePathSigningPolicyTrendReporterFromEnvironmentResult> => {
  const {
    enabled,
    environmentProfile,
    reportEveryUses,
    persistenceEnabled,
    persistenceMaxSnapshots,
    driftAlertLevel,
    sinkFailureAlertLevel,
    expectedProfilesBySurface,
  } = resolvePortablePathSigningPolicyTrendReporterBootstrapSettingsFromEnvironment(
    options.env ?? process.env
  );

  await emitPortablePathAuditSinkStartupHealthAlert(options.startupHealthSummary, {
    level: sinkFailureAlertLevel,
  });

  if (!enabled) {
    return {
      enabled: false,
      reportEveryUses,
      persistenceEnabled,
      persistenceMaxSnapshots,
      driftAlertLevel,
      sinkFailureAlertLevel,
      expectedProfilesBySurface,
      reporter: null,
      stop: () => {},
    };
  }

  const reporter = createPortablePathSigningPolicyTrendReporter({
    reportEveryUses: reportEveryUses ?? undefined,
    driftAlertLevel,
    sinkFailureAlertLevel,
    persistenceEnabled,
    persistenceMaxSnapshots: persistenceMaxSnapshots ?? undefined,
    expectedProfilesBySurface,
    environmentProfile,
  });

  return {
    enabled: true,
    reportEveryUses: reportEveryUses ?? reporter.getState().reportEveryUses,
    persistenceEnabled,
    persistenceMaxSnapshots:
      persistenceMaxSnapshots ??
      resolvePortablePathSigningPolicyTrendPersistenceMaxSnapshots(undefined),
    driftAlertLevel,
    sinkFailureAlertLevel,
    expectedProfilesBySurface,
    reporter,
    stop: (): void => {
      reporter.stop();
    },
  };
};
