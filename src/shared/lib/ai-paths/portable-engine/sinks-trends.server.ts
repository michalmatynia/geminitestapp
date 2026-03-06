import 'server-only';

import { logSystemEvent, type SystemLogInput } from '@/shared/lib/observability/system-logger';

import {
  getPortablePathEnvelopeVerificationAuditSinkSnapshot,
  getPortablePathSigningPolicyUsageSnapshot,
  registerPortablePathSigningPolicyUsageHook,
  type PortablePathEnvelopeVerificationAuditSinkSnapshot,
  type PortablePathSigningPolicyUsageSnapshot,
} from './portable-engine-observability';
import type {
  PortablePathSigningPolicyProfile,
  PortablePathSigningPolicySurface,
} from './portable-engine-types';
import {
  parseBooleanFromEnvironment,
  readSettingsRawByProviderPriority,
  resolvePortablePathEnvelopeVerificationAuditSinkProfileFromEnvironment,
  writeSettingsRawByProviderPriority,
} from './sinks-shared.server';
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
  PORTABLE_PATH_SIGNING_POLICY_TREND_SETTINGS_KEY,
  PORTABLE_PATH_SIGNING_POLICY_TREND_SOURCE,
  type PortablePathEnvelopeVerificationAuditSinkStartupHealthSummary,
  type PortablePathSigningPolicyAlertLevel,
} from './sinks-types.server';

const PORTABLE_PATH_SIGNING_POLICY_SURFACES = ['canvas', 'product', 'api'] as const;
const PORTABLE_PATH_SIGNING_POLICY_PROFILES = ['dev', 'staging', 'prod'] as const;
const DEFAULT_PORTABLE_PATH_SIGNING_POLICY_TREND_REPORT_EVERY_USES = 20;
const DEFAULT_PORTABLE_PATH_SIGNING_POLICY_TREND_PERSISTENCE_MAX_SNAPSHOTS = 200;

export type PortablePathSigningPolicyExpectedProfilesBySurface = Record<
  PortablePathSigningPolicySurface,
  PortablePathSigningPolicyProfile[]
>;

export type PortablePathSigningPolicyDriftAlert = {
  surface: PortablePathSigningPolicySurface;
  profile: PortablePathSigningPolicyProfile;
  observedUses: number;
  allowedProfiles: PortablePathSigningPolicyProfile[];
};

type PortablePathSigningPolicyTrendReportTrigger = 'threshold' | 'manual';

type PortablePathSigningPolicyTrendSnapshotEnvelope = {
  version: 1;
  updatedAt: string;
  entries: PortablePathSigningPolicyTrendPersistedSnapshot[];
};

export type PortablePathSigningPolicyTrendPersistedSnapshot = {
  at: string;
  trigger: PortablePathSigningPolicyTrendReportTrigger;
  reportEveryUses: number;
  usageTotals: PortablePathSigningPolicyUsageSnapshot['totals'];
  usageBySurface: PortablePathSigningPolicyUsageSnapshot['bySurface'];
  usageByProfile: PortablePathSigningPolicyUsageSnapshot['byProfile'];
  sinkTotals: PortablePathEnvelopeVerificationAuditSinkSnapshot['totals'];
  sinkRegisteredIds: string[];
  sinkRecentFailures: PortablePathEnvelopeVerificationAuditSinkSnapshot['recentFailures'];
  expectedProfilesBySurface: PortablePathSigningPolicyExpectedProfilesBySurface;
  driftAlerts: PortablePathSigningPolicyDriftAlert[];
};

type PortablePathSigningPolicyTrendStoreReadRaw = () => Promise<string | null>;
type PortablePathSigningPolicyTrendStoreWriteRaw = (raw: string) => Promise<boolean>;

const dedupePortablePathSigningPolicyProfiles = (
  profiles: readonly PortablePathSigningPolicyProfile[]
): PortablePathSigningPolicyProfile[] => {
  const deduped: PortablePathSigningPolicyProfile[] = [];
  for (const profile of profiles) {
    if (!deduped.includes(profile)) deduped.push(profile);
  }
  return deduped;
};

