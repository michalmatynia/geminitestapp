import 'server-only';

export type PortablePathAuditSinkAutoRemediationNotificationChannel = 'webhook' | 'email';

const PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_SIGNATURE_ALGORITHM = 'hmac_sha256' as const;

export type PortablePathAuditSinkAutoRemediationNotificationDeadLetterSignature = {
  algorithm: typeof PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_SIGNATURE_ALGORITHM;
  keyId: string | null;
  timestamp: string;
};

export type PortablePathAuditSinkAutoRemediationNotificationDeadLetterEntry = {
  queuedAt: string;
  channel: PortablePathAuditSinkAutoRemediationNotificationChannel;
  endpoint: string | null;
  payload: Record<string, unknown>;
  error: string;
  statusCode: number | null;
  attemptCount: number;
  signature: PortablePathAuditSinkAutoRemediationNotificationDeadLetterSignature | null;
};

export type LoadPortablePathAuditSinkAutoRemediationDeadLettersOptions = {
  maxEntries?: number;
  readRaw?: () => Promise<string | null>;
};

export type SavePortablePathAuditSinkAutoRemediationDeadLettersOptions = {
  maxEntries?: number;
  writeRaw?: (raw: string) => Promise<boolean>;
};

export type EnqueuePortablePathAuditSinkAutoRemediationDeadLetterOptions = {
  maxEntries?: number;
  readRaw?: () => Promise<string | null>;
  writeRaw?: (raw: string) => Promise<boolean>;
};

type PortablePathAuditSinkAutoRemediationDeadLetterEnvelope = {
  version: 1;
  updatedAt: string;
  entries: PortablePathAuditSinkAutoRemediationNotificationDeadLetterEntry[];
};

const normalizePortablePathAuditSinkAutoRemediationDeadLetterEntry = (
  value: unknown
): PortablePathAuditSinkAutoRemediationNotificationDeadLetterEntry | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const payload = record['payload'];
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return null;

  const signatureRecord =
    record['signature'] && typeof record['signature'] === 'object' && !Array.isArray(record['signature'])
      ? (record['signature'] as Record<string, unknown>)
      : null;
  const signatureTimestamp =
    signatureRecord &&
    typeof signatureRecord['timestamp'] === 'string' &&
    signatureRecord['timestamp'].trim().length > 0
      ? signatureRecord['timestamp'].trim()
      : null;
  const signature: PortablePathAuditSinkAutoRemediationNotificationDeadLetterSignature | null =
    signatureTimestamp
      ? {
        algorithm: PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_SIGNATURE_ALGORITHM,
        keyId:
          signatureRecord &&
          typeof signatureRecord['keyId'] === 'string' &&
          signatureRecord['keyId'].trim().length > 0
            ? signatureRecord['keyId'].trim()
            : null,
        timestamp: signatureTimestamp,
      }
      : null;

  const rawStatusCode = record['statusCode'];
  const statusCodeNumeric =
    typeof rawStatusCode === 'number' ? rawStatusCode : Number(rawStatusCode);
  const statusCode =
    Number.isFinite(statusCodeNumeric) && statusCodeNumeric >= 100 && statusCodeNumeric <= 599
      ? Math.floor(statusCodeNumeric)
      : null;

  const rawAttemptCount = record['attemptCount'];
  const attemptCountNumeric =
    typeof rawAttemptCount === 'number' ? rawAttemptCount : Number(rawAttemptCount);
  const attemptCount =
    Number.isFinite(attemptCountNumeric) && attemptCountNumeric > 0
      ? Math.floor(attemptCountNumeric)
      : 1;

  return {
    queuedAt:
      typeof record['queuedAt'] === 'string' && record['queuedAt'].trim().length > 0
        ? record['queuedAt'].trim()
        : new Date().toISOString(),
    channel: record['channel'] === 'email' ? 'email' : 'webhook',
    endpoint:
      typeof record['endpoint'] === 'string' && record['endpoint'].trim().length > 0
        ? record['endpoint'].trim()
        : null,
    payload: payload as Record<string, unknown>,
    error:
      typeof record['error'] === 'string' && record['error'].trim().length > 0
        ? record['error'].trim()
        : 'notification_failed',
    statusCode,
    attemptCount,
    signature,
  };
};

