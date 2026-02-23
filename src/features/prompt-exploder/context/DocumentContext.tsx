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

// --- Granular State Interfaces ---

export interface DocumentPromptState {
  promptText: string;
  returnTarget: 'image-studio' | 'case-resolver';
}

export interface DocumentCoreState {
  documentState: PromptExploderDocument | null;
  manualBindings: PromptExploderBinding[];
  segmentById: Map<string, PromptExploderSegment>;
  segmentOptions: Array<{ value: string; label: string }>;
}

export interface DocumentSelectionState {
  selectedSegmentId: string | null;
  selectedSegment: PromptExploderSegment | null;
}

export interface DocumentParamsState {
  selectedParamEntriesState: PromptExploderParamEntriesState | null;
  listParamOptions: Array<{ value: string; label: string }>;
  listParamEntryByPath: Map<string, PromptExploderParamEntry>;
}

export interface DocumentMetricsState {
  explosionMetrics: {
    total: number;
    avgConfidence: number;
    lowConfidenceThreshold: number;
    lowConfidenceCount: number;
    typedCoverage: number;
    typeCounts: Record<string, number>;
  } | null;
}

export interface DocumentState extends DocumentPromptState, DocumentCoreState, DocumentSelectionState, DocumentParamsState, DocumentMetricsState {}

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

const DocumentPromptContext = createContext<DocumentPromptState | null>(null);
const DocumentCoreContext = createContext<DocumentCoreState | null>(null);
const DocumentSelectionContext = createContext<DocumentSelectionState | null>(null);
const DocumentParamsContext = createContext<DocumentParamsState | null>(null);
const DocumentMetricsContext = createContext<DocumentMetricsState | null>(null);

export const DocumentStateContext = createContext<DocumentState | null>(null);
export const DocumentActionsContext = createContext<DocumentActions | null>(null);

// ── Provider ─────────────────────────────────────────────────────────────────

