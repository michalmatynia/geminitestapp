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
