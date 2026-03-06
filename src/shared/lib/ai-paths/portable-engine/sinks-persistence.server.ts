import 'server-only';

import prisma from '@/shared/lib/db/prisma';
import { getAppDbProvider } from '@/shared/lib/db/app-db-provider';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import { logSystemEvent, type SystemLogInput } from '@/shared/lib/observability/system-logger';

import {
  getPortablePathEnvelopeVerificationAuditSinkSnapshot,
  getPortablePathSigningPolicyUsageSnapshot,
  listPortablePathEnvelopeVerificationAuditSinkIds,
  registerPortablePathSigningPolicyUsageHook,
  registerPortablePathEnvelopeVerificationAuditSink,
  unregisterPortablePathEnvelopeVerificationAuditSink,
  type PortablePathEnvelopeVerificationAuditEvent,
  type PortablePathEnvelopeVerificationAuditSinkSnapshot,
  type PortablePathEnvelopeVerificationAuditSink,
  type PortablePathEnvelopeVerificationObservabilitySnapshot,
  type PortablePathSigningPolicyProfile,
  type PortablePathSigningPolicySurface,
  type PortablePathSigningPolicyUsageSnapshot,
} from './index';
import {
  enqueuePortablePathAuditSinkAutoRemediationDeadLetterCore,
  loadPortablePathAuditSinkAutoRemediationDeadLettersCore,
  notifyPortablePathAuditSinkAutoRemediationCore,
  savePortablePathAuditSinkAutoRemediationDeadLettersCore,
  type EnqueuePortablePathAuditSinkAutoRemediationDeadLetterOptions,
  type LoadPortablePathAuditSinkAutoRemediationDeadLettersOptions,
  type NotifyPortablePathAuditSinkAutoRemediationDeps,
  type NotifyPortablePathAuditSinkAutoRemediationOptions,
  type PortablePathAuditSinkAutoRemediationAction,
  type PortablePathAuditSinkAutoRemediationNotificationChannel,
  type PortablePathAuditSinkAutoRemediationNotificationChannelResult,
  type PortablePathAuditSinkAutoRemediationNotificationDeadLetterEntry,
  type PortablePathAuditSinkAutoRemediationNotificationDeadLetterSignature,
  type PortablePathAuditSinkAutoRemediationNotificationInput,
  type PortablePathAuditSinkAutoRemediationNotificationReceipt,
  type PortablePathAuditSinkAutoRemediationNotificationResult,
  type SavePortablePathAuditSinkAutoRemediationDeadLettersOptions,
} from './sinks-auto-remediation-notifications.server';
import {
  replayPortablePathAuditSinkAutoRemediationDeadLettersCore,
  type PortablePathAuditSinkAutoRemediationDeadLetterReplayAttempt,
  type PortablePathAuditSinkAutoRemediationDeadLetterReplayResult,
  type ReplayPortablePathAuditSinkAutoRemediationDeadLettersDeps,
  type ReplayPortablePathAuditSinkAutoRemediationDeadLettersOptions,
} from './sinks-auto-remediation-replay.server';


type PrismaSettingClient = {
  setting?: {
    findUnique: (input: {
      where: { key: string };
      select: { value: true };
    }) => Promise<{ value: string } | null>;
    upsert: (input: {
      where: { key: string };
      create: { key: string; value: string };
      update: { value: string };
    }) => Promise<unknown>;
  };
};

const readSettingsRawFromPrisma = async (key: string): Promise<string | null> => {
  if (!canUsePrismaSettings()) return null;
  try {
    const prismaClient = prisma as unknown as PrismaSettingClient;
    if (!prismaClient.setting || typeof prismaClient.setting.findUnique !== 'function') {
      return null;
    }
    const setting = await prismaClient.setting.findUnique({
      where: { key },
      select: { value: true },
    });
    return setting?.value ?? null;
  } catch {
    return null;
  }
};

const writeSettingsRawToPrisma = async (key: string, raw: string): Promise<boolean> => {
  if (!canUsePrismaSettings()) return false;
  try {
    const prismaClient = prisma as unknown as PrismaSettingClient;
    if (!prismaClient.setting || typeof prismaClient.setting.upsert !== 'function') {
      return false;
    }
    await prismaClient.setting.upsert({
      where: { key },
      create: { key, value: raw },
      update: { value: raw },
    });
    return true;
  } catch {
    return false;
  }
};