export function DocumentProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = searchParams?.get('returnTo') || '/admin/image-studio';
  const caseResolverSessionId = searchParams?.get('sessionId')?.trim() ?? '';
  const isCaseResolverReturnTarget = useMemo((): boolean => {
    try {
      const parsed = new URL(returnTo, 'https://local.prompt-exploder');
      return parsed.pathname.startsWith('/admin/case-resolver');
    } catch {
      return false;
    }
  }, [returnTo]);
  const returnToCaseResolverFileId = useMemo((): string => {
    if (!isCaseResolverReturnTarget) return '';
    try {
      const parsed = new URL(returnTo, 'https://local.prompt-exploder');
      return parsed.searchParams.get('fileId')?.trim() ?? '';
    } catch {
      return '';
    }
  }, [isCaseResolverReturnTarget, returnTo]);

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
  const lastHydratedDraftPayloadKeyRef = useRef<string | null>(null);
  const lastExplosionRef = useRef<{
    signature: string;
    document: PromptExploderDocument;
  } | null>(null);

  const returnTarget = isCaseResolverReturnTarget ? 'case-resolver' : 'image-studio';

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
      paramsText: (selectedSegment.paramsText || selectedSegment.text) || '',
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
      paramsText: (paramsSegment.paramsText || paramsSegment.text) || '',
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
      promptExploderSettings.runtime.benchmarkLowConfidenceThreshold ?? 0.55,
      0.3,
      0.9
    );    const segments = documentState.segments;
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
        label: segment.title || `Segment \${segment.id}`,
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
      setDocumentState((current: PromptExploderDocument | null) => {
        if (!current) return current;
        return updatePromptExploderDocument(current, segments, manualBindings);
      });
    },
    [manualBindings]
  );

  const updateSegment = useCallback(
    (segmentId: string, updater: (segment: PromptExploderSegment) => PromptExploderSegment) => {
      setDocumentState((current: PromptExploderDocument | null) => {
        if (!current) return current;
        const nextSegments = current.segments.map((segment: PromptExploderSegment) =>
          segment.id === segmentId ? updater(segment) : segment
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
        .map((template) => `\${template.id}:\${template.state}:\${template.updatedAt}`)
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
        toast(`Reused \${nextDocument.segments.length} cached segment(s).`, {
          variant: 'info',
        });
        return;
      }
      recordPromptValidationCounter('runtime_fast_path_miss', 1, {
        scope: runtimeSelection.identity.scope,
      });

      const rollout = resolvePromptExploderOrchestratorRollout({
        settingsEnabled: promptExploderSettings.runtime.orchestratorEnabled ?? true,
        cohortSeed: runtimeSelection.identity.cacheKey,
      });
      const orchestratorEnabled = isPromptExploderOrchestratorEnabled(
        promptExploderSettings.runtime.orchestratorEnabled ?? true,
        runtimeSelection.identity.cacheKey
      );      const nextDocument = orchestratorEnabled
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
      toast(`Exploded into \${nextDocument.segments.length} segment(s).`, {
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
    try {
      const reassembled = documentState
        ? reassemblePromptSegments(documentState.segments)
        : promptText.trim();
      if (!reassembled) {
        toast('No reassembled text available to apply.', { variant: 'warning' });
        return;
      }
      if (returnTarget === 'case-resolver') {
        const incomingContextFileId = incomingCaseResolverContext?.fileId?.trim() ?? '';
        const routeContextFileId = returnToCaseResolverFileId;
        const hasExplicitContextFileMismatch =
          routeContextFileId.length > 0 &&
          incomingContextFileId.length > 0 &&
          incomingContextFileId !== routeContextFileId;
        const resolvedContextFileId = routeContextFileId || incomingContextFileId;
        const incomingContextSessionId = incomingCaseResolverContext?.sessionId?.trim() ?? '';
        const routeContextSessionId = caseResolverSessionId;
        const resolvedContextSessionId = routeContextSessionId || incomingContextSessionId;
        if (!resolvedContextFileId) {
          toast(
            'Cannot apply to Case Resolver without a valid target document context.',
            { variant: 'error' }
          );
          return;
        }
        if (hasExplicitContextFileMismatch) {
          toast(
            'Target document context mismatch detected. Applying to the return target document.',
            { variant: 'warning' }
          );
        }
        const hasExplicitSessionMismatch =
          routeContextSessionId.length > 0 &&
          incomingContextSessionId.length > 0 &&
          incomingContextSessionId !== routeContextSessionId;
        if (hasExplicitSessionMismatch) {
          toast(
            'Session metadata mismatch detected; applying with the current return session.',
            { variant: 'warning' }
          );
        }

        const transferSegments = documentState?.segments ?? [];
        let captureParties;
        let captureMetadata;
        let hasCaptureData = false;

        if (transferSegments.length > 0) {
          const captureRules = buildCaseResolverSegmentCaptureRules(
            runtimeSelection.runtimeValidationRules,
            runtimeSelection.identity.scope
          );
          const isRulesOnlyCaptureMode =
            promptExploderSettings.runtime.caseResolverCaptureMode === 'rules_only';
          if (
            isRulesOnlyCaptureMode &&
            captureRules.length === 0
          ) {
            toast(
              'No Case Resolver capture rules are active for this validation scope. Configure capture rules before applying.',
              { variant: 'warning' }
            );
          }
          const transferPayload = resolveCaseResolverBridgePayloadForTransfer({
            segments: transferSegments,
            captureRules,
            mode: promptExploderSettings.runtime.caseResolverCaptureMode,
          });
          if (transferPayload.usedFallback) {
            toast(
              'Unexpected capture fallback path detected. Transfer was blocked; review extraction mode and rules.',
              { variant: 'error' }
            );
            return;
          }
          hasCaptureData = transferPayload.hasCaptureData;
          captureParties = transferPayload.payload.parties;
          captureMetadata = transferPayload.payload.metadata;
        } else {
          toast(
            'No exploded segments detected. Applying raw prompt text without structured captures.',
            { variant: 'info' }
          );
        }

        if (!hasCaptureData) {
          if (promptExploderSettings.runtime.caseResolverCaptureMode === 'rules_only') {
            toast(
              'No addresser/addressee/date captures found in rules-only mode. No fallback extraction will run; applying will transfer text only.',
              { variant: 'warning' }
            );
          } else {
            toast('No addresser/addressee/date captures found. Applying will transfer text only.', {
              variant: 'warning',
            });
          }
        }
        const transferContext: PromptExploderCaseResolverContext = {
          fileId: resolvedContextFileId,
          fileName:
            incomingCaseResolverContext?.fileName?.trim() || resolvedContextFileId,
          ...(resolvedContextSessionId
            ? {
              sessionId:
                resolvedContextSessionId,
            }
            : {}),
          ...(typeof incomingCaseResolverContext?.documentVersionAtStart === 'number'
            ? {
              documentVersionAtStart:
                incomingCaseResolverContext.documentVersionAtStart,
            }
            : {}),
        };
        savePromptExploderApplyPromptForCaseResolver(
          reassembled,
          transferContext,
          captureParties,
          captureMetadata
        );
      } else {
        savePromptExploderApplyPrompt(reassembled);
      }
      router.push(returnTo);
    } catch (error) {
      logClientError(error, {
        context: {
          source: 'DocumentProvider',
          action: 'handleApplyToImageStudio',
          scope: runtimeSelection.identity.scope,
          stack: runtimeSelection.identity.stack,
          level: 'error',
        },
      });
      toast(
        error instanceof Error ? error.message : 'Failed to apply prompt output.',
        { variant: 'error' }
      );
    }
  }, [
    documentState,
    caseResolverSessionId,
    incomingCaseResolverContext,
    promptText,
    promptExploderSettings.runtime.caseResolverCaptureMode,
    returnToCaseResolverFileId,
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
    const rawPayloadContext = payload?.caseResolverContext ?? null;
    const rawPayloadSessionId = rawPayloadContext?.sessionId?.trim() ?? '';
    const hasMatchingCaseResolverSession =
      isCaseResolverReturnTarget &&
      (
        caseResolverSessionId.length === 0 ||
        rawPayloadSessionId.length === 0 ||
        rawPayloadSessionId === caseResolverSessionId
      );
    const isConsumableDraftPayload =
      payload !== null &&
      (!payload.target || payload.target === 'prompt-exploder') &&
      (payload.source !== 'case-resolver' || hasMatchingCaseResolverSession);
    const nextBridgeSource = isConsumableDraftPayload ? payload?.source ?? null : null;
    if (nextBridgeSource !== incomingBridgeSource) {
      setIncomingBridgeSource(nextBridgeSource);
    }
    const payloadContext = isConsumableDraftPayload ? rawPayloadContext : null;
    if (
      (incomingCaseResolverContext?.fileId ?? null) !== (payloadContext?.fileId ?? null) ||
      (incomingCaseResolverContext?.sessionId ?? null) !== (payloadContext?.sessionId ?? null)
    ) {
      setIncomingCaseResolverContext(payloadContext);
    }
    const promptFromPayload = isConsumableDraftPayload ? payload?.prompt ?? null : null;
    const payloadKey = payload
      ? [
        payload.createdAt,
        payload.source ?? '',
        payload.target ?? '',
        payload.caseResolverContext?.fileId ?? '',
        payload.caseResolverContext?.sessionId ?? '',
        String(payload.prompt.length),
      ].join('|')
      : null;
    if (
      promptFromPayload &&
      payloadKey &&
      lastHydratedDraftPayloadKeyRef.current !== payloadKey
    ) {
      lastHydratedDraftPayloadKeyRef.current = payloadKey;
      clearDocument();
      setPromptText(promptFromPayload);
      return;
    }
  }, [
    caseResolverSessionId,
    clearDocument,
    incomingBridgeSource,
    incomingCaseResolverContext,
    isCaseResolverReturnTarget,
  ]);

  // ── Context values ─────────────────────────────────────────────────────────

  const promptValue = useMemo<DocumentPromptState>(() => ({
    promptText,
    returnTarget,
  }), [promptText, returnTarget]);

  const coreValue = useMemo<DocumentCoreState>(() => ({
    documentState,
    manualBindings,
    segmentById,
    segmentOptions,
  }), [documentState, manualBindings, segmentById, segmentOptions]);

  const selectionValue = useMemo<DocumentSelectionState>(() => ({
    selectedSegmentId,
    selectedSegment,
  }), [selectedSegmentId, selectedSegment]);

  const paramsValue = useMemo<DocumentParamsState>(() => ({
    selectedParamEntriesState,
    listParamOptions,
    listParamEntryByPath,
  }), [selectedParamEntriesState, listParamOptions, listParamEntryByPath]);

  const metricsValue = useMemo<DocumentMetricsState>(() => ({
    explosionMetrics,
  }), [explosionMetrics]);

  const stateValue = useMemo<DocumentState>(
    () => ({
      ...promptValue,
      ...coreValue,
      ...selectionValue,
      ...paramsValue,
      ...metricsValue,
    }),
    [promptValue, coreValue, selectionValue, paramsValue, metricsValue]
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
    <DocumentPromptContext.Provider value={promptValue}>
      <DocumentCoreContext.Provider value={coreValue}>
        <DocumentSelectionContext.Provider value={selectionValue}>
          <DocumentParamsContext.Provider value={paramsValue}>
            <DocumentMetricsContext.Provider value={metricsValue}>
              <DocumentStateContext.Provider value={stateValue}>
                <DocumentActionsContext.Provider value={actionsValue}>
                  {children}
                </DocumentActionsContext.Provider>
              </DocumentStateContext.Provider>
            </DocumentMetricsContext.Provider>
          </DocumentParamsContext.Provider>
        </DocumentSelectionContext.Provider>
      </DocumentCoreContext.Provider>
    </DocumentPromptContext.Provider>
  );
}

export function useDocumentPrompt(): DocumentPromptState {
  const context = useContext(DocumentPromptContext);
  if (!context) throw new Error('useDocumentPrompt must be used within DocumentProvider');
  return context;
}

export function useDocumentCore(): DocumentCoreState {
  const context = useContext(DocumentCoreContext);
  if (!context) throw new Error('useDocumentCore must be used within DocumentProvider');
  return context;
}

export function useDocumentSelection(): DocumentSelectionState {
  const context = useContext(DocumentSelectionContext);
  if (!context) throw new Error('useDocumentSelection must be used within DocumentProvider');
  return context;
}

export function useDocumentParams(): DocumentParamsState {
  const context = useContext(DocumentParamsContext);
  if (!context) throw new Error('useDocumentParams must be used within DocumentProvider');
  return context;
}

export function useDocumentMetrics(): DocumentMetricsState {
  const context = useContext(DocumentMetricsContext);
  if (!context) throw new Error('useDocumentMetrics must be used within DocumentProvider');
  return context;
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
