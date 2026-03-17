import React from 'react';
import { act, render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  LibraryProvider,
  type LibraryActions,
  type LibraryState,
  useLibraryActions,
  useLibraryState,
} from '@/features/prompt-exploder/context/LibraryContext';
import {
  buildPromptExploderSegmentationRecord,
  PROMPT_EXPLODER_SEGMENTATION_LIBRARY_KEY,
} from '@/features/prompt-exploder/segmentation-library';
import {
  promptExploderDocumentSchema,
  type PromptExploderDocument,
  type PromptExploderSegment,
} from '@/shared/contracts/prompt-exploder';
import { serializeSetting } from '@/shared/utils/settings-json';

const mocks = vi.hoisted(() => ({
  toast: vi.fn(),
  updateSettingMutateAsync: vi.fn(),
  settingsMap: new Map<string, string>(),
  promptText: 'Prompt before segmentation',
  documentState: null as PromptExploderDocument | null,
  returnTarget: 'image-studio' as 'image-studio' | 'case-resolver',
  activeValidationScope: 'prompt_exploder',
  activeValidationRuleStack: 'prompt-exploder' as string,
  setPromptText: vi.fn(),
  setDocumentState: vi.fn(),
  setSelectedSegmentId: vi.fn(),
  setManualBindings: vi.fn(),
  setBenchmarkReport: vi.fn(),
  setDismissedBenchmarkSuggestionIds: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock('@/shared/ui', async () => {
  const actual = await vi.importActual<typeof import('@/shared/ui')>('@/shared/ui');
  return {
    ...actual,
    useToast: () => ({
      toast: mocks.toast,
    }),
  };
});

vi.mock('@/features/prompt-exploder/context/SettingsContext', () => ({
  useSettingsState: () => ({
    settingsMap: mocks.settingsMap,
    activeValidationScope: mocks.activeValidationScope,
    activeValidationRuleStack: mocks.activeValidationRuleStack,
  }),
  useSettingsActions: () => ({
    updateSetting: {
      mutateAsync: mocks.updateSettingMutateAsync,
    },
  }),
}));

vi.mock('@/features/prompt-exploder/context/DocumentContext', () => ({
  useDocumentState: () => ({
    promptText: mocks.promptText,
    documentState: mocks.documentState,
    returnTarget: mocks.returnTarget,
  }),
  useDocumentActions: () => ({
    setPromptText: mocks.setPromptText,
    setDocumentState: mocks.setDocumentState,
    setSelectedSegmentId: mocks.setSelectedSegmentId,
    setManualBindings: mocks.setManualBindings,
  }),
}));

vi.mock('@/features/prompt-exploder/context/BenchmarkContext', () => ({
  useBenchmarkActions: () => ({
    setBenchmarkReport: mocks.setBenchmarkReport,
    setDismissedBenchmarkSuggestionIds: mocks.setDismissedBenchmarkSuggestionIds,
  }),
}));

const buildSegment = (id: string): PromptExploderSegment => ({
  id,
  type: 'assigned_text',
  title: `Segment ${id}`,
  includeInOutput: true,
  text: `Text ${id}`,
  raw: `Text ${id}`,
  code: null,
  condition: null,
  items: [],
  listItems: [],
  subsections: [],
  paramsText: '',
  paramsObject: null,
  paramUiControls: {},
  paramComments: {},
  paramDescriptions: {},
  matchedPatternIds: [],
  matchedPatternLabels: [],
  matchedSequenceLabels: [],
  confidence: 0.7,
  validationResults: [],
  segments: [],
});

const buildDocument = (): PromptExploderDocument =>
  promptExploderDocumentSchema.parse({
    id: 'doc_ctx',
    version: 1,
    sourcePrompt: mocks.promptText,
    reassembledPrompt: 'Reassembled output',
    segments: [buildSegment('a')],
  });

let currentActions: LibraryActions | null = null;
let currentState: LibraryState | null = null;

function Harness(): React.JSX.Element {
  currentActions = useLibraryActions();
  currentState = useLibraryState();
  return <div data-testid='library-harness' />;
}

describe('LibraryContext segmentation actions', () => {
  beforeEach(() => {
    currentActions = null;
    currentState = null;
    mocks.toast.mockReset();
    mocks.updateSettingMutateAsync.mockReset();
    mocks.settingsMap = new Map<string, string>();
    mocks.promptText = 'Prompt before segmentation';
    mocks.documentState = buildDocument();
    mocks.returnTarget = 'image-studio';
    mocks.activeValidationScope = 'prompt_exploder';
    mocks.activeValidationRuleStack = 'prompt-exploder';
    mocks.setPromptText.mockReset();
    mocks.setDocumentState.mockReset();
    mocks.setSelectedSegmentId.mockReset();
    mocks.setManualBindings.mockReset();
    mocks.setBenchmarkReport.mockReset();
    mocks.setDismissedBenchmarkSuggestionIds.mockReset();
    mocks.updateSettingMutateAsync.mockResolvedValue({});
  });

  it('captures segmentation context and persists new store key', async () => {
    render(
      <LibraryProvider>
        <Harness />
      </LibraryProvider>
    );

    let result;
    await act(async () => {
      result = await currentActions?.captureSegmentationRecordOnApply();
    });

    expect(result).toMatchObject({ captured: true, persisted: true });
    expect(mocks.updateSettingMutateAsync).toHaveBeenCalledTimes(1);
    const payload = mocks.updateSettingMutateAsync.mock.calls[0]?.[0] as {
      key: string;
      value: string;
    };
    expect(payload.key).toBe(PROMPT_EXPLODER_SEGMENTATION_LIBRARY_KEY);
    const parsed = JSON.parse(payload.value) as {
      version: number;
      records: Array<{ sourcePrompt: string; segmentCount: number }>;
    };
    expect(parsed.version).toBe(1);
    expect(parsed.records).toHaveLength(1);
    expect(parsed.records[0]?.sourcePrompt).toBe('Prompt before segmentation');
    expect(parsed.records[0]?.segmentCount).toBe(1);
  });

  it('captures segmentation context with canonical custom validation stack id', async () => {
    mocks.activeValidationRuleStack = 'stack_custom';

    render(
      <LibraryProvider>
        <Harness />
      </LibraryProvider>
    );

    await act(async () => {
      await currentActions?.captureSegmentationRecordOnApply();
    });

    const payload = mocks.updateSettingMutateAsync.mock.calls[0]?.[0] as {
      value: string;
    };
    const parsed = JSON.parse(payload.value) as {
      records: Array<{ validationRuleStack: string }>;
    };

    expect(parsed.records[0]?.validationRuleStack).toBe('stack_custom');
  });

  it('skips capture when no document exists', async () => {
    mocks.documentState = null;

    render(
      <LibraryProvider>
        <Harness />
      </LibraryProvider>
    );

    let result;
    await act(async () => {
      result = await currentActions?.captureSegmentationRecordOnApply();
    });

    expect(result).toMatchObject({ captured: false, persisted: false, reason: 'missing_document' });
    expect(mocks.updateSettingMutateAsync).not.toHaveBeenCalled();
  });

  it('loads and deletes segmentation records', async () => {
    const seededRecord = buildPromptExploderSegmentationRecord({
      promptText: 'Seeded prompt',
      documentState: buildDocument(),
      now: '2026-03-01T09:30:00.000Z',
      returnTarget: 'case-resolver',
      validationScope: 'case_resolver_prompt_exploder',
      validationRuleStack: 'case-resolver-prompt-exploder',
      createRecordId: () => 'segctx_seeded',
    });
    mocks.settingsMap = new Map<string, string>([
      [
        PROMPT_EXPLODER_SEGMENTATION_LIBRARY_KEY,
        serializeSetting({
          version: 1,
          records: [seededRecord],
        }),
      ],
    ]);

    render(
      <LibraryProvider>
        <Harness />
      </LibraryProvider>
    );

    expect(currentState?.segmentationRecords).toHaveLength(1);

    act(() => {
      currentActions?.handleLoadSegmentationRecordIntoWorkspace('segctx_seeded');
    });

    expect(mocks.setPromptText).toHaveBeenCalledWith('Seeded prompt');
    expect(mocks.setDocumentState).toHaveBeenCalled();
    expect(mocks.setSelectedSegmentId).toHaveBeenCalled();

    await act(async () => {
      await currentActions?.handleDeleteSegmentationRecord('segctx_seeded');
    });

    expect(mocks.updateSettingMutateAsync).toHaveBeenCalled();
    const payload = mocks.updateSettingMutateAsync.mock.calls.at(-1)?.[0] as {
      key: string;
      value: string;
    };
    expect(payload.key).toBe(PROMPT_EXPLODER_SEGMENTATION_LIBRARY_KEY);
    const parsed = JSON.parse(payload.value) as { records: unknown[] };
    expect(parsed.records).toEqual([]);
  });

  it('does not throw hard failure when capture persistence fails', async () => {
    mocks.updateSettingMutateAsync.mockRejectedValueOnce(new Error('persist failed'));

    render(
      <LibraryProvider>
        <Harness />
      </LibraryProvider>
    );

    let result;
    await act(async () => {
      result = await currentActions?.captureSegmentationRecordOnApply();
    });

    expect(result).toMatchObject({
      captured: true,
      persisted: false,
      reason: 'persist_failed',
    });
    expect(mocks.toast).toHaveBeenCalledWith(
      expect.stringContaining('Failed to capture segmentation context'),
      expect.objectContaining({ variant: 'warning' })
    );
  });
});
