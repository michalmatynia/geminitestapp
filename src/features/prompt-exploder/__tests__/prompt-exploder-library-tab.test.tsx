import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PromptExploderLibraryTab } from '@/features/prompt-exploder/components/PromptExploderLibraryTab';
import {
  promptExploderDocumentSchema,
  type PromptExploderDocument,
  type PromptExploderSegment,
} from '@/shared/contracts/prompt-exploder';

const buildSegment = (id: string): PromptExploderSegment => ({
  id,
  type: 'sequence',
  title: `Sequence ${id}`,
  includeInOutput: true,
  text: `Text ${id}`,
  raw: `Text ${id}`,
  code: null,
  condition: null,
  items: [],
  listItems: [],
  subsections: [
    {
      id: `sub_${id}`,
      title: 'Preparation',
      code: 'A',
      condition: null,
      guidance: 'Do prep',
      items: [],
    },
  ],
  paramsText: '',
  paramsObject: null,
  paramUiControls: {},
  paramComments: {},
  paramDescriptions: {},
  matchedPatternIds: ['segment.boundary.pipeline'],
  matchedPatternLabels: ['Pipeline'],
  matchedSequenceLabels: ['Pipeline block'],
  confidence: 0.85,
  validationResults: [],
  segments: [],
});

const buildDocument = (): PromptExploderDocument =>
  promptExploderDocumentSchema.parse({
    id: 'doc_library',
    version: 1,
    sourcePrompt: 'Before segmentation body',
    reassembledPrompt: 'After segmentation body',
    segments: [buildSegment('1')],
  });

const createDefaultState = () => {
  const record = {
    id: 'segctx_1',
    sourcePrompt: 'Before segmentation body',
    sourcePromptLength: 24,
    reassembledPrompt: 'After segmentation body',
    reassembledPromptLength: 23,
    documentSnapshot: buildDocument(),
    segmentCount: 1,
    returnTarget: 'image-studio' as const,
    validationScope: 'prompt_exploder',
    validationRuleStack: 'prompt-exploder',
    capturedAt: '2026-03-01T12:00:00.000Z',
    createdAt: '2026-03-01T12:00:00.000Z',
    updatedAt: '2026-03-01T12:00:00.000Z',
  };

  return {
    selectedLibraryItemId: null,
    libraryNameDraft: '',
    promptLibraryItems: [],
    selectedLibraryItem: null,
    selectedSegmentationRecordId: record.id,
    segmentationRecords: [record],
    selectedSegmentationRecord: record,
  };
};

const createDefaultActions = () => ({
  setSelectedLibraryItemId: vi.fn(),
  setLibraryNameDraft: vi.fn(),
  setSelectedSegmentationRecordId: vi.fn(),
  handleNewLibraryEntry: vi.fn(),
  handleSaveLibraryItem: vi.fn(),
  handleLoadLibraryItem: vi.fn(),
  handleDeleteLibraryItem: vi.fn(),
  captureSegmentationRecordOnApply: vi.fn(),
  handleLoadSegmentationRecordIntoWorkspace: vi.fn(),
  handleDeleteSegmentationRecord: vi.fn(),
  buildSegmentationAnalysisContextJsonForRecord: vi.fn(() => '{"record":"selected"}'),
  buildSegmentationAnalysisContextJsonForAll: vi.fn(() => '{"records":"all"}'),
});

const mocks = vi.hoisted(() => ({
  state: {} as ReturnType<typeof createDefaultState>,
  actions: {} as ReturnType<typeof createDefaultActions>,
}));

vi.mock('@/features/prompt-exploder/context/hooks/useLibrary', () => ({
  useLibraryState: () => mocks.state,
  useLibraryActions: () => mocks.actions,
}));

describe('PromptExploderLibraryTab', () => {
  beforeEach(() => {
    mocks.state = createDefaultState();
    mocks.actions = createDefaultActions();
  });

  it('renders selected record with before/after content and section structure', () => {
    render(<PromptExploderLibraryTab />);

    expect(screen.getByText('Segmentation Context Library')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Before segmentation body')).toBeInTheDocument();
    expect(screen.getByDisplayValue('After segmentation body')).toBeInTheDocument();
    expect(screen.getByText('Section and Segment Structure')).toBeInTheDocument();
    expect(screen.getByText('Sequence 1')).toBeInTheDocument();
    expect(screen.getByText('Pipeline')).toBeInTheDocument();
  });

  it('renders empty state when no segmentation records exist', () => {
    mocks.state.segmentationRecords = [];
    mocks.state.selectedSegmentationRecordId = null;
    mocks.state.selectedSegmentationRecord = null;

    render(<PromptExploderLibraryTab />);

    expect(
      screen.getByText('No segmentation context records captured yet.')
    ).toBeInTheDocument();
    expect(screen.getByText('No segmentation context selected')).toBeInTheDocument();
  });

  it('invokes load action for selected record', () => {
    render(<PromptExploderLibraryTab />);

    fireEvent.click(screen.getByRole('button', { name: 'Load Into Workspace' }));

    expect(mocks.actions.handleLoadSegmentationRecordIntoWorkspace).toHaveBeenCalledWith(
      'segctx_1'
    );
  });
});
