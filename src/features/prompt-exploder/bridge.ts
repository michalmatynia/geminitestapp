export const PROMPT_EXPLODER_DRAFT_PROMPT_KEY = 'prompt_exploder:draft_prompt';
export const PROMPT_EXPLODER_APPLY_TO_STUDIO_KEY = 'prompt_exploder:apply_to_studio_prompt';

export type PromptExploderBridgeSource = 'image-studio' | 'prompt-exploder' | 'case-resolver';
export type PromptExploderBridgeTarget = 'prompt-exploder' | 'image-studio' | 'case-resolver';

export type PromptExploderCaseResolverContext = {
  fileId: string;
  fileName: string;
};

export type PromptExploderBridgePayload = {
  prompt: string;
  source: PromptExploderBridgeSource;
  target?: PromptExploderBridgeTarget;
  caseResolverContext?: PromptExploderCaseResolverContext;
  createdAt: string;
};

const hasWindow = (): boolean => typeof window !== 'undefined';

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
        : new Date().toISOString();
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

    return {
      prompt: parsed.prompt,
      source,
      target,
      caseResolverContext,
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
  context?: PromptExploderCaseResolverContext | null
): void {
  saveApplyPayload({
    prompt,
    source: 'prompt-exploder',
    target: 'case-resolver',
    caseResolverContext: context ?? undefined,
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
