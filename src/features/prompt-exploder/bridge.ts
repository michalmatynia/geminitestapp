import type {
  PromptExploderBridgePayloadDto as PromptExploderBridgePayload,
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

const hasWindow = (): boolean => typeof window !== 'undefined';
type BridgeStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

const QUOTA_ERROR_NAMES = new Set(['QuotaExceededError', 'NS_ERROR_DOM_QUOTA_REACHED']);
const PROMPT_COMPACT_LENGTHS = [200_000, 100_000, 50_000, 20_000, 8_000] as const;
const PROMPT_EXPLODER_PAYLOAD_TTL_MS = 15 * 60 * 1000;
const FALLBACK_CREATED_AT = '1970-01-01T00:00:00.000Z';

const isQuotaExceededError = (error: unknown): boolean => {
  if (!error || typeof error !== 'object') return false;
  const record = error as { name?: unknown; code?: unknown };
  if (typeof record.name === 'string' && QUOTA_ERROR_NAMES.has(record.name)) return true;
  return record.code === 22 || record.code === 1014;
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

const readBridgePayload = (storageKey: string): PromptExploderBridgePayload | null => {
  const storages = getBridgeStorages();
  for (const storage of storages) {
    const parsed = parseBridgePayload(storage.getItem(storageKey));
    if (!parsed) continue;
    const createdAtMs = Date.parse(parsed.createdAt);
    const isExpired =
      !Number.isFinite(createdAtMs) ||
      Date.now() - createdAtMs > PROMPT_EXPLODER_PAYLOAD_TTL_MS;
    if (!isExpired) return parsed;
    try {
      storage.removeItem(storageKey);
    } catch {
      // Ignore blocked storage cleanup.
    }
  }
  return null;
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

export function savePromptExploderDraftPrompt(prompt: string): void {
  saveDraftPayload({
    prompt,
    source: 'image-studio',
    target: 'prompt-exploder',
    createdAt: new Date().toISOString(),
  });
}

export function savePromptExploderDraftPromptFromCaseResolver(
  prompt: string,
  context: PromptExploderCaseResolverContext
): void {
  saveDraftPayload({
    prompt,
    source: 'case-resolver',
    target: 'prompt-exploder',
    caseResolverContext: context,
    createdAt: new Date().toISOString(),
  });
}

export function readPromptExploderDraftPayload(): PromptExploderBridgePayload | null {
  return readBridgePayload(PROMPT_EXPLODER_DRAFT_PROMPT_KEY);
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

export function savePromptExploderApplyPrompt(prompt: string): void {
  saveApplyPayload({
    prompt,
    source: 'prompt-exploder',
    target: 'image-studio',
    createdAt: new Date().toISOString(),
  });
}

export function savePromptExploderApplyPromptForCaseResolver(
  prompt: string,
  context?: PromptExploderCaseResolverContext | null,
  parties?: PromptExploderCaseResolverPartyBundle | null,
  metadata?: PromptExploderCaseResolverMetadata | null
): void {
  saveApplyPayload({
    prompt,
    source: 'prompt-exploder',
    target: 'case-resolver',
    caseResolverContext: context ?? undefined,
    caseResolverParties: parties ?? undefined,
    caseResolverMetadata: metadata ?? undefined,
    createdAt: new Date().toISOString(),
  });
}

export function readPromptExploderApplyPayload(): PromptExploderBridgePayload | null {
  return readBridgePayload(PROMPT_EXPLODER_APPLY_TO_STUDIO_KEY);
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

export function consumePromptExploderApplyPrompt(): string | null {
  return consumePromptExploderApplyPayload('image-studio')?.prompt ?? null;
}

export function consumePromptExploderApplyPromptForCaseResolver(): PromptExploderBridgePayload | null {
  return consumePromptExploderApplyPayload('case-resolver');
}
