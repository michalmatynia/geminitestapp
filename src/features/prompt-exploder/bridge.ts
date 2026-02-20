import type {
  PromptExploderBridgePayloadDto as PromptExploderBridgePayload,
  PromptExploderBridgePayloadStatusDto as PromptExploderBridgePayloadStatus,
  PromptExploderBridgeSourceDto as PromptExploderBridgeSource,
  PromptExploderBridgeTargetDto as PromptExploderBridgeTarget,
  PromptExploderCaseResolverContextDto as PromptExploderCaseResolverContext,
  PromptExploderCaseResolverMetadataDto as PromptExploderCaseResolverMetadata,
  PromptExploderCaseResolverPartyBundleDto as PromptExploderCaseResolverPartyBundle,
  PromptExploderCaseResolverPartyCandidateDto as PromptExploderCaseResolverPartyCandidate,
  PromptExploderCaseResolverPartyKindDto as PromptExploderCaseResolverPartyKind,
  PromptExploderCaseResolverPartyRoleDto as PromptExploderCaseResolverPartyRole,
  PromptExploderCaseResolverPlaceDateDto as PromptExploderCaseResolverPlaceDate,
} from '@/shared/contracts/prompt-exploder';

export const PROMPT_EXPLODER_DRAFT_PROMPT_KEY = 'prompt_exploder:draft_prompt';
export const PROMPT_EXPLODER_APPLY_TO_STUDIO_KEY = 'prompt_exploder:apply_to_studio_prompt';

export type {
  PromptExploderBridgePayload,
  PromptExploderBridgePayloadStatus,
  PromptExploderBridgeSource,
  PromptExploderBridgeTarget,
  PromptExploderCaseResolverContext,
  PromptExploderCaseResolverMetadata,
  PromptExploderCaseResolverPartyBundle,
  PromptExploderCaseResolverPartyCandidate,
  PromptExploderCaseResolverPartyKind,
  PromptExploderCaseResolverPartyRole,
  PromptExploderCaseResolverPlaceDate,
};

export type PromptExploderBridgePayloadSnapshot = {
  payload: PromptExploderBridgePayload | null;
  isExpired: boolean;
  expiresAt: string | null;
};

const hasWindow = (): boolean => typeof window !== 'undefined';
type BridgeStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

const QUOTA_ERROR_NAMES = new Set(['QuotaExceededError', 'NS_ERROR_DOM_QUOTA_REACHED']);
const PROMPT_COMPACT_LENGTHS = [200_000, 100_000, 50_000, 20_000, 8_000] as const;
const PROMPT_EXPLODER_PAYLOAD_TTL_MS = 15 * 60 * 1000;
const FALLBACK_CREATED_AT = '1970-01-01T00:00:00.000Z';
const BRIDGE_PAYLOAD_VERSION = 2;
const BRIDGE_PAYLOAD_STATUSES: PromptExploderBridgePayloadStatus[] = [
  'pending',
  'applied',
  'dismissed',
  'failed',
];

const isQuotaExceededError = (error: unknown): boolean => {
  if (!error || typeof error !== 'object') return false;
  const record = error as { name?: unknown; code?: unknown };
  if (typeof record.name === 'string' && QUOTA_ERROR_NAMES.has(record.name)) return true;
  return record.code === 22 || record.code === 1014;
};

const toIsoTimestamp = (value: string | null | undefined): string | null => {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  if (!normalized) return null;
  const parsedMs = Date.parse(normalized);
  if (!Number.isFinite(parsedMs)) return null;
  return new Date(parsedMs).toISOString();
};

const createBridgeTransferId = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `pe-transfer-${crypto.randomUUID()}`;
  }
  return `pe-transfer-${Math.random().toString(36).slice(2, 11)}-${Date.now().toString(36)}`;
};

const hashString32 = (value: string, seed: number): number => {
  let hash = seed >>> 0;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
};

