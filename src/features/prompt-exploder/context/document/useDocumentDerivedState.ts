'use client';

import { useMemo } from 'react';

import type {
  PromptExploderParamEntriesState,
  PromptExploderParamEntry,
} from '@/shared/contracts/prompt-exploder';

import { promptExploderClampNumber } from '../../helpers/formatting';
import { buildPromptExploderParamEntries } from '../../params-editor';
import type { PromptExploderSegment } from '../../types';
import type { DocumentState } from '../DocumentContext';

type UseDocumentDerivedStateArgs = {
  documentState: DocumentState['documentState'];
  selectedSegmentId: DocumentState['selectedSegmentId'];
  benchmarkLowConfidenceThreshold: number | null | undefined;
};

export const useDocumentDerivedState = ({
  documentState,
  selectedSegmentId,
  benchmarkLowConfidenceThreshold,
}: UseDocumentDerivedStateArgs) => {
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
      benchmarkLowConfidenceThreshold ?? 0.55,
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
  }, [benchmarkLowConfidenceThreshold, documentState]);

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

  return {
    selectedSegment,
    selectedParamEntriesState,
    listParamOptions,
    listParamEntryByPath,
    explosionMetrics,
    segmentOptions,
    segmentById,
  };
};
