import 'server-only';

import { logSystemEvent, type SystemLogInput } from '@/shared/lib/observability/system-logger';

import {
  getPortablePathEnvelopeVerificationAuditSinkSnapshot,
  type PortablePathEnvelopeVerificationAuditSinkSnapshot,
} from './portable-engine-envelope-audit-sinks';
import {
  getPortablePathSigningPolicyUsageSnapshot,
  registerPortablePathSigningPolicyUsageHook,
  type PortablePathSigningPolicyUsageSnapshot,
} from './portable-engine-signing-policy-observability';
import type {
  PortablePathSigningPolicyProfile,
  PortablePathSigningPolicySurface,
} from './portable-engine-resolution-types';
import {
  parseBooleanFromEnvironment,
  resolvePortablePathEnvelopeVerificationAuditSinkProfileFromEnvironment,
} from './sinks-environment.server';
import {
  appendPortablePathSigningPolicyTrendSnapshot,
  collectPortablePathSigningPolicyDriftAlerts,
  coercePortablePathSigningPolicyReportEveryUses,
  normalizePortablePathSigningPolicyExpectedProfilesBySurface,
  parsePortablePathSigningPolicyExpectedProfilesBySurfaceFromEnvironment,
  resolvePortablePathAuditSinkFailureAlertLevelFromEnvironment,
  resolvePortablePathSigningPolicyTrendAlertLevelFromEnvironment,
  resolvePortablePathSigningPolicyTrendPersistenceEnabledFromEnvironment,
  resolvePortablePathSigningPolicyTrendPersistenceMaxSnapshots,
  resolvePortablePathSigningPolicyTrendPersistenceMaxSnapshotsFromEnvironment,
  resolvePortablePathSigningPolicyTrendReportEveryUsesFromEnvironment,
  toPortablePathSigningPolicyAlertLevel,
  type PortablePathSigningPolicyDriftAlert,
  type PortablePathSigningPolicyExpectedProfilesBySurface,
  type PortablePathSigningPolicyTrendPersistedSnapshot,
  type PortablePathSigningPolicyTrendReportTrigger,
} from './sinks-trend-state.server';
import {
  PORTABLE_PATH_AUDIT_SINK_FAILURE_ALERT_LEVEL_ENV,
  PORTABLE_PATH_ENVELOPE_VERIFICATION_AUDIT_SINK_BOOTSTRAP_SOURCE,
  PORTABLE_PATH_ENVELOPE_VERIFICATION_AUDIT_SINK_HEALTH_CATEGORY,
  PORTABLE_PATH_ENVELOPE_VERIFICATION_AUDIT_SINK_HEALTH_KIND,
  PORTABLE_PATH_ENVELOPE_VERIFICATION_DEFAULT_SERVICE,
  PORTABLE_PATH_SIGNING_POLICY_DRIFT_ALERT_LEVEL_ENV,
  PORTABLE_PATH_SIGNING_POLICY_TREND_CATEGORY,
  PORTABLE_PATH_SIGNING_POLICY_TREND_KIND,
  PORTABLE_PATH_SIGNING_POLICY_TREND_PERSISTENCE_ENABLED_ENV,
  PORTABLE_PATH_SIGNING_POLICY_TREND_PERSISTENCE_MAX_SNAPSHOTS_ENV,
  PORTABLE_PATH_SIGNING_POLICY_TREND_REPORT_EVERY_USES_ENV,
  PORTABLE_PATH_SIGNING_POLICY_TREND_REPORTER_ENABLED_ENV,
  PORTABLE_PATH_SIGNING_POLICY_TREND_SOURCE,
  type PortablePathEnvelopeVerificationAuditSinkStartupHealthSummary,
  type PortablePathSigningPolicyAlertLevel,
} from './sinks-types.server';

export {
  appendPortablePathSigningPolicyTrendSnapshot,
  collectPortablePathSigningPolicyDriftAlerts,
  loadPortablePathSigningPolicyTrendSnapshots,
  parsePortablePathSigningPolicyExpectedProfilesBySurfaceFromEnvironment,
  resolvePortablePathAuditSinkFailureAlertLevelFromEnvironment,
  resolvePortablePathSigningPolicyTrendAlertLevelFromEnvironment,
  resolvePortablePathSigningPolicyTrendPersistenceEnabledFromEnvironment,
  resolvePortablePathSigningPolicyTrendPersistenceMaxSnapshotsFromEnvironment,
  resolvePortablePathSigningPolicyTrendReportEveryUsesFromEnvironment,
} from './sinks-trend-state.server';
export type {
  AppendPortablePathSigningPolicyTrendSnapshotOptions,
  LoadPortablePathSigningPolicyTrendSnapshotsOptions,
  PortablePathSigningPolicyDriftAlert,
  PortablePathSigningPolicyExpectedProfilesBySurface,
  PortablePathSigningPolicyTrendPersistedSnapshot,
} from './sinks-trend-state.server';

