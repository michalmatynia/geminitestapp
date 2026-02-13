export const PROMPT_EXPLODER_DRAFT_PROMPT_KEY = 'prompt_exploder:draft_prompt';
export const PROMPT_EXPLODER_APPLY_TO_STUDIO_KEY = 'prompt_exploder:apply_to_studio_prompt';

export type PromptExploderBridgePayload = {
  prompt: string;
  source: 'image-studio' | 'prompt-exploder';
  createdAt: string;
};

const hasWindow = (): boolean => typeof window !== 'undefined';

export function savePromptExploderDraftPrompt(prompt: string): void {
  if (!hasWindow()) return;
  const payload: PromptExploderBridgePayload = {
    prompt,
    source: 'image-studio',
    createdAt: new Date().toISOString(),
  };
  window.localStorage.setItem(PROMPT_EXPLODER_DRAFT_PROMPT_KEY, JSON.stringify(payload));
}

export function readPromptExploderDraftPrompt(): string | null {
  if (!hasWindow()) return null;
  const raw = window.localStorage.getItem(PROMPT_EXPLODER_DRAFT_PROMPT_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as PromptExploderBridgePayload;
    return typeof parsed.prompt === 'string' ? parsed.prompt : null;
  } catch {
    return null;
  }
}

export function consumePromptExploderDraftPrompt(): string | null {
  if (!hasWindow()) return null;
  const value = readPromptExploderDraftPrompt();
  window.localStorage.removeItem(PROMPT_EXPLODER_DRAFT_PROMPT_KEY);
  return value;
}

export function savePromptExploderApplyPrompt(prompt: string): void {
  if (!hasWindow()) return;
  const payload: PromptExploderBridgePayload = {
    prompt,
    source: 'prompt-exploder',
    createdAt: new Date().toISOString(),
  };
  window.localStorage.setItem(PROMPT_EXPLODER_APPLY_TO_STUDIO_KEY, JSON.stringify(payload));
}

export function consumePromptExploderApplyPrompt(): string | null {
  if (!hasWindow()) return null;
  const raw = window.localStorage.getItem(PROMPT_EXPLODER_APPLY_TO_STUDIO_KEY);
  if (!raw) return null;
  window.localStorage.removeItem(PROMPT_EXPLODER_APPLY_TO_STUDIO_KEY);
  try {
    const parsed = JSON.parse(raw) as PromptExploderBridgePayload;
    return typeof parsed.prompt === 'string' ? parsed.prompt : null;
  } catch {
    return null;
  }
}