const normalizePortablePathAuditSinkAutoRemediationDeadLetterEntries = (
  entries: unknown[],
  maxEntries: number
): PortablePathAuditSinkAutoRemediationNotificationDeadLetterEntry[] =>
  entries
    .map((entry) => normalizePortablePathAuditSinkAutoRemediationDeadLetterEntry(entry))
    .filter(
      (
        entry
      ): entry is PortablePathAuditSinkAutoRemediationNotificationDeadLetterEntry =>
        entry !== null
    )
    .slice(-maxEntries);

const parsePortablePathAuditSinkAutoRemediationDeadLetterEnvelope = (
  raw: string | null,
  maxEntries: number
): PortablePathAuditSinkAutoRemediationNotificationDeadLetterEntry[] => {
  if (!raw || raw.trim().length === 0) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed)) {
      return normalizePortablePathAuditSinkAutoRemediationDeadLetterEntries(parsed, maxEntries);
    }
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return [];
    const envelope = parsed as Partial<PortablePathAuditSinkAutoRemediationDeadLetterEnvelope> & {
      entries?: unknown;
    };
    if (!Array.isArray(envelope.entries)) return [];
    return normalizePortablePathAuditSinkAutoRemediationDeadLetterEntries(
      envelope.entries,
      maxEntries
    );
  } catch {
    return [];
  }
};

const stringifyPortablePathAuditSinkAutoRemediationDeadLetterEnvelope = (
  entries: PortablePathAuditSinkAutoRemediationNotificationDeadLetterEntry[],
  maxEntries: number
): string | null => {
  try {
    const envelope: PortablePathAuditSinkAutoRemediationDeadLetterEnvelope = {
      version: 1,
      updatedAt: new Date().toISOString(),
      entries: normalizePortablePathAuditSinkAutoRemediationDeadLetterEntries(entries, maxEntries),
    };
    return JSON.stringify(envelope);
  } catch {
    return null;
  }
};

export const loadPortablePathAuditSinkAutoRemediationDeadLettersCore = async (options: {
  maxEntries: number;
  readRaw: () => Promise<string | null>;
}): Promise<PortablePathAuditSinkAutoRemediationNotificationDeadLetterEntry[]> => {
  return parsePortablePathAuditSinkAutoRemediationDeadLetterEnvelope(
    await options.readRaw(),
    options.maxEntries
  );
};

export const savePortablePathAuditSinkAutoRemediationDeadLettersCore = async (
  entries: PortablePathAuditSinkAutoRemediationNotificationDeadLetterEntry[],
  options: {
    maxEntries: number;
    writeRaw: (raw: string) => Promise<boolean>;
  }
): Promise<boolean> => {
  const serialized = stringifyPortablePathAuditSinkAutoRemediationDeadLetterEnvelope(
    entries,
    options.maxEntries
  );
  if (!serialized) return false;
  return options.writeRaw(serialized);
};

export const enqueuePortablePathAuditSinkAutoRemediationDeadLetterCore = async (
  entry: PortablePathAuditSinkAutoRemediationNotificationDeadLetterEntry,
  options: {
    maxEntries: number;
    readRaw: () => Promise<string | null>;
    writeRaw: (raw: string) => Promise<boolean>;
  }
): Promise<boolean> => {
  const existing = parsePortablePathAuditSinkAutoRemediationDeadLetterEnvelope(
    await options.readRaw(),
    options.maxEntries
  );
  const serialized = stringifyPortablePathAuditSinkAutoRemediationDeadLetterEnvelope(
    [...existing, entry],
    options.maxEntries
  );
  if (!serialized) return false;
  return options.writeRaw(serialized);
};