const readSettingsRawFromMongo = async (key: string): Promise<string | null> => {
  if (!process.env['MONGODB_URI']) return null;
  try {
    const mongo = await getMongoDb();
    const record = await mongo
      .collection<PortablePathSigningPolicyTrendStoreSettingRecord>('settings')
      .findOne(
        {
          $or: [{ _id: key }, { key }],
        },
        { projection: { value: 1 } }
      );
    return typeof record?.value === 'string' ? record.value : null;
  } catch {
    return null;
  }
};

const writeSettingsRawToMongo = async (key: string, raw: string): Promise<boolean> => {
  if (!process.env['MONGODB_URI']) return false;
  try {
    const mongo = await getMongoDb();
    const now = new Date();
    await mongo
      .collection<PortablePathSigningPolicyTrendStoreSettingRecord>('settings')
      .updateOne(
        {
          $or: [{ _id: key }, { key }],
        },
        {
          $set: {
            key,
            value: raw,
            updatedAt: now,
          },
          $setOnInsert: {
            _id: key,
            createdAt: now,
          },
        },
        { upsert: true }
      );
    return true;
  } catch {
    return false;
  }
};

const readSettingsRawByProviderPriority = async (key: string): Promise<string | null> => {
  const provider = await Promise.resolve(getAppDbProvider()).catch(() => null);
  if (provider === 'mongodb') {
    const mongoRaw = await readSettingsRawFromMongo(key);
    if (mongoRaw !== null) return mongoRaw;
    return readSettingsRawFromPrisma(key);
  }
  const prismaRaw = await readSettingsRawFromPrisma(key);
  if (prismaRaw !== null) return prismaRaw;
  return readSettingsRawFromMongo(key);
};

const writeSettingsRawByProviderPriority = async (
  key: string,
  raw: string
): Promise<boolean> => {
  const provider = await Promise.resolve(getAppDbProvider()).catch(() => null);
  if (provider === 'mongodb') {
    const mongoOk = await writeSettingsRawToMongo(key, raw);
    if (mongoOk) return true;
    return writeSettingsRawToPrisma(key, raw);
  }
  const prismaOk = await writeSettingsRawToPrisma(key, raw);
  if (prismaOk) return true;
  return writeSettingsRawToMongo(key, raw);
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

const parsePortablePathAuditSinkStartupHealthStateEnvelope = (
  raw: string | null
): PortablePathAuditSinkStartupHealthState => {
  if (typeof raw !== 'string' || raw.trim().length === 0) {
    return createDefaultPortablePathAuditSinkStartupHealthState();
  }
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return createDefaultPortablePathAuditSinkStartupHealthState();
    }
    const envelope = parsed as Partial<PortablePathAuditSinkStartupHealthStateEnvelope> & {
      state?: unknown;
    };
    if (!envelope.state || typeof envelope.state !== 'object' || Array.isArray(envelope.state)) {
      return createDefaultPortablePathAuditSinkStartupHealthState();
    }
    const state = envelope.state as Record<string, unknown>;
    return {
      consecutiveFailureCount:
        typeof state['consecutiveFailureCount'] === 'number' &&
        Number.isFinite(state['consecutiveFailureCount'])
          ? Math.max(0, Math.floor(state['consecutiveFailureCount']))
          : 0,
      lastFailureAt:
        typeof state['lastFailureAt'] === 'string' && state['lastFailureAt'].trim().length > 0
          ? state['lastFailureAt']
          : null,
      lastRecoveredAt:
        typeof state['lastRecoveredAt'] === 'string' && state['lastRecoveredAt'].trim().length > 0
          ? state['lastRecoveredAt']
          : null,
      lastFailedSinkIds: Array.isArray(state['lastFailedSinkIds'])
        ? state['lastFailedSinkIds'].filter((item): item is string => typeof item === 'string')
        : [],
      remediationCount:
        typeof state['remediationCount'] === 'number' && Number.isFinite(state['remediationCount'])
          ? Math.max(0, Math.floor(state['remediationCount']))
          : 0,
      lastRemediatedAt:
        typeof state['lastRemediatedAt'] === 'string' && state['lastRemediatedAt'].trim().length > 0
          ? state['lastRemediatedAt']
          : null,
      remediationWindowStartedAt:
        typeof state['remediationWindowStartedAt'] === 'string' &&
        state['remediationWindowStartedAt'].trim().length > 0
          ? state['remediationWindowStartedAt']
          : null,
      remediationWindowActionCount:
        typeof state['remediationWindowActionCount'] === 'number' &&
        Number.isFinite(state['remediationWindowActionCount'])
          ? Math.max(0, Math.floor(state['remediationWindowActionCount']))
          : 0,
      lastRemediationSkippedAt:
        typeof state['lastRemediationSkippedAt'] === 'string' &&
        state['lastRemediationSkippedAt'].trim().length > 0
          ? state['lastRemediationSkippedAt']
          : null,
      lastRemediationSkippedReason:
        state['lastRemediationSkippedReason'] === 'cooldown' ||
        state['lastRemediationSkippedReason'] === 'rate_limited'
          ? state['lastRemediationSkippedReason']
          : null,
      lastStatus:
        state['lastStatus'] === 'healthy' ||
        state['lastStatus'] === 'degraded' ||
        state['lastStatus'] === 'failed' ||
        state['lastStatus'] === 'skipped'
          ? state['lastStatus']
          : null,
    };
  } catch {
    return createDefaultPortablePathAuditSinkStartupHealthState();
  }
};

