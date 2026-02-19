'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import { recordPromptValidationCounter } from '@/features/prompt-core/runtime-observability';
import { useToast } from '@/shared/ui';
import { logClientError } from '@/shared/utils/observability/client-error-logger';

import {
  readPromptExploderDraftPayload,
  savePromptExploderApplyPrompt,
  savePromptExploderApplyPromptForCaseResolver,
  type PromptExploderBridgeSource,
  type PromptExploderCaseResolverContext,
} from '../bridge';
import {
  isPromptExploderOrchestratorEnabled,
  resolvePromptExploderOrchestratorRollout,
} from '../feature-flags';
import { promptExploderClampNumber } from '../helpers/formatting';
import {
  buildPromptExploderParamEntries,
  PromptExploderParamEntry,
  PromptExploderParamEntriesState,
} from '../params-editor';
import {
  ensureSegmentTitle,
  explodePromptText,
  reassemblePromptSegments,
  updatePromptExploderDocument,
} from '../parser';
import { explodePromptWithValidationRuntime } from '../prompt-validation-orchestrator';
import {
  leavePromptRuntimeScope,
  tryEnterPromptRuntimeScope,
} from '../runtime-load-shedder';
import {
  buildCaseResolverSegmentCaptureRules,
  resolveCaseResolverBridgePayloadForTransfer,
} from '../utils/case-resolver-extraction';
import { useSettingsState } from './hooks/useSettings';

import type {
  PromptExploderBinding,
  PromptExploderDocument,
  PromptExploderParamUiControl,
  PromptExploderSegment,
} from '../types';

// ── Types ────────────────────────────────────────────────────────────────────

export interface DocumentState {
  promptText: string;
  documentState: PromptExploderDocument | null;
  manualBindings: PromptExploderBinding[];
  selectedSegmentId: string | null;
  selectedSegment: PromptExploderSegment | null;
  selectedParamEntriesState: PromptExploderParamEntriesState | null;
  listParamOptions: Array<{ value: string; label: string }>;
  listParamEntryByPath: Map<string, PromptExploderParamEntry>;
  explosionMetrics: {
    total: number;
    avgConfidence: number;
    lowConfidenceThreshold: number;
    lowConfidenceCount: number;
    typedCoverage: number;
    typeCounts: Record<string, number>;
  } | null;
  segmentOptions: Array<{ value: string; label: string }>;
  segmentById: Map<string, PromptExploderSegment>;
  returnTarget: 'image-studio' | 'case-resolver';
}

export interface DocumentActions {
  setPromptText: (text: string) => void;
  setDocumentState: React.Dispatch<React.SetStateAction<PromptExploderDocument | null>>;
  setManualBindings: React.Dispatch<React.SetStateAction<PromptExploderBinding[]>>;
  setSelectedSegmentId: React.Dispatch<React.SetStateAction<string | null>>;
  handleExplode: () => void;
  syncManualBindings: (bindings: PromptExploderBinding[]) => void;
  replaceSegments: (segments: PromptExploderSegment[]) => void;
  updateSegment: (
    segmentId: string,
    updater: (current: PromptExploderSegment) => PromptExploderSegment
  ) => void;
  clearDocument: () => void;
  handleReloadFromStudio: () => void;
  handleApplyToImageStudio: () => Promise<void>;
  updateParameterValue: (segmentId: string, path: string, value: unknown) => void;
  updateParameterSelector: (segmentId: string, path: string, control: string) => void;
  updateParameterComment: (segmentId: string, path: string, comment: string | null) => void;
  updateParameterDescription: (segmentId: string, path: string, description: string | null) => void;
}

// ── Contexts ─────────────────────────────────────────────────────────────────

export const DocumentStateContext = createContext<DocumentState | null>(null);
export const DocumentActionsContext = createContext<DocumentActions | null>(null);

// ── Provider ─────────────────────────────────────────────────────────────────

