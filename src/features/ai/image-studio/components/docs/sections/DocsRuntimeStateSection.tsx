'use client';

import React from 'react';
import { Card, MetadataItem } from '@/shared/ui';

export function DocsRuntimeStateSection({
  projectId,
  projectsQueryCount,
  slotsLength,
  selectedSlotName,
  workingSlotName,
  selectedFolder,
  previewMode,
  compositeAssetsLength,
  promptTextLength,
  promptIssueCount,
  paramsStateCount,
  paramSpecsCount,
  maskShapesLength,
  maskEligibleCount,
  runPending,
  runOutputsLength,
  generationHistoryLength,
  tool,
  activeMaskId,
  maskGenMode,
  maskGenLoading,
  maskInvert,
  maskFeather,
  brushRadius,
  maskThresholdSensitivity,
  maskEdgeSensitivity,
  projectSearch,
  virtualFoldersLength,
  persistedTreeFoldersLength,
  extractReviewOpen,
  extractDraftPromptLength,
  slotImageUrlDraftLength,
  slotBase64DraftLength,
  metricValue,
}: {
  projectId: string;
  projectsQueryCount: number;
  slotsLength: number;
  selectedSlotName: string;
  workingSlotName: string;
  selectedFolder: string;
  previewMode: string;
  compositeAssetsLength: number;
  promptTextLength: number;
  promptIssueCount: number;
  paramsStateCount: number;
  paramSpecsCount: number;
  maskShapesLength: number;
  maskEligibleCount: number;
  runPending: boolean;
  runOutputsLength: number;
  generationHistoryLength: number;
  tool: string;
  activeMaskId: string | null;
  maskGenMode: string;
  maskGenLoading: boolean;
  maskInvert: boolean;
  maskFeather: number;
  brushRadius: number;
  maskThresholdSensitivity: number;
  maskEdgeSensitivity: number;
  projectSearch: string;
  virtualFoldersLength: number;
  persistedTreeFoldersLength: number;
  extractReviewOpen: boolean;
  extractDraftPromptLength: number;
  slotImageUrlDraftLength: number;
  slotBase64DraftLength: number;
  metricValue: (value: string | number | boolean | null | undefined) => string;
}): React.JSX.Element {
  return (
    <Card variant='subtle' padding='lg' className='border-border/60 bg-card/40 space-y-3'>
      <h3 className='text-base font-semibold text-white'>Current Runtime State</h3>
      <div className='grid gap-2 sm:grid-cols-2 lg:grid-cols-4'>
        <MetadataItem
          label='Project'
          value={projectId || 'none'}
          hint={`${projectsQueryCount} total`}
        />
        <MetadataItem
          label='Slots'
          value={String(slotsLength)}
          hint={`selected: ${selectedSlotName}`}
        />
        <MetadataItem
          label='Working Slot'
          value={workingSlotName}
          hint={`folder: ${selectedFolder || 'root'}`}
        />
        <MetadataItem
          label='Preview Mode'
          value={previewMode}
          hint={`composite: ${compositeAssetsLength}`}
        />
        <MetadataItem
          label='Prompt Length'
          value={String(promptTextLength)}
          hint={`${promptIssueCount} validation issue(s)`}
        />
        <MetadataItem
          label='Params'
          value={String(paramsStateCount)}
          hint={`specs: ${paramSpecsCount}`}
        />
        <MetadataItem
          label='Mask Shapes'
          value={String(maskShapesLength)}
          hint={`${maskEligibleCount} eligible polygon/lasso`}
        />
        <MetadataItem
          label='Generation'
          value={runPending ? 'running' : 'idle'}
          hint={`${runOutputsLength} output(s), ${generationHistoryLength} history`}
        />
      </div>
      <div className='grid gap-2 sm:grid-cols-2 lg:grid-cols-4'>
        <MetadataItem
          label='Mask Tool'
          value={tool}
          hint={`active mask: ${activeMaskId ?? 'none'}`}
        />
        <MetadataItem
          label='Mask Mode'
          value={maskGenMode}
          hint={`loading: ${metricValue(maskGenLoading)}`}
        />
        <MetadataItem
          label='Mask Controls'
          value={`invert=${metricValue(maskInvert)}`}
          hint={`feather=${maskFeather}, brush=${brushRadius}`}
        />
        <MetadataItem
          label='Detection'
          value={`threshold=${maskThresholdSensitivity}`}
          hint={`edges=${maskEdgeSensitivity}`}
        />
      </div>
      <div className='grid gap-2 sm:grid-cols-2 lg:grid-cols-4'>
        <MetadataItem label='Project Search' value={projectSearch || '(empty)'} />
        <MetadataItem
          label='Virtual Folders'
          value={String(virtualFoldersLength)}
          hint={`persisted: ${persistedTreeFoldersLength}`}
        />
        <MetadataItem
          label='Extraction Review'
          value={metricValue(extractReviewOpen)}
          hint={`draft length: ${extractDraftPromptLength}`}
        />
        <MetadataItem
          label='Slot UI Drafts'
          value={`url=${slotImageUrlDraftLength}`}
          hint={`base64=${slotBase64DraftLength}`}
        />
      </div>
    </Card>
  );
}
