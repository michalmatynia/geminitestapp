'use client';

import { useCallback } from 'react';

import type { PromptExploderSegmentationRecord } from '@/shared/contracts/prompt-exploder';

import { buildPromptExploderSegmentationAnalysisContextJson } from '../../segmentation-library';

type SegmentationAnalysisContextJson = {
  buildSegmentationAnalysisContextJsonForRecord: (recordId: string) => string | null;
  buildSegmentationAnalysisContextJsonForAll: () => string;
};

export const useSegmentationAnalysisContextJson = (
  segmentationRecords: PromptExploderSegmentationRecord[]
): SegmentationAnalysisContextJson => {
  const buildSegmentationAnalysisContextJsonForRecord = useCallback(
    (recordId: string): string | null => {
      const record = segmentationRecords.find((candidate) => candidate.id === recordId);
      if (!record) return null;
      return buildPromptExploderSegmentationAnalysisContextJson({
        records: [record],
      });
    },
    [segmentationRecords]
  );

  const buildSegmentationAnalysisContextJsonForAll = useCallback(
    (): string =>
      buildPromptExploderSegmentationAnalysisContextJson({
        records: segmentationRecords,
      }),
    [segmentationRecords]
  );

  return {
    buildSegmentationAnalysisContextJsonForRecord,
    buildSegmentationAnalysisContextJsonForAll,
  };
};
