'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';

import type {
  PromptExploderParamEntry,
  PromptExploderParamEntriesState,
} from '@/shared/contracts/prompt-exploder';
import { internalError } from '@/shared/errors/app-error';
import { useToast } from '@/shared/ui';

import {
  type PromptExploderBridgeSource,
  type PromptExploderCaseResolverContext,
} from '../bridge';
import { promptExploderClampNumber } from '../helpers/formatting';
import { buildPromptExploderParamEntries } from '../params-editor';
import { updatePromptExploderDocument } from '../parser';
import {
  DocumentActionsContext,
  type DocumentActions,
  useDocumentActions as useDocumentActionsValue,
} from './document/DocumentActionsContext';
import {
  DocumentCoreContext,
  type DocumentCoreState,
  useDocumentCore as useDocumentCoreValue,
} from './document/DocumentCoreContext';
import {
  DocumentMetricsContext,
  type DocumentMetricsState,
  useDocumentMetrics as useDocumentMetricsValue,
} from './document/DocumentMetricsContext';
import {
  DocumentParamsContext,
  type DocumentParamsState,
  useDocumentParams as useDocumentParamsValue,
} from './document/DocumentParamsContext';
import {
  DocumentPromptContext,
  type DocumentPromptState,
  useDocumentPrompt as useDocumentPromptValue,
} from './document/DocumentPromptContext';
import {
  DocumentSelectionContext,
  type DocumentSelectionState,
  useDocumentSelection as useDocumentSelectionValue,
} from './document/DocumentSelectionContext';
import { useDocumentApplyAction } from './hooks/useDocumentApplyAction';
import { useDocumentBridgeHydration } from './hooks/useDocumentBridgeHydration';
import { useDocumentExplodeAction } from './hooks/useDocumentExplodeAction';
import { useSettingsState } from './hooks/useSettings';

import type {
  PromptExploderBinding,
  PromptExploderDocument,
  PromptExploderParamUiControl,
  PromptExploderSegment,
} from '../types';

export { DocumentPromptContext, type DocumentPromptState };
export { DocumentActionsContext };
export type { DocumentActions };

export interface DocumentState
  extends
    DocumentPromptState,
    DocumentCoreState,
    DocumentSelectionState,
    DocumentParamsState,
    DocumentMetricsState {}

export const DocumentStateContext = createContext<DocumentState | null>(null);