const stringifyPortablePathAuditSinkStartupHealthStateEnvelope = (
  state: PortablePathAuditSinkStartupHealthState
): string | null => {
  try {
    const envelope: PortablePathAuditSinkStartupHealthStateEnvelope = {
      version: 1,
      updatedAt: new Date().toISOString(),
      state,
    };
    return JSON.stringify(envelope);
  } catch {
    return null;
  }
};

export type LoadPortablePathAuditSinkStartupHealthStateOptions = {
  readRaw?: () => Promise<string | null>;
};

export const loadPortablePathAuditSinkStartupHealthState = async (
  options: LoadPortablePathAuditSinkStartupHealthStateOptions = {}
): Promise<PortablePathAuditSinkStartupHealthState> => {
  const readRaw =
    options.readRaw ??
    (async (): Promise<string | null> =>
      readSettingsRawByProviderPriority(PORTABLE_PATH_AUDIT_SINK_STARTUP_HEALTH_STATE_SETTINGS_KEY));
  const raw = await readRaw();
  return parsePortablePathAuditSinkStartupHealthStateEnvelope(raw);
};

export type SavePortablePathAuditSinkStartupHealthStateOptions = {
  writeRaw?: (raw: string) => Promise<boolean>;
};

export const savePortablePathAuditSinkStartupHealthState = async (
  state: PortablePathAuditSinkStartupHealthState,
  options: SavePortablePathAuditSinkStartupHealthStateOptions = {}
): Promise<boolean> => {
  const serialized = stringifyPortablePathAuditSinkStartupHealthStateEnvelope(state);
  if (!serialized) return false;
  const writeRaw =
    options.writeRaw ??
    (async (raw: string): Promise<boolean> =>
      writeSettingsRawByProviderPriority(
        PORTABLE_PATH_AUDIT_SINK_STARTUP_HEALTH_STATE_SETTINGS_KEY,
        raw
      ));
  return writeRaw(serialized);
};

export type {
  EnqueuePortablePathAuditSinkAutoRemediationDeadLetterOptions,
  LoadPortablePathAuditSinkAutoRemediationDeadLettersOptions,
  SavePortablePathAuditSinkAutoRemediationDeadLettersOptions,
  PortablePathAuditSinkAutoRemediationNotificationChannel,
  PortablePathAuditSinkAutoRemediationNotificationDeadLetterEntry,
  PortablePathAuditSinkAutoRemediationNotificationDeadLetterSignature,
};

export const loadPortablePathAuditSinkAutoRemediationDeadLetters = async (
  options: LoadPortablePathAuditSinkAutoRemediationDeadLettersOptions = {}
): Promise<PortablePathAuditSinkAutoRemediationNotificationDeadLetterEntry[]> => {
  const maxEntries = resolvePortablePathAuditSinkAutoRemediationDeadLetterMaxEntries(
    options.maxEntries
  );
  const readRaw =
    options.readRaw ??
    (async (): Promise<string | null> =>
      readSettingsRawByProviderPriority(
        PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_DEAD_LETTER_SETTINGS_KEY
      ));
  return loadPortablePathAuditSinkAutoRemediationDeadLettersCore({
    maxEntries,
    readRaw,
  });
};