const toPortablePathSigningPolicyUsageSurfaceDelta = (
  current: PortablePathSigningPolicyUsageSnapshot,
  previous: PortablePathSigningPolicyUsageSnapshot,
  surface: PortablePathSigningPolicySurface
): number => Math.max(0, current.bySurface[surface] - previous.bySurface[surface]);

const toPortablePathAuditSinkTotalsDelta = (
  current: PortablePathEnvelopeVerificationAuditSinkSnapshot,
  previous: PortablePathEnvelopeVerificationAuditSinkSnapshot
): {
  writesAttempted: number;
  writesSucceeded: number;
  writesFailed: number;
} => ({
  writesAttempted: Math.max(0, current.totals.writesAttempted - previous.totals.writesAttempted),
  writesSucceeded: Math.max(0, current.totals.writesSucceeded - previous.totals.writesSucceeded),
  writesFailed: Math.max(0, current.totals.writesFailed - previous.totals.writesFailed),
});

export type CreatePortablePathSigningPolicyTrendReporterOptions = {
  reportEveryUses?: number;
  driftAlertLevel?: PortablePathSigningPolicyAlertLevel;
  sinkFailureAlertLevel?: PortablePathSigningPolicyAlertLevel;
  persistenceEnabled?: boolean;
  persistenceMaxSnapshots?: number;
  expectedProfilesBySurface?: Partial<
    Record<PortablePathSigningPolicySurface, PortablePathSigningPolicyProfile[]>
  >;
  environmentProfile?: PortablePathSigningPolicyProfile;
  writeLog?: (input: SystemLogInput) => Promise<void>;
  persistSnapshot?: (
    snapshot: PortablePathSigningPolicyTrendPersistedSnapshot,
    options: { maxSnapshots: number }
  ) => Promise<boolean>;
  getUsageSnapshot?: () => PortablePathSigningPolicyUsageSnapshot;
  getSinkSnapshot?: () => PortablePathEnvelopeVerificationAuditSinkSnapshot;
  subscribeUsageHook?: typeof registerPortablePathSigningPolicyUsageHook;
};

export type PortablePathSigningPolicyTrendReporterState = {
  reportEveryUses: number;
  reportsEmitted: number;
  driftAlertsEmitted: number;
  sinkFailureAlertsEmitted: number;
  persistenceWritesSucceeded: number;
  persistenceWritesFailed: number;
  lastReportedAt: string | null;
  lastUsageTotal: number;
  lastSinkFailureTotal: number;
};

export type PortablePathSigningPolicyTrendReporter = {
  reportNow: () => Promise<void>;
  stop: () => void;
  getState: () => PortablePathSigningPolicyTrendReporterState;
};

const toPortablePathSigningPolicyTrendLogInput = (
  usageSnapshot: PortablePathSigningPolicyUsageSnapshot,
  usageBaseline: PortablePathSigningPolicyUsageSnapshot,
  sinkSnapshot: PortablePathEnvelopeVerificationAuditSinkSnapshot,
  sinkBaseline: PortablePathEnvelopeVerificationAuditSinkSnapshot,
  expectedProfilesBySurface: PortablePathSigningPolicyExpectedProfilesBySurface,
  reportEveryUses: number,
  trigger: PortablePathSigningPolicyTrendReportTrigger
): SystemLogInput => ({
  level: 'info',
  source: PORTABLE_PATH_SIGNING_POLICY_TREND_SOURCE,
  service: PORTABLE_PATH_ENVELOPE_VERIFICATION_DEFAULT_SERVICE,
  message: 'Portable signing policy usage trend snapshot.',
  context: {
    category: PORTABLE_PATH_SIGNING_POLICY_TREND_CATEGORY,
    kind: PORTABLE_PATH_SIGNING_POLICY_TREND_KIND,
    trigger,
    reportEveryUses,
    usageDelta: {
      uses: Math.max(0, usageSnapshot.totals.uses - usageBaseline.totals.uses),
      bySurface: {
        canvas: toPortablePathSigningPolicyUsageSurfaceDelta(
          usageSnapshot,
          usageBaseline,
          'canvas'
        ),
        product: toPortablePathSigningPolicyUsageSurfaceDelta(
          usageSnapshot,
          usageBaseline,
          'product'
        ),
        api: toPortablePathSigningPolicyUsageSurfaceDelta(usageSnapshot, usageBaseline, 'api'),
      },
    },
    usageTotals: usageSnapshot.totals,
    sinkTotals: sinkSnapshot.totals,
    sinkDelta: toPortablePathAuditSinkTotalsDelta(sinkSnapshot, sinkBaseline),
    expectedProfilesBySurface,
  },
});

