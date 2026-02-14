'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import React, { createContext, useCallback, useEffect, useMemo, useState } from 'react';

import { setDeepValue } from '@/features/prompt-engine/prompt-params';
import { useToast } from '@/shared/ui';

import {
  consumePromptExploderDraftPrompt,
  readPromptExploderDraftPrompt,
  savePromptExploderApplyPrompt,
} from '../bridge';
import { promptExploderClampNumber } from '../helpers/formatting';
import {
  buildPromptExploderParamEntries,
  isPromptExploderParamUiControl,
  renderPromptExploderParamsText,
  setParamTextMetaForPath,
  setParamUiControlForPath,
  type PromptExploderParamEntry,
  type PromptExploderParamEntriesState,
} from '../params-editor';
import {
  ensureSegmentTitle,
  explodePromptText,
  reassemblePromptSegments,
  updatePromptExploderDocument,
} from '../parser';
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
  selectedSegmentId: string | null;
  selectedSegment: PromptExploderSegment | null;
  manualBindings: PromptExploderBinding[];
  selectedParamEntriesState: PromptExploderParamEntriesState | null;
  listParamEntriesState: PromptExploderParamEntriesState | null;
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
}

export interface DocumentActions {
  setPromptText: React.Dispatch<React.SetStateAction<string>>;
  setDocumentState: React.Dispatch<React.SetStateAction<PromptExploderDocument | null>>;
  setSelectedSegmentId: React.Dispatch<React.SetStateAction<string | null>>;
  setManualBindings: React.Dispatch<React.SetStateAction<PromptExploderBinding[]>>;
  syncManualBindings: (nextManualBindings: PromptExploderBinding[]) => void;
  handleExplode: () => void;
  handleApplyToImageStudio: () => void;
  handleReloadFromStudio: () => void;
  replaceSegments: (segments: PromptExploderSegment[]) => void;
  updateSegment: (
    segmentId: string,
    updater: (segment: PromptExploderSegment) => PromptExploderSegment
  ) => void;
  updateParameterValue: (segmentId: string, path: string, nextValue: unknown) => void;
  updateParameterSelector: (segmentId: string, path: string, selector: string) => void;
  updateParameterComment: (segmentId: string, path: string, comment: string) => void;
  updateParameterDescription: (segmentId: string, path: string, description: string) => void;
}

// ── Contexts ─────────────────────────────────────────────────────────────────

const DocumentStateContext = createContext<DocumentState | null>(null);
const DocumentActionsContext = createContext<DocumentActions | null>(null);

// ── Provider ─────────────────────────────────────────────────────────────────

