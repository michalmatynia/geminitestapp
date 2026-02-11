'use client';

import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

import { extractParamsFromPrompt, inferParamSpecs, validateImageStudioParams, setDeepValue, type ParamIssue, type ParamSpec, type ExtractParamsResult } from '@/features/prompt-engine/prompt-params';
import { useToast } from '@/shared/ui';

import { type ParamUiControl } from '../utils/param-ui';

// ── Types ────────────────────────────────────────────────────────────────────

export interface PromptState {
  promptText: string;
  paramsState: Record<string, unknown> | null;
  paramSpecs: Record<string, ParamSpec> | null;
  paramUiOverrides: Record<string, ParamUiControl>;
  paramFlipMap: Record<string, boolean>;
  issuesByPath: Record<string, ParamIssue[]>;
  extractReviewOpen: boolean;
  extractDraftPrompt: string;
  extractPreviewUiOverrides: Record<string, ParamUiControl>;
  extractResult: ExtractParamsResult | null;
}

export interface PromptActions {
  setPromptText: (t: string) => void;
  setParamsState: React.Dispatch<React.SetStateAction<Record<string, unknown> | null>>;
  setParamSpecs: React.Dispatch<React.SetStateAction<Record<string, ParamSpec> | null>>;
  setParamUiOverrides: React.Dispatch<React.SetStateAction<Record<string, ParamUiControl>>>;
  onParamChange: (path: string, value: unknown) => void;
  onParamFlip: (path: string) => void;
  onParamUiControlChange: (path: string, control: ParamUiControl) => void;
  setExtractReviewOpen: (o: boolean) => void;
  setExtractDraftPrompt: (s: string) => void;
  setExtractPreviewUiOverrides: React.Dispatch<React.SetStateAction<Record<string, ParamUiControl>>>;
  applyProgrammaticExtraction: (sourcePrompt: string, options?: { toast?: boolean }) => ExtractParamsResult;
}

// ── Contexts ─────────────────────────────────────────────────────────────────

const PromptStateContext = createContext<PromptState | null>(null);
const PromptActionsContext = createContext<PromptActions | null>(null);

// ── Provider ─────────────────────────────────────────────────────────────────

export function PromptProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const { toast } = useToast();

  const [promptText, setPromptText] = useState<string>('');
  const [paramsState, setParamsState] = useState<Record<string, unknown> | null>(null);
  const [paramSpecs, setParamSpecs] = useState<Record<string, ParamSpec> | null>(null);
  const [paramUiOverrides, setParamUiOverrides] = useState<Record<string, ParamUiControl>>({});
  const [paramFlipMap, setParamFlipMap] = useState<Record<string, boolean>>({});

  const [extractReviewOpen, setExtractReviewOpen] = useState<boolean>(false);
  const [extractDraftPrompt, setExtractDraftPrompt] = useState<string>('');
  const [extractPreviewUiOverrides, setExtractPreviewUiOverrides] = useState<Record<string, ParamUiControl>>({});
  const [extractResult, setExtractResult] = useState<ExtractParamsResult | null>(null);

  const handleParamChange = useCallback((path: string, value: unknown) => {
    setParamsState(prev => prev ? setDeepValue(prev, path, value) : null);
  }, []);

  const handleParamUiControlChange = useCallback((path: string, nextControl: ParamUiControl) => {
    setParamUiOverrides(prev => {
      if (nextControl === 'auto') {
        const { [path]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [path]: nextControl };
    });
  }, []);

  const handleParamFlip = useCallback((path: string) => {
    setParamFlipMap(prev => ({ ...prev, [path]: !prev[path] }));
  }, []);

  const validationIssues = useMemo(() => {
    if (!paramsState || !paramSpecs) return [];
    return validateImageStudioParams(paramsState, paramSpecs);
  }, [paramsState, paramSpecs]);

  const issuesByPath = useMemo(() => {
    const map: Record<string, ParamIssue[]> = {};
    validationIssues.forEach(i => { map[i.path] ??= []; map[i.path]!.push(i); });
    return map;
  }, [validationIssues]);

  const applyProgrammaticExtraction = useCallback((sourcePrompt: string, options?: { toast?: boolean }) => {
    const result = extractParamsFromPrompt(sourcePrompt);
    setExtractResult(result);
    if (!result.ok) {
      setParamsState(null);
      setParamSpecs(null);
      if (options?.toast !== false) toast(String(result.error), { variant: 'error' });
      return result;
    }
    setParamsState(result.params);
    setParamSpecs(inferParamSpecs(result.params, result.rawObjectText));
    if (options?.toast !== false) toast('Params extracted.', { variant: 'success' });
    return result;
  }, [toast]);

  const state = useMemo<PromptState>(
    () => ({
      promptText, paramsState, paramSpecs, paramUiOverrides, paramFlipMap, issuesByPath,
      extractReviewOpen, extractDraftPrompt, extractPreviewUiOverrides, extractResult,
    }),
    [promptText, paramsState, paramSpecs, paramUiOverrides, paramFlipMap, issuesByPath, extractReviewOpen, extractDraftPrompt, extractPreviewUiOverrides, extractResult]
  );

  const actions = useMemo<PromptActions>(
    () => ({
      setPromptText, setParamsState, setParamSpecs, setParamUiOverrides,
      onParamChange: handleParamChange, onParamFlip: handleParamFlip, onParamUiControlChange: handleParamUiControlChange,
      setExtractReviewOpen, setExtractDraftPrompt, setExtractPreviewUiOverrides,
      applyProgrammaticExtraction,
    }),
    [handleParamChange, handleParamFlip, handleParamUiControlChange, applyProgrammaticExtraction]
  );

  return (
    <PromptActionsContext.Provider value={actions}>
      <PromptStateContext.Provider value={state}>
        {children}
      </PromptStateContext.Provider>
    </PromptActionsContext.Provider>
  );
}

// ── Hooks ────────────────────────────────────────────────────────────────────

export function usePromptState(): PromptState {
  const ctx = useContext(PromptStateContext);
  if (!ctx) throw new Error('usePromptState must be used within a PromptProvider');
  return ctx;
}

export function usePromptActions(): PromptActions {
  const ctx = useContext(PromptActionsContext);
  if (!ctx) throw new Error('usePromptActions must be used within a PromptProvider');
  return ctx;
}

export function usePrompt(): PromptState & PromptActions {
  return { ...usePromptState(), ...usePromptActions() };
}