export function DocumentProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = searchParams?.get('returnTo') || '/admin/image-studio';

  const {
    runtimeSelection,
    runtimeGuardrailIssue,
    promptExploderSettings,
  } = useSettingsState();

  const [promptText, setPromptText] = useState('');
  const [documentState, setDocumentState] = useState<PromptExploderDocument | null>(null);
  const [selectedSegmentId, setSelectedSegmentId] = useState<string | null>(null);
  const [manualBindings, setManualBindings] = useState<PromptExploderBinding[]>([]);
  const [incomingBridgeSource, setIncomingBridgeSource] = useState<PromptExploderBridgeSource | null>(null);
  const [incomingCaseResolverContext, setIncomingCaseResolverContext] =
    useState<PromptExploderCaseResolverContext | null>(null);
  const explodeInFlightRef = useRef(false);
  const lastExplosionRef = useRef<{
    signature: string;
    document: PromptExploderDocument;
  } | null>(null);

  const returnTarget = incomingBridgeSource === 'case-resolver' ? 'case-resolver' : 'image-studio';

  // ── Derived state ──────────────────────────────────────────────────────────

  const selectedSegment = useMemo(() => {
    if (!documentState || !selectedSegmentId) return null;
    return documentState.segments.find((segment: PromptExploderSegment) => segment.id === selectedSegmentId) ?? null;
  }, [documentState, selectedSegmentId]);

  const selectedParamEntriesState = useMemo<PromptExploderParamEntriesState | null>(() => {
    if (selectedSegment?.type !== 'parameter_block') return null;
    if (!selectedSegment.paramsObject) return null;
    return buildPromptExploderParamEntries({
      paramsObject: selectedSegment.paramsObject,
      paramsText: selectedSegment.paramsText || selectedSegment.text,
      paramUiControls: selectedSegment.paramUiControls ?? null,
      paramComments: selectedSegment.paramComments ?? null,
      paramDescriptions: selectedSegment.paramDescriptions ?? null,
    });
  }, [selectedSegment]);

  const listParamEntriesState = useMemo<PromptExploderParamEntriesState | null>(() => {
    if (!documentState) return null;
    const paramsSegment = documentState.segments.find(
      (segment: PromptExploderSegment) => segment.type === 'parameter_block' && Boolean(segment.paramsObject)
    );
    if (!paramsSegment?.paramsObject) return null;
    return buildPromptExploderParamEntries({
      paramsObject: paramsSegment.paramsObject,
      paramsText: paramsSegment.paramsText || paramsSegment.text,
      paramUiControls: paramsSegment.paramUiControls ?? null,
      paramComments: paramsSegment.paramComments ?? null,
      paramDescriptions: paramsSegment.paramDescriptions ?? null,
    });
  }, [documentState]);

  const listParamOptions = useMemo(
    () =>
      (listParamEntriesState?.entries ?? []).map((entry) => ({
        value: entry.path,
        label: entry.path,
      })),
    [listParamEntriesState]
  );

  const listParamEntryByPath = useMemo(() => {
    const map = new Map<string, PromptExploderParamEntry>();
    (listParamEntriesState?.entries ?? []).forEach((entry) => {
      map.set(entry.path, entry);
    });
    return map;
  }, [listParamEntriesState]);

  const explosionMetrics = useMemo(() => {
    if (!documentState) return null;
    const lowConfidenceThreshold = promptExploderClampNumber(
      promptExploderSettings.runtime.benchmarkLowConfidenceThreshold,
      0.3,
      0.9
    );
    const segments = documentState.segments;
    const total = segments.length;
    if (total === 0) {
      return {
        total: 0,
        avgConfidence: 0,
        lowConfidenceThreshold,
        lowConfidenceCount: 0,
        typedCoverage: 0,
        typeCounts: {} as Record<string, number>,
      };
    }
    const typeCounts: Record<string, number> = {};
    let confidenceSum = 0;
    let lowConfidenceCount = 0;
    let typedCount = 0;
    segments.forEach((segment: PromptExploderSegment) => {
      typeCounts[segment.type] = (typeCounts[segment.type] ?? 0) + 1;
      confidenceSum += segment.confidence;
      if (segment.confidence < lowConfidenceThreshold) lowConfidenceCount += 1;
      if (segment.type !== 'assigned_text') typedCount += 1;
    });
    return {
      total,
      avgConfidence: confidenceSum / total,
      lowConfidenceThreshold,
      lowConfidenceCount,
      typedCoverage: typedCount / total,
      typeCounts,
    };
  }, [documentState, promptExploderSettings.runtime.benchmarkLowConfidenceThreshold]);

  const segmentOptions = useMemo(
    () =>
      (documentState?.segments ?? []).map((segment: PromptExploderSegment) => ({
        value: segment.id,
        label: segment.title,
      })),
    [documentState?.segments]
  );

  const segmentById = useMemo(
    () => new Map<string, PromptExploderSegment>((documentState?.segments ?? []).map((segment: PromptExploderSegment) => [segment.id, segment])),
    [documentState?.segments]
  );

  // ── Actions ────────────────────────────────────────────────────────────────

  const syncManualBindings = useCallback(
    (nextManualBindings: PromptExploderBinding[]) => {
      setManualBindings(nextManualBindings);
      setDocumentState((current: PromptExploderDocument | null) => {
        if (!current) return current;
        return updatePromptExploderDocument(current, current.segments, nextManualBindings);
      });
    },
    []
  );

  const replaceSegments = useCallback(
    (segments: PromptExploderSegment[]) => {
      const normalized = segments.map((segment) => ensureSegmentTitle(segment));
      setDocumentState((current: PromptExploderDocument | null) => {
        if (!current) return current;
        return updatePromptExploderDocument(current, normalized, manualBindings);
      });
    },
    [manualBindings]
  );

  const updateSegment = useCallback(
    (segmentId: string, updater: (segment: PromptExploderSegment) => PromptExploderSegment) => {
      setDocumentState((current: PromptExploderDocument | null) => {
        if (!current) return current;
        const nextSegments = current.segments.map((segment: PromptExploderSegment) =>
          segment.id === segmentId ? ensureSegmentTitle(updater(segment)) : segment
        );
        return updatePromptExploderDocument(current, nextSegments, manualBindings);
      });
    },
    [manualBindings]
  );

  const handleExplode = useCallback(() => {
    const trimmed = promptText.trim();
    if (!trimmed) {
      toast('Enter a prompt first.', { variant: 'info' });
      return;
    }
    if (runtimeGuardrailIssue) {
      toast(runtimeGuardrailIssue, { variant: 'error' });
      return;
    }
    if (explodeInFlightRef.current) {
      recordPromptValidationCounter('runtime_backpressure_drop', 1, {
        scope: runtimeSelection.identity.scope,
      });
      toast('Prompt explosion is already running.', { variant: 'info' });
      return;
    }
    if (!tryEnterPromptRuntimeScope(runtimeSelection.identity.scope)) {
      recordPromptValidationCounter('runtime_backpressure_drop', 1, {
        scope: runtimeSelection.identity.scope,
      });
      toast('Runtime is busy for this scope. Try again in a moment.', {
        variant: 'info',
      });
      return;
    }
    explodeInFlightRef.current = true;

    try {
      const similarityThreshold = promptExploderClampNumber(
        promptExploderSettings.learning.similarityThreshold,
        0.3,
        0.95
      );
      const learnedTemplateSignature = runtimeSelection.runtimeLearnedTemplates
        .map((template) => `${template.id}:${template.state}:${template.updatedAt}`)
        .join('|');
      const runtimeSignature = [
        trimmed,
        runtimeSelection.identity.cacheKey,
        similarityThreshold.toFixed(4),
        learnedTemplateSignature,
      ].join('::');
      if (lastExplosionRef.current?.signature === runtimeSignature) {
        recordPromptValidationCounter('runtime_fast_path_hit', 1, {
          scope: runtimeSelection.identity.scope,
        });
        const nextDocument = lastExplosionRef.current.document;
        setManualBindings([]);
        setDocumentState(nextDocument);
        setSelectedSegmentId(nextDocument.segments[0]?.id ?? null);
        toast(`Reused ${nextDocument.segments.length} cached segment(s).`, {
          variant: 'info',
        });
        return;
      }
      recordPromptValidationCounter('runtime_fast_path_miss', 1, {
        scope: runtimeSelection.identity.scope,
      });

      const rollout = resolvePromptExploderOrchestratorRollout({
        settingsEnabled: promptExploderSettings.runtime.orchestratorEnabled,
        cohortSeed: runtimeSelection.identity.cacheKey,
      });
      const orchestratorEnabled = isPromptExploderOrchestratorEnabled(
        promptExploderSettings.runtime.orchestratorEnabled,
        runtimeSelection.identity.cacheKey
      );
      const nextDocument = orchestratorEnabled
        ? explodePromptWithValidationRuntime({
          prompt: trimmed,
          runtime: runtimeSelection,
          similarityThreshold,
        })
        : explodePromptText({
          prompt: trimmed,
          validationRules: runtimeSelection.runtimeValidationRules,
          learnedTemplates: runtimeSelection.runtimeLearnedTemplates,
          similarityThreshold,
          validationScope: runtimeSelection.identity.scope,
          runtimeCacheKey: runtimeSelection.identity.cacheKey,
          correlationId: runtimeSelection.correlationId,
        });
      lastExplosionRef.current = {
        signature: runtimeSignature,
        document: nextDocument,
      };

      setManualBindings([]);
      setDocumentState(nextDocument);
      setSelectedSegmentId(nextDocument.segments[0]?.id ?? null);
      toast(`Exploded into ${nextDocument.segments.length} segment(s).`, {
        variant: 'success',
      });
      if (!orchestratorEnabled) {
        logClientError(
          new Error('Prompt runtime orchestrator disabled for current rollout cohort.'),
          {
            context: {
              source: 'DocumentProvider',
              action: 'handleExplode.rollout',
              scope: runtimeSelection.identity.scope,
              stack: runtimeSelection.identity.stack,
              rolloutReason: rollout.reason,
              rolloutPercent: rollout.canaryPercent,
              rolloutBucket: rollout.bucket,
              level: 'warn',
            },
          }
        );
      }
    } catch (error) {
      logClientError(error, {
        context: {
          source: 'DocumentProvider',
          action: 'handleExplode',
          correlationId: runtimeSelection.correlationId,
          scope: runtimeSelection.identity.scope,
          stack: runtimeSelection.identity.stack,
          level: 'error',
        },
      });
      toast(error instanceof Error ? error.message : 'Explosion failed.', {
        variant: 'error',
      });
    } finally {
      explodeInFlightRef.current = false;
      leavePromptRuntimeScope(runtimeSelection.identity.scope);
    }
  }, [promptText, promptExploderSettings, runtimeGuardrailIssue, runtimeSelection, toast]);

  const clearDocument = useCallback(() => {
    setDocumentState(null);
    setSelectedSegmentId(null);
    setManualBindings([]);
  }, []);

  const handleReloadFromStudio = useCallback(() => {
    clearDocument();
    // In a real app this would reload from bridge, 
    // but here we just re-run handleExplode with current text
    handleExplode();
  }, [clearDocument, handleExplode]);

  const handleApplyToImageStudio = useCallback(async () => {
    if (!documentState) return;
    const reassembled = reassemblePromptSegments(documentState.segments);
    if (returnTarget === 'case-resolver') {
      const captureRules = buildCaseResolverSegmentCaptureRules(
        runtimeSelection.runtimeValidationRules,
        runtimeSelection.identity.scope
      );
      if (
        promptExploderSettings.runtime.caseResolverCaptureMode === 'rules_only' &&
        captureRules.length === 0
      ) {
        toast(
          'No Case Resolver capture rules are active for this validation scope. Configure capture rules before applying.',
          { variant: 'warning' }
        );
      }
      const transferPayload = resolveCaseResolverBridgePayloadForTransfer({
        segments: documentState.segments,
        captureRules,
        mode: promptExploderSettings.runtime.caseResolverCaptureMode,
      });
      if (transferPayload.usedFallback) {
        toast(
          'Rules-only extraction did not find captures. Applied heuristics fallback for this transfer.',
          { variant: 'warning' }
        );
      }
      if (!transferPayload.hasCaptureData) {
        toast(
          'No addresser/addressee/date captures found in this output. You can still apply the reassembled text.',
          { variant: 'info' }
        );
      }
      savePromptExploderApplyPromptForCaseResolver(
        reassembled,
        incomingCaseResolverContext,
        transferPayload.payload.parties,
        transferPayload.payload.metadata
      );
    } else {
      savePromptExploderApplyPrompt(reassembled);
    }
    router.push(returnTo);
  }, [
    documentState,
    incomingCaseResolverContext,
    promptExploderSettings.runtime.caseResolverCaptureMode,
    returnTarget,
    returnTo,
    router,
    runtimeSelection.identity.scope,
    runtimeSelection.runtimeValidationRules,
    toast,
  ]);

  const updateParameterValue = useCallback(
    (segmentId: string, path: string, value: unknown) => {
      updateSegment(segmentId, (current) => {
        const nextParams = { ...(current.paramsObject ?? {}) };
        const parts = path.split('.');
        let cursor: Record<string, unknown> = nextParams;
        for (let i = 0; i < parts.length - 1; i++) {
          const part = parts[i]!;
          const existing = cursor[part];
          if (!existing || typeof existing !== 'object' || Array.isArray(existing)) {
            cursor[part] = {};
          }
          const nextCursor = cursor[part];
          if (!nextCursor || typeof nextCursor !== 'object' || Array.isArray(nextCursor)) {
            return { ...current, paramsObject: nextParams };
          }
          cursor = nextCursor as Record<string, unknown>;
        }
        cursor[parts[parts.length - 1]!] = value;
        return { ...current, paramsObject: nextParams };
      });
    },
    [updateSegment]
  );

  const updateParameterSelector = useCallback(
    (segmentId: string, path: string, control: string) => {
      updateSegment(segmentId, (current) => {
        const nextControls = { ...(current.paramUiControls ?? {}) };
        if (control === 'auto') {
          delete nextControls[path];
        } else {
          nextControls[path] = control as PromptExploderParamUiControl;
        }
        return { ...current, paramUiControls: nextControls };
      });
    },
    [updateSegment]
  );

  const updateParameterComment = useCallback(
    (segmentId: string, path: string, comment: string | null) => {
      updateSegment(segmentId, (current) => {
        const nextComments = { ...(current.paramComments ?? {}) };
        if (!comment) {
          delete nextComments[path];
        } else {
          nextComments[path] = comment;
        }
        return { ...current, paramComments: nextComments };
      });
    },
    [updateSegment]
  );

  const updateParameterDescription = useCallback(
    (segmentId: string, path: string, description: string | null) => {
      updateSegment(segmentId, (current) => {
        const nextDescriptions = { ...(current.paramDescriptions ?? {}) };
        if (!description) {
          delete nextDescriptions[path];
        } else {
          nextDescriptions[path] = description;
        }
        return { ...current, paramDescriptions: nextDescriptions };
      });
    },
    [updateSegment]
  );

  // ── Bridge logic ───────────────────────────────────────────────────────────

  useEffect(() => {
    const payload = readPromptExploderDraftPayload();
    if (payload?.source && payload.source !== incomingBridgeSource) {
      setIncomingBridgeSource(payload.source);
    }
    const payloadContext = payload?.caseResolverContext ?? null;
    if (
      (incomingCaseResolverContext?.fileId ?? null) !== (payloadContext?.fileId ?? null)
    ) {
      setIncomingCaseResolverContext(payloadContext);
    }
    const promptFromPayload =
      payload && (!payload.target || payload.target === 'prompt-exploder')
        ? payload.prompt
        : null;
    if (promptFromPayload && !promptText.trim()) {
      setPromptText(promptFromPayload);
      return;
    }
  }, [incomingBridgeSource, incomingCaseResolverContext, promptText]);

  // ── Context values ─────────────────────────────────────────────────────────

  const stateValue = useMemo<DocumentState>(
    () => ({
      promptText,
      documentState,
      manualBindings,
      selectedSegmentId,
      selectedSegment,
      selectedParamEntriesState,
      listParamOptions,
      listParamEntryByPath,
      explosionMetrics,
      segmentOptions,
      segmentById,
      returnTarget,
    }),
    [
      promptText,
      documentState,
      manualBindings,
      selectedSegmentId,
      selectedSegment,
      selectedParamEntriesState,
      listParamOptions,
      listParamEntryByPath,
      explosionMetrics,
      segmentOptions,
      segmentById,
      returnTarget,
    ]
  );

  const actionsValue = useMemo<DocumentActions>(
    () => ({
      setPromptText,
      setDocumentState,
      setManualBindings,
      setSelectedSegmentId,
      handleExplode,
      syncManualBindings,
      replaceSegments,
      updateSegment,
      clearDocument,
      handleReloadFromStudio,
      handleApplyToImageStudio,
      updateParameterValue,
      updateParameterSelector,
      updateParameterComment,
      updateParameterDescription,
    }),
    [
      setPromptText,
      setDocumentState,
      setManualBindings,
      setSelectedSegmentId,
      handleExplode,
      syncManualBindings,
      replaceSegments,
      updateSegment,
      clearDocument,
      handleReloadFromStudio,
      handleApplyToImageStudio,
      updateParameterValue,
      updateParameterSelector,
      updateParameterComment,
      updateParameterDescription,
    ]
  );

  return (
    <DocumentStateContext.Provider value={stateValue}>
      <DocumentActionsContext.Provider value={actionsValue}>
        {children}
      </DocumentActionsContext.Provider>
    </DocumentStateContext.Provider>
  );
}

export function useDocumentState(): DocumentState {
  const context = useContext(DocumentStateContext);
  if (!context) throw new Error('useDocumentState must be used within DocumentProvider');
  return context;
}

export function useDocumentActions(): DocumentActions {
  const context = useContext(DocumentActionsContext);
  if (!context) throw new Error('useDocumentActions must be used within DocumentProvider');
  return context;
}