const coercePortablePathSigningPolicyReportEveryUses = (
  value: number | null | undefined
): number => {
  if (!Number.isFinite(value)) return DEFAULT_PORTABLE_PATH_SIGNING_POLICY_TREND_REPORT_EVERY_USES;
  return Math.max(1, Math.floor(Number(value)));
};

const resolvePortablePathSigningPolicyTrendPersistenceMaxSnapshots = (
  value: number | null | undefined
): number => {
  if (!Number.isFinite(value)) return DEFAULT_PORTABLE_PATH_SIGNING_POLICY_TREND_PERSISTENCE_MAX_SNAPSHOTS;
  const normalized = Math.floor(Number(value));
  if (normalized <= 0) return DEFAULT_PORTABLE_PATH_SIGNING_POLICY_TREND_PERSISTENCE_MAX_SNAPSHOTS;
  return Math.min(normalized, 1000);
};

const createDefaultPortablePathSigningPolicyExpectedProfilesBySurface = (
  environmentProfile: PortablePathSigningPolicyProfile
): PortablePathSigningPolicyExpectedProfilesBySurface => {
  switch (environmentProfile) {
    case 'prod':
      return {
        canvas: ['prod'],
        product: ['prod'],
        api: ['prod'],
      };
    case 'staging':
      return {
        canvas: ['staging', 'prod'],
        product: ['staging', 'prod'],
        api: ['staging', 'prod'],
      };
    case 'dev':
    default:
      return {
        canvas: ['dev', 'staging', 'prod'],
        product: ['dev', 'staging', 'prod'],
        api: ['dev', 'staging', 'prod'],
      };
  }
};

const normalizePortablePathSigningPolicyExpectedProfilesBySurface = (
  override: Partial<Record<PortablePathSigningPolicySurface, PortablePathSigningPolicyProfile[]>> | undefined,
  environmentProfile: PortablePathSigningPolicyProfile
): PortablePathSigningPolicyExpectedProfilesBySurface => {
  const defaults =
    createDefaultPortablePathSigningPolicyExpectedProfilesBySurface(environmentProfile);
  const resolved: PortablePathSigningPolicyExpectedProfilesBySurface = {
    canvas: defaults.canvas,
    product: defaults.product,
    api: defaults.api,
  };
  for (const surface of PORTABLE_PATH_SIGNING_POLICY_SURFACES) {
    const candidate = override?.[surface];
    if (!candidate || candidate.length === 0) continue;
    resolved[surface] = dedupePortablePathSigningPolicyProfiles(candidate);
  }
  return resolved;
};

const normalizePortablePathSigningPolicyProfile = (
  value: string
): PortablePathSigningPolicyProfile | null => {
  const normalized = value.trim().toLowerCase();
  if (normalized === 'dev' || normalized === 'development' || normalized === 'local') {
    return 'dev';
  }
  if (normalized === 'staging' || normalized === 'stage' || normalized === 'preprod') {
    return 'staging';
  }
  if (normalized === 'prod' || normalized === 'production') {
    return 'prod';
  }
  return null;
};

export const parsePortablePathSigningPolicyExpectedProfilesBySurfaceFromEnvironment = (
  value: string | undefined,
  environmentProfile: PortablePathSigningPolicyProfile
): PortablePathSigningPolicyExpectedProfilesBySurface => {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return createDefaultPortablePathSigningPolicyExpectedProfilesBySurface(environmentProfile);
  }
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return createDefaultPortablePathSigningPolicyExpectedProfilesBySurface(environmentProfile);
    }
    const record = parsed as Record<string, unknown>;
    const override: Partial<Record<PortablePathSigningPolicySurface, PortablePathSigningPolicyProfile[]>> =
      {};
    for (const surface of PORTABLE_PATH_SIGNING_POLICY_SURFACES) {
      const raw = record[surface];
      if (!Array.isArray(raw)) continue;
      const normalized = raw
        .map((item): PortablePathSigningPolicyProfile | null => {
          if (typeof item !== 'string') return null;
          return normalizePortablePathSigningPolicyProfile(item);
        })
        .filter((item): item is PortablePathSigningPolicyProfile => item !== null);
      if (normalized.length > 0) {
        override[surface] = dedupePortablePathSigningPolicyProfiles(normalized);
      }
    }
    return normalizePortablePathSigningPolicyExpectedProfilesBySurface(
      override,
      environmentProfile
    );
  } catch {
    return createDefaultPortablePathSigningPolicyExpectedProfilesBySurface(environmentProfile);
  }
};

