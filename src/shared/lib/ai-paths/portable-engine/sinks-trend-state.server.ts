import 'server-only';

import type { PortablePathEnvelopeVerificationAuditSinkSnapshot } from './portable-engine-envelope-observability';
import type { PortablePathSigningPolicyUsageSnapshot } from './portable-engine-signing-policy-observability';
import type {
  PortablePathSigningPolicyProfile,
  PortablePathSigningPolicySurface,
} from './portable-engine-types';
import {
  parseBooleanFromEnvironment,
  readSettingsRawByProviderPriority,
  writeSettingsRawByProviderPriority,
} from './sinks-shared.server';
import {
  PORTABLE_PATH_AUDIT_SINK_FAILURE_ALERT_LEVEL_ENV,
  PORTABLE_PATH_SIGNING_POLICY_DRIFT_ALERT_LEVEL_ENV,
  PORTABLE_PATH_SIGNING_POLICY_TREND_PERSISTENCE_ENABLED_ENV,
  PORTABLE_PATH_SIGNING_POLICY_TREND_PERSISTENCE_MAX_SNAPSHOTS_ENV,
  PORTABLE_PATH_SIGNING_POLICY_TREND_REPORT_EVERY_USES_ENV,
  PORTABLE_PATH_SIGNING_POLICY_TREND_SETTINGS_KEY,
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

export type PortablePathSigningPolicyTrendReportTrigger = 'threshold' | 'manual';

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

export const coercePortablePathSigningPolicyReportEveryUses = (
  value: number | null | undefined
): number => {
  if (!Number.isFinite(value)) return DEFAULT_PORTABLE_PATH_SIGNING_POLICY_TREND_REPORT_EVERY_USES;
  return Math.max(1, Math.floor(Number(value)));
};

export const resolvePortablePathSigningPolicyTrendPersistenceMaxSnapshots = (
  value: number | null | undefined
): number => {
  if (!Number.isFinite(value)) {
    return DEFAULT_PORTABLE_PATH_SIGNING_POLICY_TREND_PERSISTENCE_MAX_SNAPSHOTS;
  }
  const normalized = Math.floor(Number(value));
  if (normalized <= 0) {
    return DEFAULT_PORTABLE_PATH_SIGNING_POLICY_TREND_PERSISTENCE_MAX_SNAPSHOTS;
  }
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

export const normalizePortablePathSigningPolicyExpectedProfilesBySurface = (
  override:
    | Partial<Record<PortablePathSigningPolicySurface, PortablePathSigningPolicyProfile[]>>
    | undefined,
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
    const override: Partial<
      Record<PortablePathSigningPolicySurface, PortablePathSigningPolicyProfile[]>
    > = {};
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

export const toPortablePathSigningPolicyAlertLevel = (
  level: PortablePathSigningPolicyAlertLevel
): 'warn' | 'error' => (level === 'error' ? 'error' : 'warn');