export const savePortablePathAuditSinkAutoRemediationDeadLetters = async (
  entries: PortablePathAuditSinkAutoRemediationNotificationDeadLetterEntry[],
  options: SavePortablePathAuditSinkAutoRemediationDeadLettersOptions = {}
): Promise<boolean> => {
  const maxEntries = resolvePortablePathAuditSinkAutoRemediationDeadLetterMaxEntries(
    options.maxEntries
  );
  const writeRaw =
    options.writeRaw ??
    (async (raw: string): Promise<boolean> =>
      writeSettingsRawByProviderPriority(
        PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_DEAD_LETTER_SETTINGS_KEY,
        raw
      ));
  return savePortablePathAuditSinkAutoRemediationDeadLettersCore(entries, {
    maxEntries,
    writeRaw,
  });
};

export const enqueuePortablePathAuditSinkAutoRemediationDeadLetter = async (
  entry: PortablePathAuditSinkAutoRemediationNotificationDeadLetterEntry,
  options: EnqueuePortablePathAuditSinkAutoRemediationDeadLetterOptions = {}
): Promise<boolean> => {
  const maxEntries = resolvePortablePathAuditSinkAutoRemediationDeadLetterMaxEntries(
    options.maxEntries
  );
  const readRaw =
    options.readRaw ??
    (async (): Promise<string | null> =>
      readSettingsRawByProviderPriority(
        PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_DEAD_LETTER_SETTINGS_KEY
      ));
  const writeRaw =
    options.writeRaw ??
    (async (raw: string): Promise<boolean> =>
      writeSettingsRawByProviderPriority(
        PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_DEAD_LETTER_SETTINGS_KEY,
        raw
      ));
  return enqueuePortablePathAuditSinkAutoRemediationDeadLetterCore(entry, {
    maxEntries,
    readRaw,
    writeRaw,
  });
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

export type {
  NotifyPortablePathAuditSinkAutoRemediationOptions,
  PortablePathAuditSinkAutoRemediationAction,
  PortablePathAuditSinkAutoRemediationNotificationChannelResult,
  PortablePathAuditSinkAutoRemediationNotificationInput,
  PortablePathAuditSinkAutoRemediationNotificationReceipt,
  PortablePathAuditSinkAutoRemediationNotificationResult,
};

export type PortablePathAuditSinkAutoRemediationThrottleReason =
  | 'cooldown'
  | 'rate_limited'
  | null;

export type PortablePathAuditSinkAutoRemediationResult = {
  enabled: boolean;
  threshold: number;
  strategy: PortablePathAuditSinkAutoRemediationStrategy;
  cooldownSeconds: number;
  rateLimitWindowSeconds: number;
  rateLimitMaxActions: number;
  throttled: boolean;
  throttleReason: PortablePathAuditSinkAutoRemediationThrottleReason;
  triggered: boolean;
  action: PortablePathAuditSinkAutoRemediationAction;
  notification: PortablePathAuditSinkAutoRemediationNotificationResult | null;
  state: PortablePathAuditSinkStartupHealthState;
};

export type RunPortablePathAuditSinkAutoRemediationOptions = {
  enabled?: boolean;
  threshold?: number;
  strategy?: PortablePathAuditSinkAutoRemediationStrategy;
  cooldownSeconds?: number;
  rateLimitWindowSeconds?: number;
  rateLimitMaxActions?: number;
  unregisterAll?: () => void;
  activateLogOnlyMode?: () => void;
  notify?: (
    input: PortablePathAuditSinkAutoRemediationNotificationInput
  ) => Promise<PortablePathAuditSinkAutoRemediationNotificationResult>;
  now?: string | Date;
  writeLog?: (input: SystemLogInput) => Promise<void>;
  loadState?: () => Promise<PortablePathAuditSinkStartupHealthState>;
  saveState?: (state: PortablePathAuditSinkStartupHealthState) => Promise<boolean>;
};

const NOTIFY_PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_DEPS: NotifyPortablePathAuditSinkAutoRemediationDeps =
  {
    resolveTimeoutMs: resolvePortablePathAuditSinkAutoRemediationNotificationTimeoutMs,
    defaultFetch: fetch,
    defaultWriteLog: logSystemEvent,
    toErrorMessage,
    logSource: PORTABLE_PATH_ENVELOPE_VERIFICATION_AUDIT_SINK_BOOTSTRAP_SOURCE,
    logService: PORTABLE_PATH_ENVELOPE_VERIFICATION_DEFAULT_SERVICE,
    logCategory: PORTABLE_PATH_ENVELOPE_VERIFICATION_AUDIT_SINK_HEALTH_CATEGORY,
    logKind: PORTABLE_PATH_ENVELOPE_VERIFICATION_AUDIT_SINK_HEALTH_KIND,
  };

export const notifyPortablePathAuditSinkAutoRemediation = async (
  input: PortablePathAuditSinkAutoRemediationNotificationInput,
  options: NotifyPortablePathAuditSinkAutoRemediationOptions = {}
): Promise<PortablePathAuditSinkAutoRemediationNotificationResult> => {
  const deadLetterMaxEntries = resolvePortablePathAuditSinkAutoRemediationDeadLetterMaxEntries(
    options.deadLetterMaxEntries
  );
  const enqueueDeadLetter =
    options.enqueueDeadLetter ??
    (async (
      entry: PortablePathAuditSinkAutoRemediationNotificationDeadLetterEntry
    ): Promise<boolean> =>
      enqueuePortablePathAuditSinkAutoRemediationDeadLetter(entry, {
        maxEntries: deadLetterMaxEntries,
        readRaw: options.deadLetterReadRaw,
        writeRaw: options.deadLetterWriteRaw,
      }));
  return notifyPortablePathAuditSinkAutoRemediationCore(
    input,
    {
      ...options,
      enqueueDeadLetter,
    },
    NOTIFY_PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_DEPS
  );
};

export type {
  PortablePathAuditSinkAutoRemediationDeadLetterReplayAttempt,
  PortablePathAuditSinkAutoRemediationDeadLetterReplayResult,
  ReplayPortablePathAuditSinkAutoRemediationDeadLettersOptions,
};

const REPLAY_PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_DEAD_LETTERS_DEPS: ReplayPortablePathAuditSinkAutoRemediationDeadLettersDeps =
  {
    resolveReplayLimit: resolvePortablePathAuditSinkAutoRemediationDeadLetterReplayLimit,
    resolveReplayWindowSeconds:
      resolvePortablePathAuditSinkAutoRemediationDeadLetterReplayWindowSeconds,
    resolveTimeoutMs: resolvePortablePathAuditSinkAutoRemediationNotificationTimeoutMs,
    resolveMaxEntries: resolvePortablePathAuditSinkAutoRemediationDeadLetterMaxEntries,
    normalizeEndpoint: normalizePortablePathAuditSinkAutoRemediationEndpoint,
    normalizeEndpointAllowlist:
      normalizePortablePathAuditSinkAutoRemediationEndpointAllowlist,
    loadDeadLetters: ({ maxEntries, readRaw }) =>
      loadPortablePathAuditSinkAutoRemediationDeadLetters({ maxEntries, readRaw }),
    saveDeadLetters: (entries, { maxEntries, writeRaw }) =>
      savePortablePathAuditSinkAutoRemediationDeadLetters(entries, { maxEntries, writeRaw }),
    defaultWriteLog: logSystemEvent,
    toErrorMessage,
    logSource: PORTABLE_PATH_ENVELOPE_VERIFICATION_AUDIT_SINK_BOOTSTRAP_SOURCE,
    logService: PORTABLE_PATH_ENVELOPE_VERIFICATION_DEFAULT_SERVICE,
    logCategory: PORTABLE_PATH_ENVELOPE_VERIFICATION_AUDIT_SINK_HEALTH_CATEGORY,
    logKind: PORTABLE_PATH_ENVELOPE_VERIFICATION_AUDIT_SINK_HEALTH_KIND,
  };

export const replayPortablePathAuditSinkAutoRemediationDeadLetters = async (
  options: ReplayPortablePathAuditSinkAutoRemediationDeadLettersOptions = {}
): Promise<PortablePathAuditSinkAutoRemediationDeadLetterReplayResult> =>
  replayPortablePathAuditSinkAutoRemediationDeadLettersCore(
    options,
    REPLAY_PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_DEAD_LETTERS_DEPS
  );
const toEpochMs = (value: string | null | undefined): number | null => {
  if (typeof value !== 'string' || value.trim().length === 0) return null;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? null : parsed;
};
