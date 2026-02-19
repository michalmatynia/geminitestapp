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
        : '1970-01-01T00:00:00.000Z';
    const caseResolverContext = (() => {
      if (!parsed.caseResolverContext || typeof parsed.caseResolverContext !== 'object') return undefined;
      const record = parsed.caseResolverContext as Record<string, unknown>;
      const fileId = typeof record['fileId'] === 'string' ? record['fileId'].trim() : '';
      const fileName = typeof record['fileName'] === 'string' ? record['fileName'].trim() : '';
      if (!fileId || !fileName) return undefined;
      return {
        fileId,
        fileName,
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
  if (!hasWindow()) return;
  window.localStorage.setItem(PROMPT_EXPLODER_DRAFT_PROMPT_KEY, JSON.stringify(payload));
};

const saveApplyPayload = (payload: PromptExploderBridgePayload): void => {
  if (!hasWindow()) return;
  window.localStorage.setItem(PROMPT_EXPLODER_APPLY_TO_STUDIO_KEY, JSON.stringify(payload));
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
  if (!hasWindow()) return null;
  return parseBridgePayload(window.localStorage.getItem(PROMPT_EXPLODER_DRAFT_PROMPT_KEY));
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
  window.localStorage.removeItem(PROMPT_EXPLODER_DRAFT_PROMPT_KEY);
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
  if (!hasWindow()) return null;
  return parseBridgePayload(window.localStorage.getItem(PROMPT_EXPLODER_APPLY_TO_STUDIO_KEY));
}

export function consumePromptExploderApplyPayload(
  target: PromptExploderBridgeTarget = 'image-studio'
): PromptExploderBridgePayload | null {
  if (!hasWindow()) return null;
  const payload = readPromptExploderApplyPayload();
  if (!payload || !shouldConsumeForTarget(payload, target)) return null;
  window.localStorage.removeItem(PROMPT_EXPLODER_APPLY_TO_STUDIO_KEY);
  return payload;
}

export function consumePromptExploderApplyPrompt(): string | null {
  return consumePromptExploderApplyPayload('image-studio')?.prompt ?? null;
}

export function consumePromptExploderApplyPromptForCaseResolver(): PromptExploderBridgePayload | null {
  return consumePromptExploderApplyPayload('case-resolver');
}
