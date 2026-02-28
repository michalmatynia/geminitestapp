'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  extractParamsFromPrompt,
  inferParamSpecs,
  setDeepValue,
  type ParamIssue,
  type ParamSpec,
  type ExtractParamsResult,
} from '@/shared/utils/prompt-params';
import { validateImageStudioParams } from '@/shared/lib/prompt-engine';
import { consumePromptExploderApplyPrompt } from '@/features/prompt-exploder/bridge';
import { useSettingsMap } from '@/shared/hooks/use-settings';
import { useToast } from '@/shared/ui';

import { useProjectsState } from './ProjectsContext';
import { type ParamUiControl } from '@/features/ai/image-studio/utils/param-ui';
import {
  getImageStudioProjectSessionKey,
  resolveImageStudioProjectSession,
} from '@/features/ai/image-studio/utils/project-session';

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
  setExtractPreviewUiOverrides: React.Dispatch<
    React.SetStateAction<Record<string, ParamUiControl>>
  >;
  applyProgrammaticExtraction: (
    sourcePrompt: string,
    options?: { toast?: boolean }
  ) => ExtractParamsResult;
}

// ── Contexts ─────────────────────────────────────────────────────────────────

const PromptStateContext = createContext<PromptState | null>(null);
const PromptActionsContext = createContext<PromptActions | null>(null);

// ── Provider ─────────────────────────────────────────────────────────────────

export function PromptProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const { toast } = useToast();
  const { projectId } = useProjectsState();
  const heavySettings = useSettingsMap({ scope: 'heavy' });

  const [promptText, setPromptText] = useState<string>('');
  const [paramsState, setParamsState] = useState<Record<string, unknown> | null>(null);
  const [paramSpecs, setParamSpecs] = useState<Record<string, ParamSpec> | null>(null);
  const [paramUiOverrides, setParamUiOverrides] = useState<Record<string, ParamUiControl>>({});
  const [paramFlipMap, setParamFlipMap] = useState<Record<string, boolean>>({});

  const [extractReviewOpen, setExtractReviewOpen] = useState<boolean>(false);
  const [extractDraftPrompt, setExtractDraftPrompt] = useState<string>('');
  const [extractPreviewUiOverrides, setExtractPreviewUiOverrides] = useState<
    Record<string, ParamUiControl>
  >({});
  const [extractResult, setExtractResult] = useState<ExtractParamsResult | null>(null);
  const hydratedSessionSignatureRef = useRef<string | null>(null);

  const heavyMap = heavySettings.data ?? new Map<string, string>();
  const projectSessionKey = useMemo(() => getImageStudioProjectSessionKey(projectId), [projectId]);
  const projectSessionRaw = projectSessionKey ? heavyMap.get(projectSessionKey) : undefined;

  useEffect(() => {
    if (!projectId || !projectSessionKey || heavySettings.isLoading) return;
    const signature = `${projectSessionKey}:${projectSessionRaw ?? ''}`;
    if (hydratedSessionSignatureRef.current === signature) return;

    const session = resolveImageStudioProjectSession(projectSessionRaw, projectId);
    setPromptText(session?.promptText ?? '');
    setParamsState(session?.paramsState ?? null);
    setParamSpecs((session?.paramSpecs ?? null) as Record<string, ParamSpec> | null);
    setParamUiOverrides((session?.paramUiOverrides ?? {}) as Record<string, ParamUiControl>);
    setParamFlipMap({});
    setExtractReviewOpen(false);
    setExtractDraftPrompt('');
    setExtractPreviewUiOverrides({});
    setExtractResult(null);
    hydratedSessionSignatureRef.current = signature;
  }, [projectId, projectSessionKey, projectSessionRaw, heavySettings.isLoading]);

  useEffect(() => {
    const explodedPrompt = consumePromptExploderApplyPrompt();
    if (!explodedPrompt?.trim()) return;
    setPromptText(explodedPrompt);
  }, []);

  useEffect(() => {
    if (projectId) return;
    setPromptText('');
    setParamsState(null);
    setParamSpecs(null);
    setParamUiOverrides({});
    setParamFlipMap({});
    setExtractReviewOpen(false);
    setExtractDraftPrompt('');
    setExtractPreviewUiOverrides({});
    setExtractResult(null);
    hydratedSessionSignatureRef.current = null;
  }, [projectId]);

  const handleParamChange = useCallback((path: string, value: unknown) => {
    setParamsState((prev) => (prev ? setDeepValue(prev, path, value) : null));
  }, []);

  const handleParamUiControlChange = useCallback((path: string, nextControl: ParamUiControl) => {
    setParamUiOverrides((prev) => {
      if (nextControl === 'auto') {
        const { [path]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [path]: nextControl };
    });
  }, []);

  const handleParamFlip = useCallback((path: string) => {
    setParamFlipMap((prev) => ({ ...prev, [path]: !prev[path] }));
  }, []);

  const validationIssues = useMemo(() => {
    if (!paramsState || !paramSpecs) return [];
    return validateImageStudioParams(paramsState, paramSpecs);
  }, [paramsState, paramSpecs]);

  const issuesByPath = useMemo(() => {
    const map: Record<string, ParamIssue[]> = {};
    validationIssues.forEach((i) => {
      map[i.path] ??= [];
      map[i.path]!.push(i);
    });
    return map;
  }, [validationIssues]);

  const applyProgrammaticExtraction = useCallback(
    (sourcePrompt: string, options?: { toast?: boolean }) => {
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
    },
    [toast]
  );

  const state = useMemo<PromptState>(
    () => ({
      promptText,
      paramsState,
      paramSpecs,
      paramUiOverrides,
      paramFlipMap,
      issuesByPath,
      extractReviewOpen,
      extractDraftPrompt,
      extractPreviewUiOverrides,
      extractResult,
    }),
    [
      promptText,
      paramsState,
      paramSpecs,
      paramUiOverrides,
      paramFlipMap,
      issuesByPath,
      extractReviewOpen,
      extractDraftPrompt,
      extractPreviewUiOverrides,
      extractResult,
    ]
  );

  const actions = useMemo<PromptActions>(
    () => ({
      setPromptText,
      setParamsState,
      setParamSpecs,
      setParamUiOverrides,
      onParamChange: handleParamChange,
      onParamFlip: handleParamFlip,
      onParamUiControlChange: handleParamUiControlChange,
      setExtractReviewOpen,
      setExtractDraftPrompt,
      setExtractPreviewUiOverrides,
      applyProgrammaticExtraction,
    }),
    [handleParamChange, handleParamFlip, handleParamUiControlChange, applyProgrammaticExtraction]
  );

  return (
    <PromptActionsContext.Provider value={actions}>
      <PromptStateContext.Provider value={state}>{children}</PromptStateContext.Provider>
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