const resolvePortablePathSigningPolicyAlertLevel = (
  value: string | undefined | null
): PortablePathSigningPolicyAlertLevel | null => {
  const normalized = String(value ?? '')
    .trim()
    .toLowerCase();
  if (normalized === 'off' || normalized === '0' || normalized === 'false') return 'off';
  if (normalized === 'warn' || normalized === 'warning') return 'warn';
  if (normalized === 'error' || normalized === 'critical' || normalized === 'strict') {
    return 'error';
  }
  return null;
};

export const resolvePortablePathSigningPolicyTrendAlertLevelFromEnvironment = (
  value = process.env[PORTABLE_PATH_SIGNING_POLICY_DRIFT_ALERT_LEVEL_ENV]
): PortablePathSigningPolicyAlertLevel | null =>
  resolvePortablePathSigningPolicyAlertLevel(value);

export const resolvePortablePathAuditSinkFailureAlertLevelFromEnvironment = (
  value = process.env[PORTABLE_PATH_AUDIT_SINK_FAILURE_ALERT_LEVEL_ENV]
): PortablePathSigningPolicyAlertLevel | null =>
  resolvePortablePathSigningPolicyAlertLevel(value);

export const resolvePortablePathSigningPolicyTrendReportEveryUsesFromEnvironment = (
  value = process.env[PORTABLE_PATH_SIGNING_POLICY_TREND_REPORT_EVERY_USES_ENV]
): number | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (trimmed.length === 0) return null;
  const numeric = Number(trimmed);
  if (!Number.isFinite(numeric)) return null;
  return coercePortablePathSigningPolicyReportEveryUses(numeric);
};

export const resolvePortablePathSigningPolicyTrendPersistenceEnabledFromEnvironment = (
  value = process.env[PORTABLE_PATH_SIGNING_POLICY_TREND_PERSISTENCE_ENABLED_ENV]
): boolean | null => parseBooleanFromEnvironment(value);

export const resolvePortablePathSigningPolicyTrendPersistenceMaxSnapshotsFromEnvironment = (
  value = process.env[PORTABLE_PATH_SIGNING_POLICY_TREND_PERSISTENCE_MAX_SNAPSHOTS_ENV]
): number | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (trimmed.length === 0) return null;
  const numeric = Number(trimmed);
  if (!Number.isFinite(numeric)) return null;
  return resolvePortablePathSigningPolicyTrendPersistenceMaxSnapshots(numeric);
};

const readPortablePathSigningPolicyTrendRawByProviderPriority =
  async (): Promise<string | null> =>
    readSettingsRawByProviderPriority(PORTABLE_PATH_SIGNING_POLICY_TREND_SETTINGS_KEY);

const writePortablePathSigningPolicyTrendRawByProviderPriority = async (
  raw: string
): Promise<boolean> =>
  writeSettingsRawByProviderPriority(PORTABLE_PATH_SIGNING_POLICY_TREND_SETTINGS_KEY, raw);

const isPortablePathSigningPolicyTrendPersistedSnapshot = (
  value: unknown
): value is PortablePathSigningPolicyTrendPersistedSnapshot => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  if (typeof record['at'] !== 'string' || record['at'].trim().length === 0) return false;
  if (record['trigger'] !== 'threshold' && record['trigger'] !== 'manual') return false;
  return typeof record['reportEveryUses'] === 'number' && Number.isFinite(record['reportEveryUses']);
};

const parsePortablePathSigningPolicyTrendSnapshotEnvelope = (
  raw: string | null,
  maxSnapshots: number
): PortablePathSigningPolicyTrendPersistedSnapshot[] => {
  if (typeof raw !== 'string' || raw.trim().length === 0) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed)) {
      return parsed
        .filter((item): item is PortablePathSigningPolicyTrendPersistedSnapshot =>
          isPortablePathSigningPolicyTrendPersistedSnapshot(item)
        )
        .slice(-maxSnapshots);
    }
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return [];
    const envelope = parsed as Partial<PortablePathSigningPolicyTrendSnapshotEnvelope> & {
      entries?: unknown;
    };
    if (!Array.isArray(envelope.entries)) return [];
    return envelope.entries
      .filter((item): item is PortablePathSigningPolicyTrendPersistedSnapshot =>
        isPortablePathSigningPolicyTrendPersistedSnapshot(item)
      )
      .slice(-maxSnapshots);
  } catch {
    return [];
  }
};

