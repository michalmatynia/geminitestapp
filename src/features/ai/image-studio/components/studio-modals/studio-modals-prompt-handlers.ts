import type { Toast } from '@/shared/contracts/ui';
import { api } from '@/shared/lib/api-client';


import {
  buildHeuristicControls,
  type PromptDiffLine,
  type PromptExtractApiResponse,
  type PromptExtractHistoryEntry,
  type PromptExtractValidationIssue,
  type UiExtractorSuggestion,
} from './prompt-extract-utils';
import { isParamUiControl, type ParamUiControl } from '../../utils/param-ui';
import { flattenParams, inferParamSpecs, type ParamSpec } from '../../utils/prompt-params';

import type { Dispatch, SetStateAction } from 'react';

type StudioPromptExtractionSettings = {
  promptExtraction: {
    mode: string;
    applyAutofix: boolean;
    autoApplyFormattedPrompt: boolean;
    showValidationSummary: boolean;
  };
  uiExtractor: {
    mode: 'heuristic' | 'ai' | 'both';
  };
};

type PromptExtractionHandlersDeps = {
  extractDraftPrompt: string;
  previewControls: Record<string, ParamUiControl>;
  previewParams: Record<string, unknown> | null;
  previewSpecs: Record<string, ParamSpec> | null;
  setExtractBusy: (value: 'none' | 'programmatic' | 'smart' | 'ai' | 'ui') => void;
  setExtractDraftPrompt: (prompt: string) => void;
  setExtractError: (value: string | null) => void;
  setExtractHistory: Dispatch<SetStateAction<PromptExtractHistoryEntry[]>>;
  setExtractPreviewUiOverrides: (value: Record<string, ParamUiControl>) => void;
  setExtractReviewOpen: (open: boolean) => void;
  setParamSpecs: (specs: Record<string, ParamSpec> | null) => void;
  setParamUiOverrides: (overrides: Record<string, ParamUiControl>) => void;
  setParamsState: (params: Record<string, unknown>) => void;
  setPreviewControls: (value: Record<string, ParamUiControl>) => void;
  setPreviewParams: (value: Record<string, unknown> | null) => void;
  setPreviewSpecs: (value: Record<string, ParamSpec> | null) => void;
  setPreviewValidation: (value: {
    before: PromptExtractValidationIssue[];
    after: PromptExtractValidationIssue[];
  } | null) => void;
  setPromptText: (prompt: string) => void;
  setSelectedExtractHistoryId: (value: string | null) => void;
  studioSettings: StudioPromptExtractionSettings;
  toast: Toast;
};

export type PromptExtractionHandlers = {
  handleProgrammaticExtraction: () => Promise<void>;
  handleSmartExtraction: () => Promise<void>;
  handleAiExtraction: () => Promise<void>;
  handleSuggestUiControls: () => Promise<void>;
  handleApplyExtraction: () => void;
};