export const computePromptExploderBridgeChecksum = (
  prompt: string,
  context?: PromptExploderCaseResolverContext | null
): string => {
  const source = [
    prompt,
    context?.fileId ?? '',
    context?.fileName ?? '',
    context?.sessionId ?? '',
    typeof context?.documentVersionAtStart === 'number'
      ? String(context.documentVersionAtStart)
      : '',
  ].join('|');
  const partA = hashString32(source, 0x811c9dc5);
  const partB = hashString32(source.split('').reverse().join(''), 0x9e3779b1);
  return `pe-${partA.toString(16).padStart(8, '0')}${partB.toString(16).padStart(8, '0')}`;
};

type PromptExploderBridgeSaveOptions = {
  transferId?: string | null | undefined;
  createdAt?: string | null | undefined;
  expiresAt?: string | null | undefined;
  payloadVersion?: number | null | undefined;
  checksum?: string | null | undefined;
  status?: PromptExploderBridgePayloadStatus | null | undefined;
  appliedAt?: string | null | undefined;
};

const resolvePayloadCreatedAt = (options?: PromptExploderBridgeSaveOptions): string => {
  const normalized = toIsoTimestamp(options?.createdAt ?? null);
  return normalized ?? new Date().toISOString();
};

const resolvePayloadExpiresAt = (
  createdAtIso: string,
  options?: PromptExploderBridgeSaveOptions
): string => {
  const explicit = toIsoTimestamp(options?.expiresAt ?? null);
  if (explicit) return explicit;
  const createdAtMs = Date.parse(createdAtIso);
  if (!Number.isFinite(createdAtMs)) {
    return new Date(Date.now() + PROMPT_EXPLODER_PAYLOAD_TTL_MS).toISOString();
  }
  return new Date(createdAtMs + PROMPT_EXPLODER_PAYLOAD_TTL_MS).toISOString();
};

const resolvePayloadVersion = (options?: PromptExploderBridgeSaveOptions): number => {
  const candidate = options?.payloadVersion;
  if (typeof candidate === 'number' && Number.isFinite(candidate) && candidate > 0) {
    return Math.trunc(candidate);
  }
  return BRIDGE_PAYLOAD_VERSION;
};

const resolvePayloadStatus = (options?: PromptExploderBridgeSaveOptions): PromptExploderBridgePayloadStatus => {
  const candidate = options?.status;
  if (candidate && BRIDGE_PAYLOAD_STATUSES.includes(candidate)) return candidate;
  return 'pending';
};

const resolvePayloadAppliedAt = (options?: PromptExploderBridgeSaveOptions): string | undefined => {
  const normalized = toIsoTimestamp(options?.appliedAt ?? null);
  return normalized ?? undefined;
};

const resolvePayloadTransferId = (options?: PromptExploderBridgeSaveOptions): string => {
  const candidate =
    typeof options?.transferId === 'string'
      ? options.transferId.trim()
      : '';
  if (candidate.length > 0) return candidate;
  return createBridgeTransferId();
};

const getBridgeStorages = (): BridgeStorage[] => {
  if (!hasWindow()) return [];
  const storages: BridgeStorage[] = [];
  try {
    if (window.localStorage) storages.push(window.localStorage);
  } catch {
    // Ignore blocked localStorage.
  }
  try {
    if (window.sessionStorage) storages.push(window.sessionStorage);
  } catch {
    // Ignore blocked sessionStorage.
  }
  return storages;
};

const toTrimmedString = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');
const toTrimmedStringList = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  const out = new Set<string>();
  value.forEach((entry: unknown) => {
    const normalized = toTrimmedString(entry);
    if (!normalized) return;
    out.add(normalized);
  });
  return [...out];
};
const toNonNegativeInt = (value: unknown): number | undefined => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    const normalized = Math.trunc(value);
    return normalized >= 0 ? normalized : undefined;
  }
  if (typeof value === 'string') {
    const normalized = value.trim();
    if (!normalized) return undefined;
    const parsed = Number.parseInt(normalized, 10);
    if (!Number.isFinite(parsed) || String(parsed) !== normalized) return undefined;
    return parsed >= 0 ? parsed : undefined;
  }
  return undefined;
};

