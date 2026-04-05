'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import React, { useCallback, useMemo, useRef, useState } from 'react';

import type { LabeledOptionDto } from '@/shared/contracts/base';
import type {
  PromptExploderParamEntry,
  PromptExploderParamEntriesState,
} from '@/shared/contracts/prompt-exploder';
import { internalError } from '@/shared/errors/app-error';
import { createStrictContext } from '@/shared/lib/react/createStrictContext';
import { useToast } from '@/shared/ui/primitives.public';

import {
  type PromptExploderBridgeSource,
  type PromptExploderCaseResolverContext,
} from '../bridge';
import { updatePromptExploderDocument } from '../parser';
import { useDocumentApplyAction } from './hooks/useDocumentApplyAction';
import { useDocumentBridgeHydration } from './hooks/useDocumentBridgeHydration';
import { useDocumentExplodeAction } from './hooks/useDocumentExplodeAction';
import { useDocumentDerivedState } from './document/useDocumentDerivedState';
import { useSettingsState } from './SettingsContext';

import type {
  PromptExploderBinding,
  PromptExploderDocument,
  PromptExploderParamUiControl,
  PromptExploderSegment,
} from '../types';
import { logClientError } from '@/shared/utils/observability/client-error-logger';

export interface DocumentPromptState {
  promptText: string;
  returnTarget: 'image-studio' | 'case-resolver';
}

export interface DocumentCoreState {
  documentState: PromptExploderDocument | null;
  manualBindings: PromptExploderBinding[];
  segmentById: Map<string, PromptExploderSegment>;
  segmentOptions: Array<LabeledOptionDto<string>>;
}

export interface DocumentSelectionState {
  selectedSegmentId: string | null;
  selectedSegment: PromptExploderSegment | null;
}

export interface DocumentParamsState {
  selectedParamEntriesState: PromptExploderParamEntriesState | null;
  listParamOptions: Array<LabeledOptionDto<string>>;
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

const documentPromptContextResult = createStrictContext<DocumentPromptState>({
  hookName: 'useDocumentPrompt',
  providerName: 'DocumentProvider',
  displayName: 'DocumentPromptContext',
  errorFactory: (message) => internalError(message),
});

const documentCoreContextResult = createStrictContext<DocumentCoreState>({
  hookName: 'useDocumentCore',
  providerName: 'DocumentProvider',
  displayName: 'DocumentCoreContext',
  errorFactory: (message) => internalError(message),
});

const documentSelectionContextResult = createStrictContext<DocumentSelectionState>({
  hookName: 'useDocumentSelection',
  providerName: 'DocumentProvider',
  displayName: 'DocumentSelectionContext',
  errorFactory: (message) => internalError(message),
});

const documentParamsContextResult = createStrictContext<DocumentParamsState>({
  hookName: 'useDocumentParams',
  providerName: 'DocumentProvider',
  displayName: 'DocumentParamsContext',
  errorFactory: (message) => internalError(message),
});

const documentMetricsContextResult = createStrictContext<DocumentMetricsState>({
  hookName: 'useDocumentMetrics',
  providerName: 'DocumentProvider',
  displayName: 'DocumentMetricsContext',
  errorFactory: (message) => internalError(message),
});

const documentActionsContextResult = createStrictContext<DocumentActions>({
  hookName: 'useDocumentActions',
  providerName: 'DocumentProvider',
  displayName: 'DocumentActionsContext',
  errorFactory: (message) => internalError(message),
});

export interface DocumentState
  extends
    DocumentPromptState,
    DocumentCoreState,
    DocumentSelectionState,
    DocumentParamsState,
    DocumentMetricsState {}

const documentStateContextResult = createStrictContext<DocumentState>({
  hookName: 'useDocumentState',
  providerName: 'DocumentProvider',
  displayName: 'DocumentStateContext',
  errorFactory: (message) => internalError(message),
});

export const DocumentPromptContext = documentPromptContextResult.Context;
const DocumentCoreContext = documentCoreContextResult.Context;
const DocumentSelectionContext = documentSelectionContextResult.Context;
const DocumentParamsContext = documentParamsContextResult.Context;
const DocumentMetricsContext = documentMetricsContextResult.Context;
export const DocumentActionsContext = documentActionsContextResult.Context;
export const DocumentStateContext = documentStateContextResult.Context;

export function DocumentProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = searchParams?.get('returnTo') || '/admin/image-studio';
  const isCaseResolverReturnTarget = useMemo((): boolean => {
    try {
      const parsed = new URL(returnTo, 'https://local.prompt-exploder');
      return parsed.pathname.startsWith('/admin/case-resolver');
    } catch (error) {
      logClientError(error);
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

  const {
    selectedSegment,
    selectedParamEntriesState,
    listParamOptions,
    listParamEntryByPath,
    explosionMetrics,
    segmentOptions,
    segmentById,
  } = useDocumentDerivedState({
    documentState,
    selectedSegmentId,
    benchmarkLowConfidenceThreshold: promptExploderSettings.runtime.benchmarkLowConfidenceThreshold,
  });

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

export const useDocumentPrompt = documentPromptContextResult.useStrictContext;

export const useDocumentCore = documentCoreContextResult.useStrictContext;

export const useDocumentSelection = documentSelectionContextResult.useStrictContext;

export const useDocumentParams = documentParamsContextResult.useStrictContext;

export const useDocumentMetrics = documentMetricsContextResult.useStrictContext;

export const useDocumentActions = documentActionsContextResult.useStrictContext;

export const useDocumentState = documentStateContextResult.useStrictContext;