const stringifyPortablePathSigningPolicyTrendSnapshotEnvelope = (
  snapshots: PortablePathSigningPolicyTrendPersistedSnapshot[],
  maxSnapshots: number
): string | null => {
  try {
    const envelope: PortablePathSigningPolicyTrendSnapshotEnvelope = {
      version: 1,
      updatedAt: new Date().toISOString(),
      entries: snapshots.slice(-maxSnapshots),
    };
    return JSON.stringify(envelope);
  } catch {
    return null;
  }
};

export type LoadPortablePathSigningPolicyTrendSnapshotsOptions = {
  maxSnapshots?: number;
  readRaw?: PortablePathSigningPolicyTrendStoreReadRaw;
};

export const loadPortablePathSigningPolicyTrendSnapshots = async (
  options: LoadPortablePathSigningPolicyTrendSnapshotsOptions = {}
): Promise<PortablePathSigningPolicyTrendPersistedSnapshot[]> => {
  const maxSnapshots = resolvePortablePathSigningPolicyTrendPersistenceMaxSnapshots(
    options.maxSnapshots
  );
  const readRaw = options.readRaw ?? readPortablePathSigningPolicyTrendRawByProviderPriority;
  const raw = await readRaw();
  return parsePortablePathSigningPolicyTrendSnapshotEnvelope(raw, maxSnapshots);
};

export type AppendPortablePathSigningPolicyTrendSnapshotOptions = {
  maxSnapshots?: number;
  readRaw?: PortablePathSigningPolicyTrendStoreReadRaw;
  writeRaw?: PortablePathSigningPolicyTrendStoreWriteRaw;
};

export const appendPortablePathSigningPolicyTrendSnapshot = async (
  snapshot: PortablePathSigningPolicyTrendPersistedSnapshot,
  options: AppendPortablePathSigningPolicyTrendSnapshotOptions = {}
): Promise<boolean> => {
  const maxSnapshots = resolvePortablePathSigningPolicyTrendPersistenceMaxSnapshots(
    options.maxSnapshots
  );
  const readRaw = options.readRaw ?? readPortablePathSigningPolicyTrendRawByProviderPriority;
  const writeRaw = options.writeRaw ?? writePortablePathSigningPolicyTrendRawByProviderPriority;
  const existing = parsePortablePathSigningPolicyTrendSnapshotEnvelope(await readRaw(), maxSnapshots);
  const serialized = stringifyPortablePathSigningPolicyTrendSnapshotEnvelope(
    [...existing, snapshot],
    maxSnapshots
  );
  if (!serialized) return false;
  return writeRaw(serialized);
};

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

export const collectPortablePathSigningPolicyDriftAlerts = (
  snapshot: PortablePathSigningPolicyUsageSnapshot,
  expectedProfilesBySurface: PortablePathSigningPolicyExpectedProfilesBySurface
): PortablePathSigningPolicyDriftAlert[] => {
  const alerts: PortablePathSigningPolicyDriftAlert[] = [];
  for (const surface of PORTABLE_PATH_SIGNING_POLICY_SURFACES) {
    const allowedProfiles = expectedProfilesBySurface[surface];
    for (const profile of PORTABLE_PATH_SIGNING_POLICY_PROFILES) {
      if (allowedProfiles.includes(profile)) continue;
      const observedUses = snapshot.byProfile[profile].bySurface[surface];
      if (observedUses <= 0) continue;
      alerts.push({
        surface,
        profile,
        observedUses,
        allowedProfiles,
      });
    }
  }
  return alerts;
};

const toPortablePathSigningPolicyAlertLevel = (
  level: PortablePathSigningPolicyAlertLevel
): 'warn' | 'error' => (level === 'error' ? 'error' : 'warn');

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