const sanitizeCaseResolverPartyCandidate = (
  value: unknown,
  role: PromptExploderCaseResolverPartyRole
): PromptExploderCaseResolverPartyCandidate | undefined => {
  if (!value || typeof value !== 'object') return undefined;
  const record = value as Record<string, unknown>;
  const displayName = toTrimmedString(record['displayName']);
  const rawText = toTrimmedString(record['rawText']);
  if (!displayName && !rawText) return undefined;
  const kindRaw = toTrimmedString(record['kind']);
  const kind: PromptExploderCaseResolverPartyKind | undefined =
    kindRaw === 'person' || kindRaw === 'organization' ? kindRaw : undefined;

  return {
    role,
    displayName: displayName || rawText,
    rawText: rawText || displayName,
    kind,
    firstName: toTrimmedString(record['firstName']) || undefined,
    middleName: toTrimmedString(record['middleName']) || undefined,
    lastName: toTrimmedString(record['lastName']) || undefined,
    organizationName: toTrimmedString(record['organizationName']) || undefined,
    street: toTrimmedString(record['street']) || undefined,
    streetNumber: toTrimmedString(record['streetNumber']) || undefined,
    houseNumber: toTrimmedString(record['houseNumber']) || undefined,
    city: toTrimmedString(record['city']) || undefined,
    postalCode: toTrimmedString(record['postalCode']) || undefined,
    country: toTrimmedString(record['country']) || undefined,
    sourceSegmentId: toTrimmedString(record['sourceSegmentId']) || undefined,
    sourceSegmentTitle: toTrimmedString(record['sourceSegmentTitle']) || undefined,
    sourcePatternLabels: toTrimmedStringList(record['sourcePatternLabels']),
    sourceSequenceLabels: toTrimmedStringList(record['sourceSequenceLabels']),
  };
};

const sanitizeCaseResolverPlaceDate = (
  value: unknown
): PromptExploderCaseResolverPlaceDate | undefined => {
  if (!value || typeof value !== 'object') return undefined;
  const record = value as Record<string, unknown>;
  const city = toTrimmedString(record['city']) || undefined;
  const day = toTrimmedString(record['day']) || undefined;
  const month = toTrimmedString(record['month']) || undefined;
  const year = toTrimmedString(record['year']) || undefined;
  const sourceSegmentId = toTrimmedString(record['sourceSegmentId']) || undefined;
  const sourceSegmentTitle = toTrimmedString(record['sourceSegmentTitle']) || undefined;
  const sourcePatternLabels = toTrimmedStringList(record['sourcePatternLabels']);
  const sourceSequenceLabels = toTrimmedStringList(record['sourceSequenceLabels']);

  if (!city && !day && !month && !year) return undefined;
  return {
    city,
    day,
    month,
    year,
    sourceSegmentId,
    sourceSegmentTitle,
    sourcePatternLabels,
    sourceSequenceLabels,
  };
};