export function DocumentProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = searchParams?.get('returnTo') || '/admin/image-studio';

  const {
    runtimeValidationRules,
    runtimeLearnedTemplates,
    learningDraft,
    promptExploderSettings,
  } = useSettingsState();

  const [promptText, setPromptText] = useState('');
  const [documentState, setDocumentState] = useState<PromptExploderDocument | null>(null);
  const [selectedSegmentId, setSelectedSegmentId] = useState<string | null>(null);
  const [manualBindings, setManualBindings] = useState<PromptExploderBinding[]>([]);

  // ── Derived state ──────────────────────────────────────────────────────────

  const selectedSegment = useMemo(() => {
    if (!documentState || !selectedSegmentId) return null;
    return documentState.segments.find((segment) => segment.id === selectedSegmentId) ?? null;
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
      (segment) => segment.type === 'parameter_block' && Boolean(segment.paramsObject)
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
    segments.forEach((segment) => {
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
      (documentState?.segments ?? []).map((segment) => ({
        value: segment.id,
        label: segment.title,
      })),
    [documentState?.segments]
  );

  const segmentById = useMemo(
    () => new Map((documentState?.segments ?? []).map((segment) => [segment.id, segment])),
    [documentState?.segments]
  );

  // ── Initialize prompt text ─────────────────────────────────────────────────

  useEffect(() => {
    const fromStorage = readPromptExploderDraftPrompt();
    if (fromStorage && !promptText.trim()) {
      setPromptText(fromStorage);
      return;
    }
    if (promptText.trim().length > 0) return;
    setPromptText(
      '=== PROMPT EXPLODER DEMO ===\n\nROLE\nDefine your role here.\n\nPARAMS\nparams = {\n  "example": true\n}'
    );
  }, [promptText]);

  // ── Actions ────────────────────────────────────────────────────────────────

  const syncManualBindings = useCallback(
    (nextManualBindings: PromptExploderBinding[]) => {
      setManualBindings(nextManualBindings);
      setDocumentState((current) => {
        if (!current) return current;
        return updatePromptExploderDocument(current, current.segments, nextManualBindings);
      });
    },
    []
  );

  const replaceSegments = useCallback(
    (segments: PromptExploderSegment[]) => {
      const normalized = segments.map((segment) => ensureSegmentTitle(segment));
      setDocumentState((current) => {
        if (!current) return current;
        return updatePromptExploderDocument(current, normalized, manualBindings);
      });
    },
    [manualBindings]
  );

  const updateSegment = useCallback(
    (segmentId: string, updater: (segment: PromptExploderSegment) => PromptExploderSegment) => {
      setDocumentState((current) => {
        if (!current) return current;
        const nextSegments = current.segments.map((segment) =>
          segment.id === segmentId ? ensureSegmentTitle(updater(segment)) : segment
        );
        return updatePromptExploderDocument(current, nextSegments, manualBindings);
      });
    },
    [manualBindings]
  );

  const rebuildParameterSegment = useCallback(
    (
      segment: PromptExploderSegment,
      nextParamsObject: Record<string, unknown>,
      overrides?: {
        paramUiControls?: Record<string, PromptExploderParamUiControl>;
        paramComments?: Record<string, string>;
        paramDescriptions?: Record<string, string>;
        preserveCurrentText?: boolean;
      }
    ): PromptExploderSegment => {
      const nextParamState = buildPromptExploderParamEntries({
        paramsObject: nextParamsObject,
        paramsText: segment.paramsText || segment.text,
        paramUiControls: (overrides?.paramUiControls ?? segment.paramUiControls) ?? null,
        paramComments: (overrides?.paramComments ?? segment.paramComments) ?? null,
        paramDescriptions: (overrides?.paramDescriptions ?? segment.paramDescriptions) ?? null,
      });
      const nextParamsText = overrides?.preserveCurrentText
        ? segment.paramsText || segment.text
        : renderPromptExploderParamsText({
          paramsObject: nextParamsObject,
          paramComments: nextParamState.paramComments,
          paramDescriptions: nextParamState.paramDescriptions,
          fallbackText: segment.paramsText || segment.text,
        });
      return {
        ...segment,
        paramsObject: nextParamsObject,
        paramsText: nextParamsText,
        text: nextParamsText,
        raw: nextParamsText,
        paramUiControls: nextParamState.paramUiControls,
        paramComments: nextParamState.paramComments,
        paramDescriptions: nextParamState.paramDescriptions,
      };
    },
    []
  );

  const updateParameterValue = useCallback(
    (segmentId: string, path: string, nextValue: unknown) => {
      updateSegment(segmentId, (current) => {
        if (!current.paramsObject) return current;
        const nextParamsObject = setDeepValue(current.paramsObject, path, nextValue);
        return rebuildParameterSegment(current, nextParamsObject);
      });
    },
    [updateSegment, rebuildParameterSegment]
  );

  const updateParameterSelector = useCallback(
    (segmentId: string, path: string, selector: string) => {
      if (!isPromptExploderParamUiControl(selector)) return;
      updateSegment(segmentId, (current) => {
        const nextParamUiControls = setParamUiControlForPath(current.paramUiControls, path, selector);
        if (!current.paramsObject) {
          return { ...current, paramUiControls: nextParamUiControls };
        }
        return rebuildParameterSegment(current, current.paramsObject, {
          paramUiControls: nextParamUiControls,
        });
      });
    },
    [updateSegment, rebuildParameterSegment]
  );

  const updateParameterComment = useCallback(
    (segmentId: string, path: string, comment: string) => {
      updateSegment(segmentId, (current) => {
        const nextParamComments = setParamTextMetaForPath(current.paramComments, path, comment);
        if (!current.paramsObject) {
          return { ...current, paramComments: nextParamComments };
        }
        return rebuildParameterSegment(current, current.paramsObject, {
          paramComments: nextParamComments,
        });
      });
    },
    [updateSegment, rebuildParameterSegment]
  );

  const updateParameterDescription = useCallback(
    (segmentId: string, path: string, description: string) => {
      updateSegment(segmentId, (current) => {
        const nextParamDescriptions = setParamTextMetaForPath(
          current.paramDescriptions,
          path,
          description
        );
        if (!current.paramsObject) {
          return { ...current, paramDescriptions: nextParamDescriptions };
        }
        return rebuildParameterSegment(current, current.paramsObject, {
          paramDescriptions: nextParamDescriptions,
        });
      });
    },
    [updateSegment, rebuildParameterSegment]
  );

  const handleExplode = useCallback(() => {
    const trimmed = promptText.trim();
    if (!trimmed) {
      toast('Enter a prompt first.', { variant: 'info' });
      return;
    }
    const nextDocument = explodePromptText({
      prompt: trimmed,
      validationRules: runtimeValidationRules,
      learnedTemplates: runtimeLearnedTemplates,
      similarityThreshold: promptExploderClampNumber(learningDraft.similarityThreshold, 0.3, 0.95),
    });
    setManualBindings([]);
    setDocumentState(nextDocument);
    setSelectedSegmentId(nextDocument.segments[0]?.id ?? null);
    toast(`Exploded into ${nextDocument.segments.length} segment(s).`, { variant: 'success' });
  }, [
    learningDraft.similarityThreshold,
    promptText,
    runtimeLearnedTemplates,
    runtimeValidationRules,
    toast,
  ]);

  const handleApplyToImageStudio = useCallback(() => {
    if (!documentState) {
      toast('Explode the prompt before applying it.', { variant: 'info' });
      return;
    }
    const reassembled = reassemblePromptSegments(documentState.segments);
    savePromptExploderApplyPrompt(reassembled);
    toast('Reassembled prompt sent to Image Studio.', { variant: 'success' });
    router.push(returnTo);
  }, [documentState, returnTo, router, toast]);

  const handleReloadFromStudio = useCallback(() => {
    const nextPrompt = consumePromptExploderDraftPrompt();
    if (!nextPrompt) {
      toast('No draft prompt was received from Image Studio.', { variant: 'info' });
      return;
    }
    setPromptText(nextPrompt);
    toast('Loaded latest prompt draft from Image Studio.', { variant: 'success' });
  }, [toast]);

  // ── Memoized context values ────────────────────────────────────────────────

  const stateValue = useMemo<DocumentState>(
    () => ({
      promptText,
      documentState,
      selectedSegmentId,
      selectedSegment,
      manualBindings,
      selectedParamEntriesState,
      listParamEntriesState,
      listParamOptions,
      listParamEntryByPath,
      explosionMetrics,
      segmentOptions,
      segmentById,
    }),
    [
      promptText,
      documentState,
      selectedSegmentId,
      selectedSegment,
      manualBindings,
      selectedParamEntriesState,
      listParamEntriesState,
      listParamOptions,
      listParamEntryByPath,
      explosionMetrics,
      segmentOptions,
      segmentById,
    ]
  );

  const actionsValue = useMemo<DocumentActions>(
    () => ({
      setPromptText,
      setDocumentState,
      setSelectedSegmentId,
      setManualBindings,
      syncManualBindings,
      handleExplode,
      handleApplyToImageStudio,
      handleReloadFromStudio,
      replaceSegments,
      updateSegment,
      updateParameterValue,
      updateParameterSelector,
      updateParameterComment,
      updateParameterDescription,
    }),
    [
      syncManualBindings,
      handleExplode,
      handleApplyToImageStudio,
      handleReloadFromStudio,
      replaceSegments,
      updateSegment,
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

// ── Hook exports ─────────────────────────────────────────────────────────────

export { DocumentStateContext, DocumentActionsContext };
