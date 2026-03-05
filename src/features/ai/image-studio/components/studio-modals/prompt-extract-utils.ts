import {
  recommendParamUiControl,
  type ParamUiControl,
} from '@/features/ai/image-studio/utils/param-ui';
import { flattenParams } from '@/shared/utils/prompt-params';
import { type ParamSpec } from '@/shared/contracts/prompt-engine';

export type { ParamUiControl };

export type UiExtractorSuggestion = {
  path: string;
  control: ParamUiControl;
};

export type PromptExtractValidationIssue = {
  ruleId?: string;
  severity?: string;
  title?: string;
  message?: string;
  suggestions?: Array<{
    suggestion?: string;
    found?: string;
    comment?: string | null;
  }>;
};

export type PromptExtractApiResponse = {
  params?: Record<string, unknown>;
  source?: 'programmatic' | 'programmatic_autofix' | 'gpt';
  modeRequested?: 'programmatic' | 'gpt' | 'hybrid';
  fallbackUsed?: boolean;
  formattedPrompt?: string | null;
  validation?: {
    before?: PromptExtractValidationIssue[];
    after?: PromptExtractValidationIssue[];
  };
  diagnostics?: {
    programmaticError?: string | null;
    aiError?: string | null;
    model?: string | null;
    autofixApplied?: boolean;
  };
};

export type PromptExtractRunKind = 'programmatic' | 'smart' | 'ai';

export type PromptExtractHistoryEntry = {
  id: string;
  createdAt: number;
  runKind: PromptExtractRunKind;
  source: 'programmatic' | 'programmatic_autofix' | 'gpt' | null;
  modeRequested: 'programmatic' | 'gpt' | 'hybrid' | null;
  fallbackUsed: boolean;
  autofixApplied: boolean;
  promptBefore: string;
  promptAfter: string;
  validationBeforeCount: number;
  validationAfterCount: number;
};

export type PromptDiffLine = {
  before: string | null;
  after: string | null;
  changed: boolean;
};

export const getPromptSourceLabel = (source: PromptExtractHistoryEntry['source']): string => {
  if (source === 'programmatic_autofix') return 'Programmatic + Autofix';
  if (source === 'programmatic') return 'Programmatic';
  if (source === 'gpt') return 'AI';
  return 'Unknown';
};

export const getPromptRunKindLabel = (runKind: PromptExtractRunKind): string => {
  if (runKind === 'programmatic') return 'Programmatic Extract';
  if (runKind === 'ai') return 'AI Extract';
  return 'Smart Extract';
};

export const formatHistoryTime = (timestamp: number): string =>
  new Date(timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

export const buildPromptDiffLines = (
  beforePrompt: string,
  afterPrompt: string
): PromptDiffLine[] => {
  const beforeLines = beforePrompt.split(/\r?\n/);
  const afterLines = afterPrompt.split(/\r?\n/);
  const maxLines = Math.max(beforeLines.length, afterLines.length);
  const rows: PromptDiffLine[] = [];
  for (let index = 0; index < maxLines; index += 1) {
    const before = beforeLines[index] ?? null;
    const after = afterLines[index] ?? null;
    rows.push({
      before,
      after,
      changed: before !== after,
    });
  }
  return rows;
};

export function toSlotName(filename: string, index: number): string {
  const clean = filename.trim();
  if (!clean) return `Card ${index + 1}`;
  const dotIndex = clean.lastIndexOf('.');
  if (dotIndex <= 0) return clean;
  return clean.slice(0, dotIndex);
}

export function buildHeuristicControls(
  params: Record<string, unknown>,
  specs: Record<string, ParamSpec> | null
): Record<string, ParamUiControl> {
  const next: Record<string, ParamUiControl> = {};
  const leaves = flattenParams(params).filter((leaf) => Boolean(leaf.path));
  leaves.forEach((leaf) => {
    const spec = specs?.[leaf.path];
    const recommendation = recommendParamUiControl(leaf.value, spec);
    next[leaf.path] = recommendation.recommended;
  });

  return next;
}