const parseBridgePayload = (raw: string | null): PromptExploderBridgePayload | null => {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<PromptExploderBridgePayload>;
    if (typeof parsed.prompt !== 'string') return null;
    const source: PromptExploderBridgeSource =
      parsed.source === 'image-studio' ||
      parsed.source === 'prompt-exploder' ||
      parsed.source === 'case-resolver'
        ? parsed.source
        : 'image-studio';
    const target: PromptExploderBridgeTarget | undefined =
      parsed.target === 'prompt-exploder' ||
      parsed.target === 'image-studio' ||
      parsed.target === 'case-resolver'
        ? parsed.target
        : undefined;
    const createdAt =
      typeof parsed.createdAt === 'string' && parsed.createdAt.trim().length > 0
        ? parsed.createdAt
        : FALLBACK_CREATED_AT;
    const transferId = toTrimmedString(parsed.transferId) || createBridgeTransferId();
    const payloadVersion = (() => {
      const candidate = toNonNegativeInt(parsed.payloadVersion);
      if (typeof candidate !== 'number') return 1;
      return candidate > 0 ? candidate : 1;
    })();
    const expiresAt = toIsoTimestamp(
      typeof parsed.expiresAt === 'string' ? parsed.expiresAt : null
    ) ?? undefined;
    const statusRaw = toTrimmedString(parsed.status);
    const status: PromptExploderBridgePayloadStatus = BRIDGE_PAYLOAD_STATUSES.includes(
      statusRaw as PromptExploderBridgePayloadStatus
    )
      ? (statusRaw as PromptExploderBridgePayloadStatus)
      : 'pending';
    const appliedAt = toIsoTimestamp(
      typeof parsed.appliedAt === 'string' ? parsed.appliedAt : null
    ) ?? undefined;
    const checksum = toTrimmedString(parsed.checksum) || undefined;
    const caseResolverContext = (() => {
      if (!parsed.caseResolverContext || typeof parsed.caseResolverContext !== 'object') return undefined;
      const record = parsed.caseResolverContext as Record<string, unknown>;
      const fileId = typeof record['fileId'] === 'string' ? record['fileId'].trim() : '';
      const fileName = typeof record['fileName'] === 'string' ? record['fileName'].trim() : '';
      const sessionId = toTrimmedString(record['sessionId']) || undefined;
      const documentVersionAtStart = toNonNegativeInt(record['documentVersionAtStart']);
      if (!fileId) return undefined;
      return {
        fileId,
        fileName: fileName || fileId,
        sessionId,
        documentVersionAtStart,
      };
    })();
    const caseResolverParties = (() => {
      if (!parsed.caseResolverParties || typeof parsed.caseResolverParties !== 'object') return undefined;
      const record = parsed.caseResolverParties as Record<string, unknown>;
      const addresser = sanitizeCaseResolverPartyCandidate(record['addresser'], 'addresser');
      const addressee = sanitizeCaseResolverPartyCandidate(record['addressee'], 'addressee');
      if (!addresser && !addressee) return undefined;
      return {
        ...(addresser ? { addresser } : {}),
        ...(addressee ? { addressee } : {}),
      };
    })();
    const caseResolverMetadata = (() => {
      if (!parsed.caseResolverMetadata || typeof parsed.caseResolverMetadata !== 'object') return undefined;
      const record = parsed.caseResolverMetadata as Record<string, unknown>;
      const placeDate = sanitizeCaseResolverPlaceDate(record['placeDate']);
      if (!placeDate) return undefined;
      return {
        placeDate,
      };
    })();

    return {
      prompt: parsed.prompt,
      source,
      target,
      caseResolverContext,
      caseResolverParties,
      caseResolverMetadata,
      createdAt,
      expiresAt,
      payloadVersion,
      transferId,
      checksum,
      status,
      appliedAt,
    };
  } catch {
    return null;
  }
};

const trimPrompt = (prompt: string, maxLength: number): string =>
  prompt.length <= maxLength ? prompt : prompt.slice(0, maxLength);

const compactPayloadVariants = (payload: PromptExploderBridgePayload): PromptExploderBridgePayload[] => {
  const variants: PromptExploderBridgePayload[] = [payload];
  PROMPT_COMPACT_LENGTHS.forEach((maxLength) => {
    variants.push({
      ...payload,
      prompt: trimPrompt(payload.prompt, maxLength),
    });
  });
  variants.push({
    ...payload,
    prompt: trimPrompt(payload.prompt, 8_000),
    caseResolverParties: undefined,
    caseResolverMetadata: undefined,
  });
  return variants;
};

const writeBridgePayload = (storageKey: string, payload: PromptExploderBridgePayload): void => {
  if (!hasWindow()) return;
  const storages = getBridgeStorages();
  if (storages.length === 0) return;

  const variants = compactPayloadVariants(payload);
  let lastError: unknown = null;

  for (const variant of variants) {
    const serialized = JSON.stringify(variant);
    for (const storage of storages) {
      try {
        storage.setItem(storageKey, serialized);
        return;
      } catch (error: unknown) {
        lastError = error;
        if (!isQuotaExceededError(error)) {
          continue;
        }
      }
    }
  }

  if (lastError) {
    // Drop stale payloads when persistence fails so old cross-app transfers
    // cannot be replayed against the wrong document context.
    clearBridgePayload(storageKey);
    // Swallow storage failures to keep UI flows non-blocking.
    return;
  }
};