const toPortablePathSigningPolicyTrendPersistedSnapshot = (
  usageSnapshot: PortablePathSigningPolicyUsageSnapshot,
  sinkSnapshot: PortablePathEnvelopeVerificationAuditSinkSnapshot,
  expectedProfilesBySurface: PortablePathSigningPolicyExpectedProfilesBySurface,
  reportEveryUses: number,
  trigger: PortablePathSigningPolicyTrendReportTrigger,
  driftAlerts: PortablePathSigningPolicyDriftAlert[]
): PortablePathSigningPolicyTrendPersistedSnapshot => ({
  at: new Date().toISOString(),
  trigger,
  reportEveryUses,
  usageTotals: usageSnapshot.totals,
  usageBySurface: usageSnapshot.bySurface,
  usageByProfile: usageSnapshot.byProfile,
  sinkTotals: sinkSnapshot.totals,
  sinkRegisteredIds: sinkSnapshot.registeredSinkIds,
  sinkRecentFailures: sinkSnapshot.recentFailures.slice(-20),
  expectedProfilesBySurface,
  driftAlerts,
});

export const createPortablePathSigningPolicyTrendReporter = (
  options: CreatePortablePathSigningPolicyTrendReporterOptions = {}
): PortablePathSigningPolicyTrendReporter => {
  const writeLog = options.writeLog ?? logSystemEvent;
  const getUsageSnapshot = options.getUsageSnapshot ?? getPortablePathSigningPolicyUsageSnapshot;
  const getSinkSnapshot =
    options.getSinkSnapshot ?? getPortablePathEnvelopeVerificationAuditSinkSnapshot;
  const subscribeUsageHook =
    options.subscribeUsageHook ?? registerPortablePathSigningPolicyUsageHook;
  const environmentProfile =
    options.environmentProfile ??
    resolvePortablePathEnvelopeVerificationAuditSinkProfileFromEnvironment();
  const reportEveryUses = coercePortablePathSigningPolicyReportEveryUses(options.reportEveryUses);
  const driftAlertLevel = options.driftAlertLevel ?? 'warn';
  const sinkFailureAlertLevel = options.sinkFailureAlertLevel ?? 'warn';
  const persistenceEnabled = options.persistenceEnabled ?? true;
  const persistenceMaxSnapshots = resolvePortablePathSigningPolicyTrendPersistenceMaxSnapshots(
    options.persistenceMaxSnapshots
  );
  const persistSnapshot = options.persistSnapshot ?? appendPortablePathSigningPolicyTrendSnapshot;
  const expectedProfilesBySurface = normalizePortablePathSigningPolicyExpectedProfilesBySurface(
    options.expectedProfilesBySurface,
    environmentProfile
  );

  let usageBaseline = getUsageSnapshot();
  let sinkBaseline = getSinkSnapshot();
  let reportsEmitted = 0;
  let driftAlertsEmitted = 0;
  let sinkFailureAlertsEmitted = 0;
  let persistenceWritesSucceeded = 0;
  let persistenceWritesFailed = 0;
  let lastReportedAt: string | null = null;
  let lastSinkFailureAlertTotal = sinkBaseline.totals.writesFailed;
  const driftAlertCursor = new Map<string, number>();
  let disposed = false;

  const emitAlerts = async (
    sinkSnapshot: PortablePathEnvelopeVerificationAuditSinkSnapshot,
    driftAlerts: PortablePathSigningPolicyDriftAlert[]
  ): Promise<void> => {
    if (driftAlertLevel !== 'off') {
      for (const alert of driftAlerts) {
        const alertKey = `${alert.surface}:${alert.profile}`;
        const previousObserved = driftAlertCursor.get(alertKey) ?? 0;
        if (alert.observedUses < previousObserved) {
          driftAlertCursor.set(alertKey, 0);
        }
        const normalizedPrevious = driftAlertCursor.get(alertKey) ?? 0;
        if (alert.observedUses <= normalizedPrevious) continue;
        driftAlertCursor.set(alertKey, alert.observedUses);
        driftAlertsEmitted += 1;
        await writeLog({
          level: toPortablePathSigningPolicyAlertLevel(driftAlertLevel),
          source: PORTABLE_PATH_SIGNING_POLICY_TREND_SOURCE,
          service: PORTABLE_PATH_ENVELOPE_VERIFICATION_DEFAULT_SERVICE,
          message: `Portable signing policy drift detected surface=${alert.surface} profile=${alert.profile}.`,
          context: {
            category: PORTABLE_PATH_SIGNING_POLICY_TREND_CATEGORY,
            kind: PORTABLE_PATH_SIGNING_POLICY_TREND_KIND,
            alertType: 'signing_policy_profile_drift',
            surface: alert.surface,
            profile: alert.profile,
            observedUses: alert.observedUses,
            deltaUses: alert.observedUses - normalizedPrevious,
            allowedProfiles: alert.allowedProfiles,
          },
        });
      }
    }

    if (sinkFailureAlertLevel === 'off') {
      lastSinkFailureAlertTotal = sinkSnapshot.totals.writesFailed;
      return;
    }

    if (sinkSnapshot.totals.writesFailed < lastSinkFailureAlertTotal) {
      lastSinkFailureAlertTotal = 0;
    }
    const sinkFailureDelta = sinkSnapshot.totals.writesFailed - lastSinkFailureAlertTotal;
    if (sinkFailureDelta <= 0) return;
    lastSinkFailureAlertTotal = sinkSnapshot.totals.writesFailed;
    sinkFailureAlertsEmitted += 1;
    await writeLog({
      level: toPortablePathSigningPolicyAlertLevel(sinkFailureAlertLevel),
      source: PORTABLE_PATH_SIGNING_POLICY_TREND_SOURCE,
      service: PORTABLE_PATH_ENVELOPE_VERIFICATION_DEFAULT_SERVICE,
      message: 'Portable envelope verification audit sink failures increased.',
      context: {
        category: PORTABLE_PATH_ENVELOPE_VERIFICATION_AUDIT_SINK_HEALTH_CATEGORY,
        kind: PORTABLE_PATH_ENVELOPE_VERIFICATION_AUDIT_SINK_HEALTH_KIND,
        alertType: 'portable_audit_sink_failures_increased',
        writesFailedDelta: sinkFailureDelta,
        writesFailedTotal: sinkSnapshot.totals.writesFailed,
        writesAttemptedTotal: sinkSnapshot.totals.writesAttempted,
        writesSucceededTotal: sinkSnapshot.totals.writesSucceeded,
        recentFailures: sinkSnapshot.recentFailures.slice(-5),
      },
    });
  };

  const emitTrendSnapshot = async (
    trigger: PortablePathSigningPolicyTrendReportTrigger
  ): Promise<void> => {
    if (disposed) return;
    const usageSnapshot = getUsageSnapshot();
    const sinkSnapshot = getSinkSnapshot();
    const usageDelta = usageSnapshot.totals.uses - usageBaseline.totals.uses;
    if (trigger === 'threshold' && usageDelta < reportEveryUses) {
      return;
    }
    const driftAlerts = collectPortablePathSigningPolicyDriftAlerts(
      usageSnapshot,
      expectedProfilesBySurface
    );

    await writeLog(
      toPortablePathSigningPolicyTrendLogInput(
        usageSnapshot,
        usageBaseline,
        sinkSnapshot,
        sinkBaseline,
        expectedProfilesBySurface,
        reportEveryUses,
        trigger
      )
    );
    await emitAlerts(sinkSnapshot, driftAlerts);
    if (persistenceEnabled) {
      try {
        const persisted = await persistSnapshot(
          toPortablePathSigningPolicyTrendPersistedSnapshot(
            usageSnapshot,
            sinkSnapshot,
            expectedProfilesBySurface,
            reportEveryUses,
            trigger,
            driftAlerts
          ),
          {
            maxSnapshots: persistenceMaxSnapshots,
          }
        );
        if (persisted) {
          persistenceWritesSucceeded += 1;
        } else {
          persistenceWritesFailed += 1;
        }
      } catch {
        persistenceWritesFailed += 1;
      }
    }
    usageBaseline = usageSnapshot;
    sinkBaseline = sinkSnapshot;
    reportsEmitted += 1;
    lastReportedAt = new Date().toISOString();
  };

  const unsubscribeUsageHook = subscribeUsageHook(() => {
    void emitTrendSnapshot('threshold').catch(() => {
      // Observability reporter must stay non-blocking.
    });
  });

  return {
    reportNow: async (): Promise<void> => {
      await emitTrendSnapshot('manual');
    },
    stop: (): void => {
      if (disposed) return;
      disposed = true;
      unsubscribeUsageHook();
    },
    getState: (): PortablePathSigningPolicyTrendReporterState => ({
      reportEveryUses,
      reportsEmitted,
      driftAlertsEmitted,
      sinkFailureAlertsEmitted,
      persistenceWritesSucceeded,
      persistenceWritesFailed,
      lastReportedAt,
      lastUsageTotal: usageBaseline.totals.uses,
      lastSinkFailureTotal: sinkBaseline.totals.writesFailed,
    }),
  };
};

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
  const env = options.env ?? process.env;
  const enabled =
    parseBooleanFromEnvironment(
      env[PORTABLE_PATH_SIGNING_POLICY_TREND_REPORTER_ENABLED_ENV]
    ) ?? true;
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
    stop: () => {
      reporter.stop();
    },
  };
};