export const createPromptExtractionHandlers = (
  deps: PromptExtractionHandlersDeps
): PromptExtractionHandlers => {
  const appendExtractHistoryEntry = (
    entry: Omit<PromptExtractHistoryEntry, 'id' | 'createdAt'>
  ): void => {
    const nextId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    deps.setExtractHistory((prev: PromptExtractHistoryEntry[]) => {
      const next: PromptExtractHistoryEntry[] = [
        {
          id: nextId,
          createdAt: Date.now(),
          ...entry,
        },
        ...prev,
      ];
      return next.slice(0, 25);
    });
    deps.setSelectedExtractHistoryId(nextId);
  };

  const handleProgrammaticExtraction = async (): Promise<void> => {
    const promptBefore = deps.extractDraftPrompt;
    deps.setExtractBusy('programmatic');
    deps.setExtractError(null);
    try {
      const result = await api.post<PromptExtractApiResponse>('/api/image-studio/prompt-extract', {
        prompt: promptBefore,
        mode: 'programmatic',
        applyAutofix: deps.studioSettings.promptExtraction.applyAutofix,
      });
      if (!result.params || typeof result.params !== 'object') {
        throw new Error('Invalid extraction response.');
      }
      const promptAfter = result.formattedPrompt ?? promptBefore;
      if (
        deps.studioSettings.promptExtraction.autoApplyFormattedPrompt &&
        promptAfter !== promptBefore
      ) {
        deps.setExtractDraftPrompt(promptAfter);
      }

      const specs = inferParamSpecs(result.params, JSON.stringify(result.params, null, 2));
      const heuristic = buildHeuristicControls(result.params, specs);
      deps.setPreviewParams(result.params);
      deps.setPreviewSpecs(specs);
      deps.setPreviewControls(heuristic);
      deps.setExtractPreviewUiOverrides(heuristic);
      const before = Array.isArray(result.validation?.before) ? result.validation?.before : [];
      const after = Array.isArray(result.validation?.after) ? result.validation?.after : [];
      deps.setPreviewValidation({ before, after });
      appendExtractHistoryEntry({
        runKind: 'programmatic',
        source: result.source ?? null,
        modeRequested: result.modeRequested ?? 'programmatic',
        fallbackUsed: Boolean(result.fallbackUsed),
        autofixApplied:
          Boolean(result.diagnostics?.autofixApplied) ||
          result.source === 'programmatic_autofix',
        promptBefore,
        promptAfter,
        validationBeforeCount: before.length,
        validationAfterCount: after.length,
      });
      const validationSuffix = deps.studioSettings.promptExtraction.showValidationSummary
        ? ` Validation: ${before.length} -> ${after.length}.`
        : '';
      deps.toast(`Programmatic extraction completed.${validationSuffix}`, { variant: 'success' });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Programmatic extraction failed';
      deps.setExtractError(message);
      deps.toast(message, { variant: 'error' });
    } finally {
      deps.setExtractBusy('none');
    }
  };

  const handleSmartExtraction = async (): Promise<void> => {
    const promptBefore = deps.extractDraftPrompt;
    deps.setExtractBusy('smart');
    deps.setExtractError(null);
    try {
      const result = await api.post<PromptExtractApiResponse>('/api/image-studio/prompt-extract', {
        prompt: promptBefore,
        mode: deps.studioSettings.promptExtraction.mode,
        applyAutofix: deps.studioSettings.promptExtraction.applyAutofix,
      });
      if (!result.params || typeof result.params !== 'object') {
        throw new Error('Invalid extraction response.');
      }
      const promptAfter = result.formattedPrompt ?? promptBefore;

      if (
        deps.studioSettings.promptExtraction.autoApplyFormattedPrompt &&
        promptAfter !== promptBefore
      ) {
        deps.setExtractDraftPrompt(promptAfter);
      }

      const specs = inferParamSpecs(result.params, JSON.stringify(result.params, null, 2));
      const heuristic = buildHeuristicControls(result.params, specs);
      deps.setPreviewParams(result.params);
      deps.setPreviewSpecs(specs);
      deps.setPreviewControls(heuristic);
      deps.setExtractPreviewUiOverrides(heuristic);
      const before = Array.isArray(result.validation?.before) ? result.validation?.before : [];
      const after = Array.isArray(result.validation?.after) ? result.validation?.after : [];
      deps.setPreviewValidation({ before, after });
      appendExtractHistoryEntry({
        runKind: 'smart',
        source: result.source ?? null,
        modeRequested: result.modeRequested ?? (deps.studioSettings.promptExtraction.mode as string),
        fallbackUsed: Boolean(result.fallbackUsed),
        autofixApplied:
          Boolean(result.diagnostics?.autofixApplied) ||
          result.source === 'programmatic_autofix',
        promptBefore,
        promptAfter,
        validationBeforeCount: before.length,
        validationAfterCount: after.length,
      });

      const sourceLabel =
        result.source === 'gpt'
          ? 'AI'
          : result.source === 'programmatic_autofix'
            ? 'Programmatic + Autofix'
            : 'Programmatic';
      const fallbackSuffix = result.fallbackUsed ? ' (fallback used)' : '';
      const beforeCount = before.length;
      const afterCount = after.length;
      const validationSuffix = deps.studioSettings.promptExtraction.showValidationSummary
        ? ` Validation: ${beforeCount} -> ${afterCount}.`
        : '';
      deps.toast(
        `Smart extraction completed via ${sourceLabel}${fallbackSuffix}.${validationSuffix}`,
        { variant: 'success' }
      );
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Smart extraction failed';
      deps.setExtractError(message);
      deps.toast(message, { variant: 'error' });
    } finally {
      deps.setExtractBusy('none');
    }
  };

  const handleAiExtraction = async (): Promise<void> => {
    const promptBefore = deps.extractDraftPrompt;
    deps.setExtractBusy('ai');
    deps.setExtractError(null);
    try {
      const result = await api.post<PromptExtractApiResponse>('/api/image-studio/prompt-extract', {
        prompt: promptBefore,
        mode: 'gpt',
        applyAutofix: deps.studioSettings.promptExtraction.applyAutofix,
      });
      if (!result.params || typeof result.params !== 'object') {
        throw new Error('Invalid extraction response.');
      }
      const promptAfter = result.formattedPrompt ?? promptBefore;
      if (
        deps.studioSettings.promptExtraction.autoApplyFormattedPrompt &&
        promptAfter !== promptBefore
      ) {
        deps.setExtractDraftPrompt(promptAfter);
      }
      const specs = inferParamSpecs(result.params, JSON.stringify(result.params, null, 2));
      const heuristic = buildHeuristicControls(result.params, specs);
      deps.setPreviewParams(result.params);
      deps.setPreviewSpecs(specs);
      deps.setPreviewControls(heuristic);
      deps.setExtractPreviewUiOverrides(heuristic);
      const before = Array.isArray(result.validation?.before) ? result.validation?.before : [];
      const after = Array.isArray(result.validation?.after) ? result.validation?.after : [];
      deps.setPreviewValidation({ before, after });
      appendExtractHistoryEntry({
        runKind: 'ai',
        source: result.source ?? null,
        modeRequested: result.modeRequested ?? 'gpt',
        fallbackUsed: Boolean(result.fallbackUsed),
        autofixApplied:
          Boolean(result.diagnostics?.autofixApplied) ||
          result.source === 'programmatic_autofix',
        promptBefore,
        promptAfter,
        validationBeforeCount: before.length,
        validationAfterCount: after.length,
      });
      const sourceLabel = result.source === 'gpt' ? 'AI' : 'Programmatic fallback';
      const fallbackSuffix = result.fallbackUsed ? ' (fallback used)' : '';
      const validationSuffix = deps.studioSettings.promptExtraction.showValidationSummary
        ? ` Validation: ${before.length} -> ${after.length}.`
        : '';
      deps.toast(`${sourceLabel} extraction completed${fallbackSuffix}.${validationSuffix}`, {
        variant: 'success',
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'AI extraction failed';
      deps.setExtractError(message);
      deps.toast(message, { variant: 'error' });
    } finally {
      deps.setExtractBusy('none');
    }
  };

  const handleSuggestUiControls = async (): Promise<void> => {
    if (!deps.previewParams) {
      deps.toast('Extract params first.', { variant: 'info' });
      return;
    }
    deps.setExtractBusy('ui');
    deps.setExtractError(null);
    try {
      const mode = deps.studioSettings.uiExtractor.mode;
      const heuristic = buildHeuristicControls(deps.previewParams, deps.previewSpecs);
      let aiSuggestions: UiExtractorSuggestion[] = [];

      if (mode === 'ai' || mode === 'both') {
        const flattened = flattenParams(deps.previewParams).filter((leaf) => Boolean(leaf.path));
        const response = await api.post<{ suggestions?: Array<{ path?: string; control?: string }> }>(
          '/api/image-studio/ui-extractor',
          {
            prompt: deps.extractDraftPrompt,
            params: flattened.map((leaf) => ({
              path: leaf.path,
              value: leaf.value,
              spec: deps.previewSpecs?.[leaf.path] ?? null,
            })),
            mode,
          }
        );
        aiSuggestions = (response.suggestions ?? [])
          .filter((item): item is { path: string; control: string } => Boolean(item?.path && item?.control))
          .map((item) => ({ path: item.path, control: item.control as ParamUiControl }))
          .filter((item) => isParamUiControl(item.control));
      }

      const nextControls: Record<string, ParamUiControl> = {};
      if (mode === 'heuristic' || mode === 'both') {
        Object.assign(nextControls, heuristic);
      }
      aiSuggestions.forEach((item) => {
        nextControls[item.path] = item.control;
      });
      deps.setPreviewControls(nextControls);
      deps.setExtractPreviewUiOverrides(nextControls);
      deps.toast('UI selector suggestions updated.', { variant: 'success' });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to suggest UI controls';
      deps.setExtractError(message);
      deps.toast(message, { variant: 'error' });
    } finally {
      deps.setExtractBusy('none');
    }
  };

  const handleApplyExtraction = (): void => {
    if (!deps.previewParams) {
      deps.toast('Extract params first.', { variant: 'info' });
      return;
    }
    deps.setPromptText(deps.extractDraftPrompt);
    deps.setParamsState(deps.previewParams);
    deps.setParamSpecs(deps.previewSpecs);
    deps.setParamUiOverrides(deps.previewControls);
    deps.setExtractPreviewUiOverrides(deps.previewControls);
    deps.setExtractReviewOpen(false);
    deps.toast('Prompt params applied.', { variant: 'success' });
  };

  return {
    handleProgrammaticExtraction,
    handleSmartExtraction,
    handleAiExtraction,
    handleSuggestUiControls,
    handleApplyExtraction,
  };
};

export const copyCardIdToClipboard = async (
  cardId: string,
  toast: Toast
): Promise<void> => {
  const normalizedCardId = cardId.trim();
  if (!normalizedCardId) return;
  if (typeof navigator === 'undefined' || !navigator.clipboard?.writeText) {
    toast('Clipboard is unavailable in this browser.', { variant: 'error' });
    return;
  }
  try {
    await navigator.clipboard.writeText(normalizedCardId);
    toast('Card ID copied to clipboard.', { variant: 'success' });
  } catch {
    toast('Failed to copy Card ID.', { variant: 'error' });
  }
};

export const toPromptDiffLines = (
  lines: PromptDiffLine[]
): PromptDiffLine[] => lines;