const resolveBridgePayloadExpiryState = (payload: PromptExploderBridgePayload): {
  isExpired: boolean;
  expiresAt: string | null;
} => {
  const expiresAtMs = Date.parse(payload.expiresAt ?? '');
  const createdAtMs = Date.parse(payload.createdAt);
  const resolvedExpiresAtMs = Number.isFinite(expiresAtMs)
    ? expiresAtMs
    : (
      Number.isFinite(createdAtMs)
        ? createdAtMs + PROMPT_EXPLODER_PAYLOAD_TTL_MS
        : Number.NaN
    );
  const isExpired =
    !Number.isFinite(resolvedExpiresAtMs) ||
    Date.now() > resolvedExpiresAtMs;
  return {
    isExpired,
    expiresAt: Number.isFinite(resolvedExpiresAtMs)
      ? new Date(resolvedExpiresAtMs).toISOString()
      : null,
  };
};

const readBridgePayloadRaw = (storageKey: string): PromptExploderBridgePayload | null => {
  const storages = getBridgeStorages();
  for (const storage of storages) {
    const parsed = parseBridgePayload(storage.getItem(storageKey));
    if (!parsed) continue;
    return parsed;
  }
  return null;
};

const readBridgePayload = (storageKey: string): PromptExploderBridgePayload | null => {
  const storages = getBridgeStorages();
  for (const storage of storages) {
    const parsed = parseBridgePayload(storage.getItem(storageKey));
    if (!parsed) continue;
    const expiryState = resolveBridgePayloadExpiryState(parsed);
    if (!expiryState.isExpired) return parsed;
    try {
      storage.removeItem(storageKey);
    } catch {
      // Ignore blocked storage cleanup.
    }
  }
  return null;
};

const readBridgePayloadSnapshot = (storageKey: string): PromptExploderBridgePayloadSnapshot => {
  const payload = readBridgePayloadRaw(storageKey);
  if (!payload) {
    return {
      payload: null,
      isExpired: false,
      expiresAt: null,
    };
  }
  const expiryState = resolveBridgePayloadExpiryState(payload);
  return {
    payload,
    isExpired: expiryState.isExpired,
    expiresAt: expiryState.expiresAt,
  };
};

const clearBridgePayload = (storageKey: string): void => {
  getBridgeStorages().forEach((storage) => {
    storage.removeItem(storageKey);
  });
};

const shouldConsumeForTarget = (
  payload: PromptExploderBridgePayload,
  target: PromptExploderBridgeTarget
): boolean => {
  if (!payload.target) {
    return target === 'prompt-exploder' || target === 'image-studio';
  }
  return payload.target === target;
};

const saveDraftPayload = (payload: PromptExploderBridgePayload): void => {
  writeBridgePayload(PROMPT_EXPLODER_DRAFT_PROMPT_KEY, payload);
};

const saveApplyPayload = (payload: PromptExploderBridgePayload): void => {
  writeBridgePayload(PROMPT_EXPLODER_APPLY_TO_STUDIO_KEY, payload);
};

const buildBridgePayload = (input: {
  prompt: string;
  source: PromptExploderBridgeSource;
  target: PromptExploderBridgeTarget;
  caseResolverContext?: PromptExploderCaseResolverContext | null | undefined;
  caseResolverParties?: PromptExploderCaseResolverPartyBundle | null | undefined;
  caseResolverMetadata?: PromptExploderCaseResolverMetadata | null | undefined;
  options?: PromptExploderBridgeSaveOptions;
}): PromptExploderBridgePayload => {
  const createdAt = resolvePayloadCreatedAt(input.options);
  const expiresAt = resolvePayloadExpiresAt(createdAt, input.options);
  const transferId = resolvePayloadTransferId(input.options);
  const payloadVersion = resolvePayloadVersion(input.options);
  const status = resolvePayloadStatus(input.options);
  const appliedAt = resolvePayloadAppliedAt(input.options);
  const checksum = (() => {
    const candidate =
      typeof input.options?.checksum === 'string'
        ? input.options.checksum.trim()
        : '';
    if (candidate.length > 0) return candidate;
    return computePromptExploderBridgeChecksum(input.prompt, input.caseResolverContext ?? null);
  })();
  return {
    prompt: input.prompt,
    source: input.source,
    target: input.target,
    caseResolverContext: input.caseResolverContext ?? undefined,
    caseResolverParties: input.caseResolverParties ?? undefined,
    caseResolverMetadata: input.caseResolverMetadata ?? undefined,
    createdAt,
    expiresAt,
    payloadVersion,
    transferId,
    checksum,
    status,
    appliedAt,
  };
};