export function DocumentProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = searchParams?.get('returnTo') || '/admin/image-studio';
  const isCaseResolverReturnTarget = useMemo((): boolean => {
    try {
      const parsed = new URL(returnTo, 'https://local.prompt-exploder');
      return parsed.pathname.startsWith('/admin/case-resolver');
    } catch {
      return false;
    }
  }, [returnTo]);

  const { runtimeSelection, runtimeGuardrailIssue, promptExploderSettings } = useSettingsState();

  const [promptText, setPromptText] = useState('');
  const [documentState, setDocumentState] = useState<PromptExploderDocument | null>(null);
  const [selectedSegmentId, setSelectedSegmentId] = useState<string | null>(null);
  const [manualBindings, setManualBindings] = useState<PromptExploderBinding[]>([]);
  const [incomingBridgeSource, setIncomingBridgeSource] =
    useState<PromptExploderBridgeSource | null>(null);
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
    return (
      documentState.segments.find(
        (segment: PromptExploderSegment) => segment.id === selectedSegmentId
      ) ?? null
    );
  }, [documentState, selectedSegmentId]);

  const selectedParamEntriesState = useMemo<PromptExploderParamEntriesState | null>(() => {
    if (selectedSegment?.type !== 'parameter_block') return null;
    if (!selectedSegment.paramsObject) return null;
    return buildPromptExploderParamEntries({
      paramsObject: selectedSegment.paramsObject,
      paramsText: selectedSegment.paramsText || selectedSegment.text || '',
      paramUiControls: selectedSegment.paramUiControls ?? null,
      paramComments: selectedSegment.paramComments ?? null,
      paramDescriptions: selectedSegment.paramDescriptions ?? null,
    });
  }, [selectedSegment]);

  const listParamEntriesState = useMemo<PromptExploderParamEntriesState | null>(() => {
    if (!documentState) return null;
    const paramsSegment = documentState.segments.find(
      (segment: PromptExploderSegment) =>
        segment.type === 'parameter_block' && Boolean(segment.paramsObject)
    );
    if (!paramsSegment?.paramsObject) return null;
    return buildPromptExploderParamEntries({
      paramsObject: paramsSegment.paramsObject,
      paramsText: paramsSegment.paramsText || paramsSegment.text || '',
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
        label: segment.title || `Segment ${segment.id}`,
      })),
    [documentState?.segments]
  );
  const segmentById = useMemo(
    () =>
      new Map<string, PromptExploderSegment>(
        (documentState?.segments ?? []).map((segment: PromptExploderSegment) => [
          segment.id,
          segment,
        ])
      ),
    [documentState?.segments]
  );

  // ── Actions ────────────────────────────────────────────────────────────────

  const syncManualBindings = useCallback((nextManualBindings: PromptExploderBinding[]) => {
    setManualBindings(nextManualBindings);
    setDocumentState((current: PromptExploderDocument | null) => {
      if (!current) return current;
      return updatePromptExploderDocument(current, current.segments, nextManualBindings);
    });
  }, []);

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

  const handleExplode = useDocumentExplodeAction({
    promptText,
    promptExploderSettings,
    runtimeGuardrailIssue,
    runtimeSelection,
    explodeInFlightRef,
    lastExplosionRef,
    setDocumentState,
    setManualBindings,
    setSelectedSegmentId,
    toast,
  });

  const clearDocument = useCallback(() => {
    setDocumentState(null);
    setSelectedSegmentId(null);
    setManualBindings([]);
  }, []);

  const handleReloadFromStudio = useCallback(() => {
    clearDocument();
    handleExplode();
  }, [clearDocument, handleExplode]);

  const handleApplyToImageStudio = useDocumentApplyAction({
    documentState,
    incomingCaseResolverContext,
    promptText,
    promptExploderSettings,
    returnTarget,
    returnTo,
    router,
    runtimeSelection,
    toast,
  });

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

  useDocumentBridgeHydration({
    clearDocument,
    incomingBridgeSource,
    incomingCaseResolverContext,
    lastHydratedDraftPayloadKeyRef,
    setIncomingBridgeSource,
    setIncomingCaseResolverContext,
    setPromptText,
  });

  // ── Context values ─────────────────────────────────────────────────────────

  const promptValue = useMemo<DocumentPromptState>(
    () => ({
      promptText,
      returnTarget,
    }),
    [promptText, returnTarget]
  );

  const coreValue = useMemo<DocumentCoreState>(
    () => ({
      documentState,
      manualBindings,
      segmentById,
      segmentOptions,
    }),
    [documentState, manualBindings, segmentById, segmentOptions]
  );

  const selectionValue = useMemo<DocumentSelectionState>(
    () => ({
      selectedSegmentId,
      selectedSegment,
    }),
    [selectedSegmentId, selectedSegment]
  );

  const paramsValue = useMemo<DocumentParamsState>(
    () => ({
      selectedParamEntriesState,
      listParamOptions,
      listParamEntryByPath,
    }),
    [selectedParamEntriesState, listParamOptions, listParamEntryByPath]
  );

  const metricsValue = useMemo<DocumentMetricsState>(
    () => ({
      explosionMetrics,
    }),
    [explosionMetrics]
  );

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

export {
  useDocumentPromptValue as useDocumentPrompt,
  useDocumentCoreValue as useDocumentCore,
  useDocumentSelectionValue as useDocumentSelection,
  useDocumentParamsValue as useDocumentParams,
  useDocumentMetricsValue as useDocumentMetrics,
  useDocumentActionsValue as useDocumentActions,
};

export function useDocumentState(): DocumentState {
  const context = useContext(DocumentStateContext);
  if (!context) throw internalError('useDocumentState must be used within DocumentProvider');
  return context;
}