export function savePromptExploderDraftPrompt(prompt: string): void {
  saveDraftPayload(buildBridgePayload({
    prompt,
    source: 'image-studio',
    target: 'prompt-exploder',
  }));
}

export function savePromptExploderDraftPromptFromCaseResolver(
  prompt: string,
  context: PromptExploderCaseResolverContext,
  options?: PromptExploderBridgeSaveOptions
): void {
  saveDraftPayload(buildBridgePayload({
    prompt,
    source: 'case-resolver',
    target: 'prompt-exploder',
    caseResolverContext: context,
    options,
  }));
}

export function readPromptExploderDraftPayload(): PromptExploderBridgePayload | null {
  return readBridgePayload(PROMPT_EXPLODER_DRAFT_PROMPT_KEY);
}

export function readPromptExploderDraftPayloadSnapshot(): PromptExploderBridgePayloadSnapshot {
  return readBridgePayloadSnapshot(PROMPT_EXPLODER_DRAFT_PROMPT_KEY);
}

export function readPromptExploderDraftPrompt(): string | null {
  const payload = readPromptExploderDraftPayload();
  if (!payload || !shouldConsumeForTarget(payload, 'prompt-exploder')) return null;
  return payload.prompt;
}

export function consumePromptExploderDraftPayload(
  target: PromptExploderBridgeTarget = 'prompt-exploder'
): PromptExploderBridgePayload | null {
  if (!hasWindow()) return null;
  const payload = readPromptExploderDraftPayload();
  if (!payload || !shouldConsumeForTarget(payload, target)) return null;
  clearBridgePayload(PROMPT_EXPLODER_DRAFT_PROMPT_KEY);
  return payload;
}

export function consumePromptExploderDraftPrompt(): string | null {
  return consumePromptExploderDraftPayload('prompt-exploder')?.prompt ?? null;
}

export function savePromptExploderApplyPrompt(
  prompt: string,
  options?: PromptExploderBridgeSaveOptions
): void {
  saveApplyPayload(buildBridgePayload({
    prompt,
    source: 'prompt-exploder',
    target: 'image-studio',
    options,
  }));
}

export function savePromptExploderApplyPromptForCaseResolver(
  prompt: string,
  context?: PromptExploderCaseResolverContext | null,
  parties?: PromptExploderCaseResolverPartyBundle | null,
  metadata?: PromptExploderCaseResolverMetadata | null,
  options?: PromptExploderBridgeSaveOptions
): void {
  saveApplyPayload(buildBridgePayload({
    prompt,
    source: 'prompt-exploder',
    target: 'case-resolver',
    caseResolverContext: context ?? undefined,
    caseResolverParties: parties ?? undefined,
    caseResolverMetadata: metadata ?? undefined,
    options,
  }));
}

export function readPromptExploderApplyPayload(): PromptExploderBridgePayload | null {
  return readBridgePayload(PROMPT_EXPLODER_APPLY_TO_STUDIO_KEY);
}

export function readPromptExploderApplyPayloadSnapshot(): PromptExploderBridgePayloadSnapshot {
  return readBridgePayloadSnapshot(PROMPT_EXPLODER_APPLY_TO_STUDIO_KEY);
}

export function consumePromptExploderApplyPayload(
  target: PromptExploderBridgeTarget = 'image-studio'
): PromptExploderBridgePayload | null {
  if (!hasWindow()) return null;
  const payload = readPromptExploderApplyPayload();
  if (!payload || !shouldConsumeForTarget(payload, target)) return null;
  clearBridgePayload(PROMPT_EXPLODER_APPLY_TO_STUDIO_KEY);
  return payload;
}

export function clearPromptExploderApplyPayload(): void {
  clearBridgePayload(PROMPT_EXPLODER_APPLY_TO_STUDIO_KEY);
}

export function consumePromptExploderApplyPrompt(): string | null {
  return consumePromptExploderApplyPayload('image-studio')?.prompt ?? null;
}

export function consumePromptExploderApplyPromptForCaseResolver(): PromptExploderBridgePayload | null {
  return consumePromptExploderApplyPayload('case-resolver');
}
